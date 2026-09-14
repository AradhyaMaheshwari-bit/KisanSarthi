# 🌾 KisanSarthi

> AI-powered agricultural intelligence platform for Indian farmers — real-time crop prices, ML forecasting, plant disease detection, and personalized farming advice.

## 👥 Team

| Name |
|------|
| Aradhya Maheshwari |
| Rahul |

## 📌 About

KisanSarthi is an AI-driven web application built for Indian farmers. It combines real-time APMC market data, machine learning price forecasts, AI-powered plant disease detection, and a conversational farming assistant — all in a single, mobile-friendly interface with bilingual support (English/Hindi).

## 🎯 Key Features

- **Live Mandi Prices** — Real-time crop prices for 28+ crops sourced from APMC market data, with interactive trend charts and 7-day moving averages
- **30-Day Price Forecast** — ML-powered forecasting with multiple model candidates, chronological validation, and farmer-friendly confidence indicators
- **Plant Disease Detection** — Upload a photo of a diseased plant; Claude Vision API identifies the disease and recommends treatment
- **AI Farming Assistant** — Conversational chatbot (Claude AI) answers questions about crops, soil, weather, pests, and government schemes
- **Market Insights** — Per-crop analysis including price trends, volatility, historical range, and contextual observations
- **Data Analytics** — Statistical analysis across 28 crops: trend detection, volatility measurement, anomaly identification, crop rankings, and data quality reporting
- **Bilingual Support** — Full English/Hindi language toggle for accessibility across regions
- **Dark Mode** — Automatic theme adaptation based on system preferences
- **Mobile Responsive** — Optimized layout for phones, tablets, and desktops

## 📁 Project Structure

```
KisanSarthi/
├── index.html          # Main frontend — single-page app UI
├── style.css           # Responsive styling, dark mode, animations
├── analytics.js        # Agricultural analytics engine (standalone module)
├── app.js              # Frontend logic, AI integration, chart rendering
├── proxy.js            # Node.js reverse proxy for Claude API (CORS)
├── script.py           # Python data pipeline — cleaning + data export
├── forecasting.py      # ML forecasting engine — models, validation, features
├── price_data.json     # Processed crop price dataset (pipeline output)
├── package.json        # Node.js project config and scripts
├── requirements.txt    # Python dependencies
└── .gitignore          # Ignored files and directories
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Charts | Chart.js (price trends, moving averages, forecast lines) |
| AI / ML | Claude AI API (Haiku 4.5) — chat, disease detection via Vision |
| Data Pipeline | Python, Pandas, NumPy, Scikit-learn (Ridge, LinearRegression, HistGradientBoosting) |
| Server | Node.js reverse proxy (CORS handling for API calls) |
| Data Source | APMC market crop price datasets |

## 🔬 Data Pipeline

```
Raw APMC CSV Data (dataset.csv)
        ↓
Load & Validate (Pandas)
        ↓
Clean: drop NaN, remove duplicates
        ↓
Remove Outliers (IQR method)
        ↓
Calculate 7-day moving average, 30-day % change
        ↓
ML Forecasting Engine (forecasting.py)
  - Chronological validation (no future data leakage)
  - Multiple model candidates: Naive, Mean, Moving Average,
    Linear Regression, Ridge, HistGradientBoosting
  - Log-transform target (prevents negative forecasts)
  - Observation-based features (handles irregular time gaps)
  - Automatic model selection (ML only if better than naive)
        ↓
Export to price_data.json (28 crops, forecasts + model metadata)
        ↓
Frontend renders live charts, forecasts, and insights
```

## 🚀 Setup & Running

### Prerequisites
- **Node.js** (v14 or later)
- **Python 3.8+** (for data pipeline)
- **Anthropic API key** (for AI features)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/KisanSarthi.git
   cd KisanSarthi
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```
   Node.js dependencies are installed locally into `node_modules/`. This project currently uses only Node.js built-in modules, so no npm packages are required.

3. **Set up Python environment** (for data pipeline)
   ```bash
   python -m venv .venv
   .venv\Scripts\activate        # Windows
   # source .venv/bin/activate   # macOS/Linux
   pip install -r requirements.txt
   ```
   All Python dependencies are installed into the project-local `.venv/` virtual environment. Never install project Python packages globally.

4. **Run the application**
   ```bash
   npm start
   ```
   This starts the proxy server on **http://localhost:3001**. Open it in your browser.

5. **Enter your Anthropic API key** when prompted in the app to enable AI features (chat and disease detection).

### Data Pipeline (Optional)

To regenerate `price_data.json` from a fresh APMC dataset:

```bash
python script.py --csv path/to/dataset.csv
```

If no `dataset.csv` is provided, the existing `price_data.json` continues to work with the frontend.

### Development Environment

All project dependencies are isolated to this repository:

| Ecosystem | Mechanism | Location |
|-----------|-----------|----------|
| Python | Virtual environment | `.venv/` |
| Node.js | Local `node_modules/` | `node_modules/` (currently empty — no npm deps needed) |

**Rule:** When adding a dependency, use the native project-local mechanism for that ecosystem. Never install project dependencies globally.

## 📊 Analytics & Intelligence

| Capability | Details |
|------------|---------|
| Price Data | 28 crops with up to 60 historical data points each |
| Statistical Analysis | Mean, median, min/max, range, date coverage per crop |
| Trend Detection | Rising/falling/stable classification with confidence levels |
| Volatility Analysis | Coefficient of Variation with stable/moderate/volatile thresholds |
| Anomaly Detection | Z-score method identifying statistically unusual price points |
| Crop Rankings | Top gainers, losers, most volatile, most stable |
| Data Quality | Per-crop sufficiency indicators, sparse data detection |
| Forecasting | ML-driven 30-day forecast with chronological validation, automatic model selection, and farmer-friendly confidence indicators |
| Market Context | Per-crop insights: price range, trend direction, volatility |
| Disease Detection | Image-based plant disease identification via Claude Vision |

## 🗺 Roadmap

- [x] Agricultural data analytics (statistics, trends, volatility, anomalies, rankings)
- [x] Improved forecasting with ML models (Ridge, Linear Regression, Gradient Boosting) and chronological validation
- [ ] Real-time price updates via live APMC data feeds
- [ ] Weather integration for location-specific farming advice
- [ ] Government scheme eligibility checker
- [ ] Multi-language support beyond English and Hindi
- [ ] Offline mode with cached data
- [ ] Farmer community features and knowledge sharing

## 📄 License

This project is a BCA student project for academic purposes.

---

**Domain:** AI + Data Analytics + AgriTech
**Target Users:** Indian Farmers
