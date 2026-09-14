/* ═══════════════════════════════════════════════════════════════
   KisanSarthi — Agricultural Analytics Engine (Phase 4)

   Standalone analytics module for crop price data.
   Exposes window.KisanAnalytics for use by app.js.

   All calculations are based on actual data from price_data.json.
   No data is fabricated. Limitations are documented in output.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Internal helpers ──────────────────────────────────────

  function sorted(arr) {
    return arr.slice().sort(function (a, b) { return a - b; });
  }

  function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) sum += arr[i];
    return sum / arr.length;
  }

  function stdDev(arr, avg) {
    if (!arr || arr.length < 2) return 0;
    var m = avg !== undefined ? avg : mean(arr);
    var sumSq = 0;
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i] - m;
      sumSq += d * d;
    }
    return Math.sqrt(sumSq / arr.length); // population stdDev
  }

  function percentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    if (sortedArr.length === 1) return sortedArr[0];
    var idx = (p / 100) * (sortedArr.length - 1);
    var lo = Math.floor(idx);
    var hi = Math.ceil(idx);
    if (lo === hi) return sortedArr[lo];
    return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
  }

  function daysBetween(dateStr1, dateStr2) {
    var d1 = new Date(dateStr1);
    var d2 = new Date(dateStr2);
    return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
  }

  function formatName(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // ── Statistics ────────────────────────────────────────────

  function calculateStatistics(history) {
    if (!history || history.length === 0) {
      return null;
    }

    var prices = [];
    var dates = [];
    for (var i = 0; i < history.length; i++) {
      if (history[i].price != null && !isNaN(history[i].price)) {
        prices.push(history[i].price);
      }
      if (history[i].date) {
        dates.push(history[i].date);
      }
    }

    if (prices.length === 0) return null;

    var sortedPrices = sorted(prices);
    var avg = mean(prices);
    var latest = prices[prices.length - 1];

    // Sort dates for earliest/latest
    var sortedDates = dates.slice().sort();
    var earliestDate = sortedDates[0];
    var latestDate = sortedDates[sortedDates.length - 1];
    var spanDays = earliestDate && latestDate ? daysBetween(earliestDate, latestDate) : 0;

    return {
      latest: latest,
      average: Math.round(avg),
      median: Math.round(percentile(sortedPrices, 50)),
      min: sortedPrices[0],
      max: sortedPrices[sortedPrices.length - 1],
      range: sortedPrices[sortedPrices.length - 1] - sortedPrices[0],
      count: prices.length,
      earliestDate: earliestDate || null,
      latestDate: latestDate || null,
      dateSpanDays: spanDays
    };
  }

  // ── Moving Average ────────────────────────────────────────

  function calculateMovingAverage(prices, windowSize) {
    if (!prices || prices.length === 0) return [];
    var w = windowSize || 7;
    var result = [];
    for (var i = 0; i < prices.length; i++) {
      if (i < w - 1) {
        result.push(null);
      } else {
        var slice = prices.slice(i - w + 1, i + 1);
        result.push(Math.round(mean(slice)));
      }
    }
    return result;
  }

  // ── Trend Analysis ────────────────────────────────────────
  //
  // Methodology:
  // 1. Take the most recent N observations (up to 5, minimum 2)
  // 2. Compute their average ("recent average")
  // 3. Compute the overall historical average
  // 4. Classify based on deviation:
  //    - > 5% above historical avg → "rising"
  //    - > 5% below historical avg → "falling"
  //    - Otherwise → "stable"
  // 5. Confidence based on data quality:
  //    - < 5 observations → "low"
  //    - 5-15 observations or < 90 days span → "medium"
  //    - 16+ observations and 90+ days → "high"

  function calculateTrend(history) {
    if (!history || history.length < 2) {
      return {
        direction: 'insufficient',
        recentAvg: null,
        historicalAvg: null,
        recentChangePct: null,
        confidence: 'low',
        methodology: 'At least 2 observations required for trend analysis.'
      };
    }

    var prices = [];
    for (var i = 0; i < history.length; i++) {
      if (history[i].price != null && !isNaN(history[i].price)) {
        prices.push(history[i].price);
      }
    }

    if (prices.length < 2) {
      return {
        direction: 'insufficient',
        recentAvg: null,
        historicalAvg: null,
        recentChangePct: null,
        confidence: 'low',
        methodology: 'Fewer than 2 valid price observations.'
      };
    }

    var recentCount = Math.min(5, prices.length);
    var recentSlice = prices.slice(prices.length - recentCount);
    var recentAvg = mean(recentSlice);
    var historicalAvg = mean(prices);

    var deviationPct = historicalAvg > 0 ? ((recentAvg - historicalAvg) / historicalAvg) * 100 : 0;

    var direction;
    if (deviationPct > 5) {
      direction = 'rising';
    } else if (deviationPct < -5) {
      direction = 'falling';
    } else {
      direction = 'stable';
    }

    // Confidence assessment
    var spanDays = 0;
    if (history.length >= 2) {
      var firstDate = history[0].date;
      var lastDate = history[history.length - 1].date;
      if (firstDate && lastDate) {
        spanDays = daysBetween(firstDate, lastDate);
      }
    }

    var confidence;
    if (prices.length < 5) {
      confidence = 'low';
    } else if (prices.length < 16 || spanDays < 90) {
      confidence = 'medium';
    } else {
      confidence = 'high';
    }

    return {
      direction: direction,
      recentAvg: Math.round(recentAvg),
      historicalAvg: Math.round(historicalAvg),
      recentChangePct: Math.round(deviationPct * 10) / 10,
      confidence: confidence,
      methodology: 'Recent ' + recentCount + '-observation average (' + Math.round(recentAvg) +
        ') compared to historical average (' + Math.round(historicalAvg) +
        '). Deviation: ' + Math.round(deviationPct * 10) / 10 + '%. ' +
        'Classification: >5% above = rising, >5% below = falling, else stable.'
    };
  }

  // ── Volatility Analysis ───────────────────────────────────
  //
  // Methodology:
  // 1. Calculate percentage returns between consecutive observations
  //    (NOT assuming equal time spacing — raw observation-to-observation)
  // 2. Compute standard deviation of those returns
  // 3. Classify by coefficient of variation of the price series:
  //    - CV < 10% → "stable"
  //    - CV 10-25% → "moderate"
  //    - CV > 25% → "volatile"
  //
  // IMPORTANT: This does NOT claim observations are equally spaced.
  // The metric measures price variability relative to price level,
  // not time-normalized volatility.

  function calculateVolatility(history) {
    if (!history || history.length < 3) {
      return {
        cv: null,
        level: 'insufficient',
        returnStdDev: null,
        methodology: 'At least 3 observations required for volatility analysis.'
      };
    }

    var prices = [];
    for (var i = 0; i < history.length; i++) {
      if (history[i].price != null && !isNaN(history[i].price) && history[i].price > 0) {
        prices.push(history[i].price);
      }
    }

    if (prices.length < 3) {
      return {
        cv: null,
        level: 'insufficient',
        returnStdDev: null,
        methodology: 'Fewer than 3 valid price observations.'
      };
    }

    // Percentage returns between consecutive observations
    var returns = [];
    for (var j = 1; j < prices.length; j++) {
      if (prices[j - 1] !== 0) {
        returns.push(((prices[j] - prices[j - 1]) / prices[j - 1]) * 100);
      }
    }

    if (returns.length < 2) {
      return {
        cv: null,
        level: 'insufficient',
        returnStdDev: null,
        methodology: 'Insufficient valid returns for volatility calculation.'
      };
    }

    var avgPrice = mean(prices);
    var stdPrice = stdDev(prices, avgPrice);
    var cv = avgPrice > 0 ? (stdPrice / avgPrice) * 100 : 0;
    var returnSD = stdDev(returns, mean(returns));

    var level;
    if (cv < 10) {
      level = 'stable';
    } else if (cv < 25) {
      level = 'moderate';
    } else {
      level = 'volatile';
    }

    return {
      cv: Math.round(cv * 10) / 10,
      level: level,
      returnStdDev: Math.round(returnSD * 10) / 10,
      methodology: 'Coefficient of variation: (stdDev/mean)*100 = ' +
        Math.round(cv * 10) / 10 + '%. Thresholds: <10% stable, 10-25% moderate, >25% volatile. ' +
        'Based on ' + returns.length + ' observation-to-observation returns (not time-normalized).'
    };
  }

  // ── Anomaly Detection ─────────────────────────────────────
  //
  // Methodology: Z-score
  // 1. Compute mean and stdDev of the crop's price history
  // 2. For each observation, compute z-score = (price - mean) / stdDev
  // 3. Flag observations where |z| > 2.0 as anomalous
  //
  // IMPORTANT: An anomaly does NOT imply fraud, bad data, market
  // manipulation, supply shortage, or demand surge. It simply means
  // the observation is statistically unusual relative to this
  // crop's own available history.

  function detectAnomalies(history) {
    if (!history || history.length < 4) {
      return {
        anomalies: [],
        count: 0,
        method: 'z-score',
        threshold: 2.0,
        note: 'At least 4 observations required for anomaly detection.'
      };
    }

    var prices = [];
    var validHistory = [];
    for (var i = 0; i < history.length; i++) {
      if (history[i].price != null && !isNaN(history[i].price)) {
        prices.push(history[i].price);
        validHistory.push(history[i]);
      }
    }

    if (prices.length < 4) {
      return {
        anomalies: [],
        count: 0,
        method: 'z-score',
        threshold: 2.0,
        note: 'Fewer than 4 valid observations for anomaly detection.'
      };
    }

    var avg = mean(prices);
    var sd = stdDev(prices, avg);

    if (sd === 0) {
      return {
        anomalies: [],
        count: 0,
        method: 'z-score',
        threshold: 2.0,
        note: 'All prices identical — no variation to detect anomalies.'
      };
    }

    var anomalies = [];
    for (var j = 0; j < validHistory.length; j++) {
      var z = (validHistory[j].price - avg) / sd;
      if (Math.abs(z) > 2.0) {
        anomalies.push({
          date: validHistory[j].date,
          price: validHistory[j].price,
          zScore: Math.round(z * 100) / 100,
          type: z > 0 ? 'high' : 'low'
        });
      }
    }

    return {
      anomalies: anomalies,
      count: anomalies.length,
      method: 'z-score',
      threshold: 2.0,
      note: anomalies.length > 0
        ? anomalies.length + ' observation(s) with |z-score| > 2.0 detected. An unusual price does not necessarily indicate market manipulation or data error — it may reflect genuine supply/demand shifts.'
        : 'No statistically unusual observations detected.'
    };
  }

  // ── Comprehensive Crop Analysis ───────────────────────────

  function analyzeCrop(cropData) {
    if (!cropData) return null;

    var history = cropData.history || [];
    var stats = calculateStatistics(history);
    var trend = calculateTrend(history);
    var volatility = calculateVolatility(history);
    var anomalies = detectAnomalies(history);

    var forecast = cropData.forecast_30d;
    var forecastValid = forecast != null && forecast >= 0;

    // Deviation from historical average
    var deviationPct = null;
    var deviationDir = null;
    if (stats && stats.average > 0) {
      deviationPct = Math.round(((cropData.current_price - stats.average) / stats.average) * 1000) / 10;
      deviationDir = deviationPct > 0 ? 'above' : deviationPct < 0 ? 'below' : 'at';
    }

    // Generate farmer-friendly interpretation
    var interpretation = generateInterpretation(cropData, stats, trend, volatility, anomalies);

    return {
      stats: stats,
      trend: trend,
      volatility: volatility,
      anomalies: anomalies,
      currentPrice: cropData.current_price,
      avg7d: cropData.avg_7d,
      change30d: cropData.change_30d_pct,
      forecast30d: forecastValid ? forecast : null,
      forecastValid: forecastValid,
      deviationPct: deviationPct,
      deviationDir: deviationDir,
      interpretation: interpretation
    };
  }

  // ── Farmer-friendly Interpretation ────────────────────────

  function generateInterpretation(cropData, stats, trend, volatility, anomalies) {
    var parts = [];

    if (!stats) {
      parts.push('Insufficient data to generate analysis for this crop.');
      return parts;
    }

    // Trend interpretation
    if (trend.direction === 'insufficient') {
      parts.push('Available historical data is insufficient to determine a reliable price trend.');
    } else if (trend.direction === 'rising') {
      parts.push('Recent prices are trending above the historical average (' +
        Math.abs(trend.recentChangePct) + '% higher).');
    } else if (trend.direction === 'falling') {
      parts.push('Recent prices are trending below the historical average (' +
        Math.abs(trend.recentChangePct) + '% lower).');
    } else {
      parts.push('Price movement has been relatively stable around the historical average.');
    }

    // Volatility interpretation
    if (volatility.level === 'volatile') {
      parts.push('Price variability is higher than for most tracked crops (CV: ' + volatility.cv + '%).');
    } else if (volatility.level === 'stable') {
      parts.push('This crop shows relatively stable pricing (CV: ' + volatility.cv + '%).');
    } else if (volatility.level === 'moderate') {
      parts.push('Moderate price variability observed (CV: ' + volatility.cv + '%).');
    }

    // Deviation from average
    if (cropData.current_price && stats.average && stats.average > 0) {
      var dev = ((cropData.current_price - stats.average) / stats.average) * 100;
      if (Math.abs(dev) > 10) {
        parts.push('Current price (₹' + cropData.current_price.toLocaleString() +
          ') is significantly ' + (dev > 0 ? 'above' : 'below') + ' the historical average (₹' +
          stats.average.toLocaleString() + ').');
      }
    }

    // Anomalies
    if (anomalies.count > 0) {
      parts.push(anomalies.count + ' statistically unusual price observation(s) detected in the history. ' +
        'This may reflect genuine market conditions rather than data errors.');
    }

    // Data sufficiency note
    if (stats.count < 15) {
      parts.push('Note: analysis is based on only ' + stats.count +
        ' observations. Results may be less reliable than for crops with more data.');
    }

    return parts;
  }

  // ── Crop Rankings ─────────────────────────────────────────

  function rankCrops(priceData) {
    if (!priceData) return null;

    var crops = Object.keys(priceData);
    var analyses = {};

    // Analyze each crop
    for (var i = 0; i < crops.length; i++) {
      var key = crops[i];
      var analysis = analyzeCrop(priceData[key]);
      if (analysis) {
        analyses[key] = {
          key: key,
          name: formatName(key),
          currentPrice: priceData[key].current_price,
          change30d: priceData[key].change_30d_pct || 0,
          volatility: analysis.volatility,
          deviationPct: analysis.deviationPct,
          stats: analysis.stats
        };
      }
    }

    var ranked = Object.values(analyses);

    // Top gainers (by change_30d_pct, descending)
    var topGainers = ranked.slice().sort(function (a, b) { return b.change30d - a.change30d; })
      .slice(0, 5).map(function (c, i) {
        return { rank: i + 1, key: c.key, name: c.name, price: c.currentPrice, value: c.change30d, unit: '%' };
      });

    // Top losers (by change_30d_pct, ascending)
    var topLosers = ranked.slice().sort(function (a, b) { return a.change30d - b.change30d; })
      .slice(0, 5).map(function (c, i) {
        return { rank: i + 1, key: c.key, name: c.name, price: c.currentPrice, value: c.change30d, unit: '%' };
      });

    // Most volatile (by CV, descending) — only crops with valid CV
    var withCV = ranked.filter(function (c) { return c.volatility.cv != null; });
    var mostVolatile = withCV.slice().sort(function (a, b) { return b.volatility.cv - a.volatility.cv; })
      .slice(0, 5).map(function (c, i) {
        return { rank: i + 1, key: c.key, name: c.name, price: c.currentPrice, value: c.volatility.cv, unit: '% CV', level: c.volatility.level };
      });

    // Most stable (by CV, ascending)
    var mostStable = withCV.slice().sort(function (a, b) { return a.volatility.cv - b.volatility.cv; })
      .slice(0, 5).map(function (c, i) {
        return { rank: i + 1, key: c.key, name: c.name, price: c.currentPrice, value: c.volatility.cv, unit: '% CV', level: c.volatility.level };
      });

    // Above historical average (by deviation %, descending)
    var withDev = ranked.filter(function (c) { return c.deviationPct != null; });
    var aboveAvg = withDev.slice().sort(function (a, b) { return b.deviationPct - a.deviationPct; })
      .filter(function (c) { return c.deviationPct > 0; })
      .slice(0, 5).map(function (c, i) {
        return { rank: i + 1, key: c.key, name: c.name, price: c.currentPrice, value: c.deviationPct, unit: '% above avg' };
      });

    // Below historical average (by deviation %, ascending)
    var belowAvg = withDev.slice().sort(function (a, b) { return a.deviationPct - b.deviationPct; })
      .filter(function (c) { return c.deviationPct < 0; })
      .slice(0, 5).map(function (c, i) {
        return { rank: i + 1, key: c.key, name: c.name, price: c.currentPrice, value: Math.abs(c.deviationPct), unit: '% below avg' };
      });

    return {
      topGainers: topGainers,
      topLosers: topLosers,
      mostVolatile: mostVolatile,
      mostStable: mostStable,
      aboveAvg: aboveAvg,
      belowAvg: belowAvg
    };
  }

  // ── Data Quality Report ───────────────────────────────────

  function generateDataQualityReport(priceData) {
    if (!priceData) return null;

    var crops = Object.keys(priceData);
    var totalObservations = 0;
    var minDate = '9999-99-99';
    var maxDate = '0000-00-00';
    var sparseCrops = [];
    var insufficientCrops = [];

    for (var i = 0; i < crops.length; i++) {
      var key = crops[i];
      var hist = priceData[key].history || [];
      totalObservations += hist.length;

      for (var j = 0; j < hist.length; j++) {
        if (hist[j].date && hist[j].date < minDate) minDate = hist[j].date;
        if (hist[j].date && hist[j].date > maxDate) maxDate = hist[j].date;
      }

      if (hist.length < 5) {
        insufficientCrops.push({ key: key, name: formatName(key), count: hist.length });
      } else if (hist.length < 15) {
        sparseCrops.push({ key: key, name: formatName(key), count: hist.length });
      }
    }

    return {
      totalCrops: crops.length,
      totalObservations: totalObservations,
      avgObsPerCrop: crops.length > 0 ? Math.round(totalObservations / crops.length) : 0,
      dateRange: { min: minDate, max: maxDate },
      sufficientCrops: crops.length - sparseCrops.length - insufficientCrops.length,
      sparseCrops: sparseCrops,
      insufficientCrops: insufficientCrops,
      seasonalNote: 'Seasonal analysis requires multi-year data with consistent monthly coverage. ' +
        'Most crops in this dataset have data from a single narrow time window. ' +
        'Seasonal analysis is deferred until a richer dataset is available.'
    };
  }

  // ── Analytics Overview ────────────────────────────────────

  function generateOverview(priceData) {
    if (!priceData) return null;

    var crops = Object.keys(priceData);
    var totalObservations = 0;
    var minDate = '9999-99-99';
    var maxDate = '0000-00-00';

    var bestVolCV = { key: null, cv: Infinity };
    var worstVolCV = { key: null, cv: -1 };
    var bestGain = { key: null, change: -Infinity };
    var worstGain = { key: null, change: Infinity };

    for (var i = 0; i < crops.length; i++) {
      var key = crops[i];
      var crop = priceData[key];
      var hist = crop.history || [];
      totalObservations += hist.length;

      for (var j = 0; j < hist.length; j++) {
        if (hist[j].date && hist[j].date < minDate) minDate = hist[j].date;
        if (hist[j].date && hist[j].date > maxDate) maxDate = hist[j].date;
      }

      // Volatility
      var vol = calculateVolatility(hist);
      if (vol.cv != null) {
        if (vol.cv < bestVolCV.cv) bestVolCV = { key: key, cv: vol.cv };
        if (vol.cv > worstVolCV.cv) worstVolCV = { key: key, cv: vol.cv };
      }

      // Change
      var chg = crop.change_30d_pct || 0;
      if (chg > bestGain.change) bestGain = { key: key, change: chg };
      if (chg < worstGain.change) worstGain = { key: key, change: chg };
    }

    return {
      totalCrops: crops.length,
      totalObservations: totalObservations,
      dateRange: { min: minDate, max: maxDate },
      mostVolatile: worstVolCV.key ? { name: formatName(worstVolCV.key), key: worstVolCV.key, cv: worstVolCV.cv } : null,
      mostStable: bestVolCV.key ? { name: formatName(bestVolCV.key), key: bestVolCV.key, cv: bestVolCV.cv } : null,
      topGainer: bestGain.key ? { name: formatName(bestGain.key), key: bestGain.key, change: bestGain.change } : null,
      topLoser: worstGain.key ? { name: formatName(worstGain.key), key: worstGain.key, change: worstGain.change } : null
    };
  }

  // ── Seasonal Analysis (Deferred) ──────────────────────────

  function analyzeSeasonal(history) {
    return {
      supported: false,
      reason: 'Seasonal analysis requires multi-year data with consistent monthly coverage. ' +
        'Most crops in this dataset have data from a single narrow time window. ' +
        'This analysis is deferred to a future phase when richer data is available.'
    };
  }

  // ── Batch Analysis (cached) ───────────────────────────────

  var _cachedResults = null;

  function analyzeAll(priceData) {
    if (!priceData) return null;

    var overview = generateOverview(priceData);
    var rankings = rankCrops(priceData);
    var quality = generateDataQualityReport(priceData);

    // Per-crop analyses
    var cropAnalyses = {};
    var crops = Object.keys(priceData);
    for (var i = 0; i < crops.length; i++) {
      cropAnalyses[crops[i]] = analyzeCrop(priceData[crops[i]]);
    }

    _cachedResults = {
      overview: overview,
      rankings: rankings,
      quality: quality,
      crops: cropAnalyses,
      timestamp: Date.now()
    };

    return _cachedResults;
  }

  function getCachedResults() {
    return _cachedResults;
  }

  // ── Public API ────────────────────────────────────────────

  window.KisanAnalytics = {
    // Core calculations
    calculateStatistics: calculateStatistics,
    calculateMovingAverage: calculateMovingAverage,
    calculateTrend: calculateTrend,
    calculateVolatility: calculateVolatility,
    detectAnomalies: detectAnomalies,

    // Composite analysis
    analyzeCrop: analyzeCrop,
    rankCrops: rankCrops,

    // Reports
    generateOverview: generateOverview,
    generateDataQualityReport: generateDataQualityReport,
    analyzeSeasonal: analyzeSeasonal,

    // Batch / cached
    analyzeAll: analyzeAll,
    getCachedResults: getCachedResults,

    // Utilities (exposed for testing)
    _helpers: {
      mean: mean,
      stdDev: stdDev,
      sorted: sorted,
      percentile: percentile,
      formatName: formatName
    }
  };

})();
