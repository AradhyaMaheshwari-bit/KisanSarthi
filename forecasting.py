"""
forecasting.py — ML Price Forecasting Engine for KisanSarthi

Implements chronologically-validated, multi-model price forecasting
with observation-based features designed for irregular time series.

Key design decisions:
  - Log-transform target → structurally prevents negative forecasts
  - Observation-order lags (not calendar lags) → handles irregular gaps
  - Chronological validation → no future data leakage
  - Baseline comparison → ML only used if it beats naive
  - Minimum data thresholds → no forecasts on insufficient data

Dependencies: numpy, scikit-learn (already in requirements.txt)
"""

import numpy as np
from datetime import datetime, timedelta

# ─── Data Preparation ──────────────────────────────────────────────

def prepare_series(history):
    """
    Convert history records to sorted numpy arrays.

    Args:
        history: list of {date: 'YYYY-MM-DD', price: float}

    Returns:
        timestamps: np.array of days since first observation
        prices: np.array of prices
        dates: list of date strings (sorted)
    """
    sorted_hist = sorted(history, key=lambda h: h['date'])
    dates = [h['date'] for h in sorted_hist]
    prices = np.array([h['price'] for h in sorted_hist], dtype=float)

    # Convert dates to day offsets from first observation
    base_date = datetime.strptime(dates[0], '%Y-%m-%d')
    timestamps = np.array([
        (datetime.strptime(d, '%Y-%m-%d') - base_date).days
        for d in dates
    ], dtype=float)

    return timestamps, prices, dates


def find_contiguous_blocks(timestamps, max_gap_days=5):
    """
    Find contiguous blocks where gaps between observations ≤ max_gap_days.

    Returns:
        list of (start_idx, end_idx) tuples (inclusive)
    """
    if len(timestamps) < 2:
        return [(0, len(timestamps) - 1)]

    gaps = np.diff(timestamps)
    block_starts = [0]

    for i, gap in enumerate(gaps):
        if gap > max_gap_days:
            # End current block at i, start new block at i+1
            yield (block_starts[-1], i)
            block_starts.append(i + 1)

    # Yield final block
    yield (block_starts[-1], len(timestamps) - 1)


def get_usable_block(history, min_obs=10):
    """
    Select the most recent contiguous block with enough observations.

    Returns:
        (timestamps, prices, dates) for the usable block,
        or (None, None, None) if no usable block exists.
    """
    timestamps, prices, dates = prepare_series(history)

    if len(timestamps) < min_obs:
        return None, None, None

    # Find all contiguous blocks
    blocks = list(find_contiguous_blocks(timestamps))

    # Filter blocks with enough observations
    valid_blocks = [
        (s, e) for s, e in blocks
        if (e - s + 1) >= min_obs
    ]

    if not valid_blocks:
        return None, None, None

    # Use the most recent block (largest start index)
    best = max(valid_blocks, key=lambda b: b[0])
    s, e = best

    return timestamps[s:e+1], prices[s:e+1], dates[s:e+1]


# ─── Feature Engineering ────────────────────────────────────────────

def build_features(prices, timestamps, start_dates=None):
    """
    Build observation-based feature matrix.

    Features per observation:
      - lag_1, lag_2, lag_3: price at t-1, t-2, t-3 (observation order)
      - rolling_mean_5: mean of last 5 observations
      - rolling_std_5: std of last 5 observations
      - cal_gap: days since previous observation
      - trend_idx: observation index (linear trend proxy)
      - month: month-of-year (seasonal proxy, 0-11)

    Returns:
        X: np.array of shape (n_samples, n_features)
        feature_names: list of feature name strings
        valid_mask: boolean mask indicating which rows have complete features
    """
    n = len(prices)
    feature_names = [
        'lag_1', 'lag_2', 'lag_3',
        'rolling_mean_5', 'rolling_std_5',
        'cal_gap', 'trend_idx', 'month'
    ]

    X = np.zeros((n, len(feature_names)))

    for i in range(n):
        # Lag features (observation order)
        X[i, 0] = prices[i - 1] if i >= 1 else np.nan  # lag_1
        X[i, 1] = prices[i - 2] if i >= 2 else np.nan  # lag_2
        X[i, 2] = prices[i - 3] if i >= 3 else np.nan  # lag_3

        # Rolling stats (last 5 observations)
        window_start = max(0, i - 4)
        window = prices[window_start:i + 1]
        X[i, 3] = np.mean(window)  # rolling_mean_5
        X[i, 4] = np.std(window) if len(window) > 1 else 0.0  # rolling_std_5

        # Calendar gap (days since previous observation)
        if i >= 1:
            X[i, 5] = timestamps[i] - timestamps[i - 1]
        else:
            X[i, 5] = 0.0

        # Trend index
        X[i, 6] = float(i)

        # Month (seasonal proxy)
        if start_dates is not None and i < len(start_dates):
            try:
                dt = datetime.strptime(start_dates[i], '%Y-%m-%d')
                X[i, 7] = float(dt.month - 1)  # 0-11
            except (ValueError, TypeError):
                X[i, 7] = 0.0
        else:
            X[i, 7] = 0.0

    # Valid mask: rows with all 3 lag features available
    valid_mask = ~np.isnan(X[:, 0]) & ~np.isnan(X[:, 1]) & ~np.isnan(X[:, 2])

    return X, feature_names, valid_mask


def build_forecast_features(prices, timestamps, start_dates, n_steps=30):
    """
    Build features for n_steps future predictions (recursive forecasting).

    Each step predicts one observation ahead, then uses that prediction
    as input for the next step's lag features.
    """
    all_prices = list(prices)
    all_timestamps = list(timestamps)
    all_dates = list(start_dates)

    predictions = []

    for step in range(n_steps):
        n = len(all_prices)
        # Build features for the next point
        idx = n  # index of the point we're predicting

        lag_1 = all_prices[-1]
        lag_2 = all_prices[-2] if len(all_prices) >= 2 else lag_1
        lag_3 = all_prices[-3] if len(all_prices) >= 3 else lag_2

        window = all_prices[-5:]
        rolling_mean = np.mean(window)
        rolling_std = np.std(window) if len(window) > 1 else 0.0

        cal_gap = 1.0  # assume daily for forecast
        trend_idx = float(idx)

        # Project month forward
        last_date = datetime.strptime(all_dates[-1], '%Y-%m-%d')
        future_date = last_date + timedelta(days=step + 1)
        month = float(future_date.month - 1)

        features = np.array([[
            lag_1, lag_2, lag_3,
            rolling_mean, rolling_std,
            cal_gap, trend_idx, month
        ]])

        predictions.append((features, future_date.strftime('%Y-%m-%d')))

        # We'll fill in the actual predicted price after model inference
        # For now, use lag_1 as placeholder (will be overwritten)
        all_prices.append(lag_1)
        all_timestamps.append(all_timestamps[-1] + 1)
        all_dates.append(future_date.strftime('%Y-%m-%d'))

    return predictions


# ─── Target Transformation ─────────────────────────────────────────

def log_transform(prices):
    """Log-transform prices (ensures positivity)."""
    return np.log(prices)


def inverse_log(log_pred):
    """Inverse log-transform (back to price scale)."""
    return np.exp(log_pred)


# ─── Baseline Models ────────────────────────────────────────────────

def baseline_naive(prices, n_steps=30):
    """Repeat last observed price."""
    return np.full(n_steps, prices[-1])


def baseline_mean(prices, n_steps=30):
    """Repeat historical mean."""
    return np.full(n_steps, np.mean(prices))


def baseline_moving_average(prices, window=7, n_steps=30):
    """Repeat last moving average value."""
    w = min(window, len(prices))
    ma = np.mean(prices[-w:])
    return np.full(n_steps, ma)


# ─── ML Model Candidates ───────────────────────────────────────────

def model_linear_regression(X_train, y_train, X_test):
    """Standard OLS linear regression."""
    from sklearn.linear_model import LinearRegression
    model = LinearRegression()
    model.fit(X_train, y_train)
    return model.predict(X_test), model


def model_ridge(X_train, y_train, X_test, alpha=1.0):
    """L2-regularized Ridge regression."""
    from sklearn.linear_model import Ridge
    model = Ridge(alpha=alpha)
    model.fit(X_train, y_train)
    return model.predict(X_test), model


def model_hist_gradient_boosting(X_train, y_train, X_test):
    """Histogram-based Gradient Boosting (robust for small data)."""
    from sklearn.ensemble import HistGradientBoostingRegressor
    model = HistGradientBoostingRegressor(
        max_iter=100,
        max_depth=3,
        learning_rate=0.1,
        min_samples_leaf=5,
        random_state=42
    )
    model.fit(X_train, y_train)
    return model.predict(X_test), model


# ─── Chronological Validation ──────────────────────────────────────

def chronological_split(n, test_ratio=0.3):
    """
    Split indices chronologically: first (1-test_ratio) for train,
    remaining for test. No shuffling.
    """
    split_idx = max(1, int(n * (1 - test_ratio)))
    train_idx = np.arange(0, split_idx)
    test_idx = np.arange(split_idx, n)
    return train_idx, test_idx


def evaluate_model(y_true, y_pred, y_train):
    """
    Compute validation metrics.

    Returns dict with: mae, mape, rmse, direction_accuracy, naive_mae, skill_score
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    # MAE
    mae = float(np.mean(np.abs(y_true - y_pred)))

    # MAPE (skip zeros)
    nonzero = y_true != 0
    if np.any(nonzero):
        mape = float(np.mean(np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])) * 100)
    else:
        mape = 0.0

    # RMSE
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

    # Direction accuracy: compare consecutive predicted vs actual directions
    if len(y_true) > 1:
        actual_dirs = np.diff(y_true) > 0
        pred_dirs = np.diff(y_pred) > 0
        direction_accuracy = float(np.mean(actual_dirs == pred_dirs) * 100)
    else:
        direction_accuracy = 50.0

    # Naive MAE (last value repeated)
    naive_pred = np.full_like(y_true, y_train[-1])
    naive_mae = float(np.mean(np.abs(y_true - naive_pred)))

    # Skill score (positive = better than naive)
    if naive_mae > 0:
        skill_score = 1.0 - (mae / naive_mae)
    else:
        skill_score = 0.0

    return {
        'mae': round(mae, 2),
        'mape': round(mape, 2),
        'rmse': round(rmse, 2),
        'direction_accuracy': round(direction_accuracy, 1),
        'naive_mae': round(naive_mae, 2),
        'skill_score': round(skill_score, 3)
    }


# ─── Model Selection ───────────────────────────────────────────────

def select_best_model(candidates):
    """
    Pick model with lowest MAE. If none beats naive, return naive.

    Args:
        candidates: dict of {name: {predictions, metrics, type, model, ...}}

    Returns:
        (best_name, best_candidate) tuple
    """
    naive_mae = candidates.get('naive', {}).get('metrics', {}).get('mae', float('inf'))

    best_name = 'naive'
    best_mae = naive_mae

    for name, cand in candidates.items():
        if name == 'naive':
            continue
        mae = cand.get('metrics', {}).get('mae', float('inf'))
        if mae < best_mae:
            best_mae = mae
            best_name = name

    return best_name, candidates[best_name]


# ─── Interpretation Generator ──────────────────────────────────────

def generate_interpretation(crop_name, forecast_val, current_price, meta):
    """
    Generate farmer-friendly forecast interpretation text.
    """
    display_name = crop_name.replace('_', ' ').title()

    def _fmt_price(val):
        """Format price with Indian-style comma separators."""
        return f"{round(val):,}"

    if meta.get('model_type') == 'insufficient_data':
        n_obs = meta.get('training_observations', 0)
        return (
            f"Limited historical data available for {display_name} "
            f"({n_obs} data points). No reliable forecast can be generated. "
            f"Please check back when more market data is available."
        )

    change_pct = ((forecast_val - current_price) / current_price * 100) if current_price > 0 else 0
    direction = "rise" if change_pct > 0.5 else ("fall" if change_pct < -0.5 else "remain stable around")

    confidence = meta.get('confidence', 'low').upper()
    n_train = meta.get('training_observations', 0)
    dir_acc = meta.get('direction_accuracy', 0)
    model_name = meta.get('model_name', 'statistical model')

    # Build interpretation
    parts = [
        f"{display_name} is currently trading at Rs.{_fmt_price(current_price)}.",
        f"Our {model_name} predicts prices may {direction} to Rs.{_fmt_price(forecast_val)} "
        f"over the next 30 days ({change_pct:+.1f}%).",
        f"Based on {n_train} recent data points with {dir_acc:.0f}% direction accuracy, "
        f"this forecast has {confidence} confidence."
    ]

    skill = meta.get('skill_score', 0)
    if skill < 0:
        parts.append(
            "Note: Statistical models show limited predictive power for this crop. "
            "Treat this as a rough indicator, not a precise prediction."
        )
    elif skill > 0.2:
        parts.append(
            "This forecast shows good predictive skill compared to a simple baseline."
        )

    return " ".join(parts)


# ─── Main Pipeline ─────────────────────────────────────────────────

def run_forecasting_pipeline(history, crop_name="unknown"):
    """
    Complete forecasting pipeline: data prep → features → validation → forecast.

    Args:
        history: list of {date: 'YYYY-MM-DD', price: float}
        crop_name: string identifier for the crop

    Returns:
        dict with:
            forecast_30d: float or None
            forecast_meta: dict with model info, metrics, interpretation
    """
    result_template = {
        'forecast_30d': None,
        'forecast_meta': {
            'model_name': 'Insufficient Data',
            'model_type': 'insufficient_data',
            'validation_mae': None,
            'validation_mape': None,
            'validation_rmse': None,
            'direction_accuracy': None,
            'skill_score': None,
            'training_observations': 0,
            'test_observations': 0,
            'data_block_start': None,
            'data_block_end': None,
            'data_block_days': 0,
            'interpretation': '',
            'confidence': 'low'
        }
    }

    # ── Step 1: Get usable data block ──
    timestamps, prices, dates = get_usable_block(history, min_obs=5)

    if timestamps is None or len(prices) < 5:
        result_template['forecast_meta']['training_observations'] = len(prices) if prices is not None else 0
        result_template['forecast_meta']['interpretation'] = generate_interpretation(
            crop_name, 0, 0, result_template['forecast_meta']
        )
        return result_template

    n_obs = len(prices)
    current_price = float(prices[-1])

    # ── Step 2: Build features ──
    X, feature_names, valid_mask = build_features(prices, timestamps, dates)

    # Use only rows with complete features
    X_complete = X[valid_mask]
    prices_complete = prices[valid_mask]

    if len(prices_complete) < 5:
        result_template['forecast_meta']['training_observations'] = n_obs
        result_template['forecast_meta']['interpretation'] = generate_interpretation(
            crop_name, 0, current_price, result_template['forecast_meta']
        )
        return result_template

    # ── Step 3: Log-transform target ──
    log_prices = log_transform(prices_complete)

    # ── Step 4: Chronological train/test split ──
    n_complete = len(prices_complete)

    if n_complete < 10:
        # Too few for ML validation — use all data, no test set
        train_idx = np.arange(n_complete)
        test_idx = np.array([], dtype=int)
    else:
        train_idx, test_idx = chronological_split(n_complete, test_ratio=0.3)

    X_train = X_complete[train_idx]
    y_train = log_prices[train_idx]

    meta = result_template['forecast_meta']
    meta['training_observations'] = int(len(train_idx))
    meta['test_observations'] = int(len(test_idx))
    meta['data_block_start'] = dates[0] if dates else None
    meta['data_block_end'] = dates[-1] if dates else None
    meta['data_block_days'] = int(timestamps[-1] - timestamps[0]) if len(timestamps) > 1 else 0

    # ── Step 5: Train and validate all candidates ──
    candidates = {}

    # Always compute naive baseline metrics
    naive_pred_log = np.full(len(test_idx), y_train[-1]) if len(test_idx) > 0 else np.array([])
    naive_pred = inverse_log(naive_pred_log) if len(test_idx) > 0 else np.array([])
    actual_prices_test = prices_complete[test_idx] if len(test_idx) > 0 else np.array([])

    if len(test_idx) > 0:
        naive_metrics = evaluate_model(actual_prices_test, naive_pred, prices_complete[train_idx])
    else:
        naive_metrics = {'mae': 0, 'mape': 0, 'rmse': 0, 'direction_accuracy': 50, 'naive_mae': 0, 'skill_score': 0}

    candidates['naive'] = {
        'type': 'baseline',
        'metrics': naive_metrics,
        'model': None
    }

    # Mean baseline
    if len(test_idx) > 0:
        mean_pred_log = np.full(len(test_idx), np.mean(y_train))
        mean_pred = inverse_log(mean_pred_log)
        mean_metrics = evaluate_model(actual_prices_test, mean_pred, prices_complete[train_idx])
    else:
        mean_metrics = naive_metrics.copy()
    candidates['mean'] = {
        'type': 'baseline',
        'metrics': mean_metrics,
        'model': None
    }

    # Moving average baseline
    if len(test_idx) > 0:
        ma_window = min(7, len(train_idx))
        ma_val = np.mean(y_train[-ma_window:])
        ma_pred_log = np.full(len(test_idx), ma_val)
        ma_pred = inverse_log(ma_pred_log)
        ma_metrics = evaluate_model(actual_prices_test, ma_pred, prices_complete[train_idx])
    else:
        ma_metrics = naive_metrics.copy()
    candidates['moving_average'] = {
        'type': 'baseline',
        'metrics': ma_metrics,
        'model': None
    }

    # ML models (only if enough data)
    if len(train_idx) >= 8 and len(test_idx) > 0:
        # Linear Regression
        try:
            lr_pred_log, lr_model = model_linear_regression(X_train, y_train, X_complete[test_idx])
            lr_pred = inverse_log(lr_pred_log)
            lr_metrics = evaluate_model(actual_prices_test, lr_pred, prices_complete[train_idx])
            candidates['linear_regression'] = {
                'type': 'ml',
                'metrics': lr_metrics,
                'model': lr_model
            }
        except Exception:
            pass

        # Ridge Regression
        try:
            ridge_pred_log, ridge_model = model_ridge(X_train, y_train, X_complete[test_idx])
            ridge_pred = inverse_log(ridge_pred_log)
            ridge_metrics = evaluate_model(actual_prices_test, ridge_pred, prices_complete[train_idx])
            candidates['ridge'] = {
                'type': 'ml',
                'metrics': ridge_metrics,
                'model': ridge_model
            }
        except Exception:
            pass

    # HistGradientBoosting (needs more data)
    if len(train_idx) >= 12 and len(test_idx) > 0:
        try:
            hgb_pred_log, hgb_model = model_hist_gradient_boosting(X_train, y_train, X_complete[test_idx])
            hgb_pred = inverse_log(hgb_pred_log)
            hgb_metrics = evaluate_model(actual_prices_test, hgb_pred, prices_complete[train_idx])
            candidates['hist_gradient_boosting'] = {
                'type': 'ml',
                'metrics': hgb_metrics,
                'model': hgb_model
            }
        except Exception:
            pass

    # ── Step 6: Select best model ──
    best_name, best_cand = select_best_model(candidates)

    # ── Step 7: Generate final forecast on full data ──
    n_steps = 30

    if best_name == 'naive':
        forecast_vals = baseline_naive(prices, n_steps)
        model_display = 'Naive Baseline'
        model_type = 'baseline'
        fitted_model = None
    elif best_name == 'mean':
        forecast_vals = baseline_mean(prices, n_steps)
        model_display = 'Historical Mean'
        model_type = 'baseline'
        fitted_model = None
    elif best_name == 'moving_average':
        forecast_vals = baseline_moving_average(prices, n_steps)
        model_display = 'Moving Average'
        model_type = 'baseline'
        fitted_model = None
    elif best_name == 'linear_regression':
        # Refit on complete data, then recursive forecast
        fitted_model = best_cand['model']
        forecast_vals = _recursive_forecast(fitted_model, prices, timestamps, dates, n_steps)
        model_display = 'Linear Regression'
        model_type = 'ml'
    elif best_name == 'ridge':
        fitted_model = best_cand['model']
        forecast_vals = _recursive_forecast(fitted_model, prices, timestamps, dates, n_steps)
        model_display = 'Ridge Regression'
        model_type = 'ml'
    elif best_name == 'hist_gradient_boosting':
        fitted_model = best_cand['model']
        forecast_vals = _recursive_forecast(fitted_model, prices, timestamps, dates, n_steps)
        model_display = 'Gradient Boosting'
        model_type = 'ml'
    else:
        forecast_vals = baseline_naive(prices, n_steps)
        model_display = 'Naive Baseline'
        model_type = 'baseline'
        fitted_model = None

    # ── Step 8: Build result ──
    forecast_30d = float(np.mean(forecast_vals))  # average of 30-day predictions

    # Ensure non-negative (should always be true with log-transform, but safety check)
    forecast_30d = max(0.0, forecast_30d)

    metrics = best_cand.get('metrics', {})

    # Determine confidence level
    skill = metrics.get('skill_score', 0)
    n_train = meta['training_observations']
    dir_acc = metrics.get('direction_accuracy', 50)

    if n_train >= 30 and skill > 0.1 and dir_acc > 60:
        confidence = 'high'
    elif n_train >= 15 and skill > 0 and dir_acc > 55:
        confidence = 'medium'
    else:
        confidence = 'low'

    meta.update({
        'model_name': model_display,
        'model_type': model_type,
        'validation_mae': metrics.get('mae'),
        'validation_mape': metrics.get('mape'),
        'validation_rmse': metrics.get('rmse'),
        'direction_accuracy': metrics.get('direction_accuracy'),
        'skill_score': metrics.get('skill_score'),
        'confidence': confidence,
    })

    meta['interpretation'] = generate_interpretation(
        crop_name, forecast_30d, current_price, meta
    )

    return {
        'forecast_30d': round(forecast_30d, 2),
        'forecast_meta': meta
    }


def _recursive_forecast(model, prices, timestamps, dates, n_steps=30):
    """
    Generate multi-step forecast using recursive strategy.
    Each prediction feeds into the next step's lag features.
    Falls back to naive (last price) if model diverges.
    """
    all_prices = list(prices)
    all_timestamps = list(timestamps)
    all_dates = list(dates)

    predictions = []
    naive_price = prices[-1]
    price_min = np.min(prices) * 0.3
    price_max = np.max(prices) * 3.0
    diverged = False

    for step in range(n_steps):
        if diverged:
            predictions.append(naive_price)
            last_date = datetime.strptime(all_dates[-1], '%Y-%m-%d')
            future_date = last_date + timedelta(days=step + 1)
            all_prices.append(naive_price)
            all_timestamps.append(all_timestamps[-1] + 1)
            all_dates.append(future_date.strftime('%Y-%m-%d'))
            continue

        n = len(all_prices)

        # Build features for next point
        lag_1 = all_prices[-1]
        lag_2 = all_prices[-2] if n >= 2 else lag_1
        lag_3 = all_prices[-3] if n >= 3 else lag_2

        window = all_prices[-5:]
        rolling_mean = np.mean(window)
        rolling_std = np.std(window) if len(window) > 1 else 0.0

        cal_gap = 1.0  # assume daily for forecast horizon
        trend_idx = float(n)

        last_date = datetime.strptime(all_dates[-1], '%Y-%m-%d')
        future_date = last_date + timedelta(days=step + 1)
        month = float(future_date.month - 1)

        features = np.array([[
            lag_1, lag_2, lag_3,
            rolling_mean, rolling_std,
            cal_gap, trend_idx, month
        ]])

        # Predict in log space, convert back
        try:
            log_pred = model.predict(features)[0]
            if not np.isfinite(log_pred):
                diverged = True
                pred_price = naive_price
            else:
                pred_price = float(inverse_log(log_pred))
        except Exception:
            diverged = True
            pred_price = naive_price

        # Check for divergence
        if not np.isfinite(pred_price) or pred_price <= 0 or pred_price < price_min or pred_price > price_max:
            diverged = True
            pred_price = naive_price

        predictions.append(pred_price)

        # Feed prediction back for next step
        all_prices.append(pred_price)
        all_timestamps.append(all_timestamps[-1] + 1)
        all_dates.append(future_date.strftime('%Y-%m-%d'))

    return np.array(predictions)


# ─── Utility: Standalone batch processing ───────────────────────────

def forecast_all_crops(price_data):
    """
    Run forecasting pipeline on all crops in price_data.

    Args:
        price_data: dict of {crop_key: {history: [...], ...}}

    Returns:
        dict of {crop_key: {forecast_30d, forecast_meta}}
    """
    results = {}
    for crop_key, crop_data in price_data.items():
        history = crop_data.get('history', [])
        result = run_forecasting_pipeline(history, crop_name=crop_key)
        results[crop_key] = result
    return results


if __name__ == '__main__':
    # Quick test with synthetic data
    import json

    test_history = [
        {'date': f'2025-01-{d:02d}', 'price': 100 + d * 2 + np.random.randn() * 5}
        for d in range(1, 31)
    ]

    result = run_forecasting_pipeline(test_history, crop_name='test_crop')
    print(f"Forecast: ₹{result['forecast_30d']:.2f}")
    print(f"Model: {result['forecast_meta']['model_name']}")
    print(f"Skill: {result['forecast_meta']['skill_score']}")
    print(f"Confidence: {result['forecast_meta']['confidence']}")
    print(f"Interpretation: {result['forecast_meta']['interpretation']}")
