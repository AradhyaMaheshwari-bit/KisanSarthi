import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import json
import argparse
import os
from datetime import datetime

# ── Usage ──────────────────────────────────────────────────────────────
# Default: place dataset.csv in same folder as this script and run:
#   python script.py
# Or specify a custom path:
#   python script.py --csv path/to/dataset.csv --out price_data.json
# ───────────────────────────────────────────────────────────────────────

parser = argparse.ArgumentParser(description='Generate price_data.json from APMC dataset')
parser.add_argument('--csv', default=os.path.join(os.path.dirname(__file__), 'dataset.csv'),
                    help='Path to dataset CSV file (default: dataset.csv next to this script)')
parser.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'price_data.json'),
                    help='Output path for price_data.json (default: same folder as script)')
args = parser.parse_args()

print(f"📂 Loading dataset from: {args.csv}")
df = pd.read_csv(args.csv)
df['Arrival_Date'] = pd.to_datetime(df['Arrival_Date'], dayfirst=True)
df = df.dropna(subset=['Modal_Price'])
df = df.drop_duplicates()

# Remove outliers
Q1 = df['Modal_Price'].quantile(0.25)
Q3 = df['Modal_Price'].quantile(0.75)
IQR = Q3 - Q1
df = df[(df['Modal_Price'] >= Q1 - 1.5*IQR) & (df['Modal_Price'] <= Q3 + 1.5*IQR)]

crops = df['Commodity'].unique()
price_data = {}

for crop in crops:
    crop_df = df[df['Commodity'] == crop].groupby('Arrival_Date')['Modal_Price'].mean()
    
    if len(crop_df) < 2:
        continue

    # Linear regression forecast
    X = np.arange(len(crop_df)).reshape(-1, 1)
    y = crop_df.values
    model = LinearRegression().fit(X, y)
    future_X = np.arange(len(crop_df), len(crop_df) + 30).reshape(-1, 1)
    forecast = model.predict(future_X)

    current = crop_df.iloc[-1]
    price_30d_ago = crop_df.iloc[-30] if len(crop_df) >= 30 else crop_df.iloc[0]
    change_pct = round((current - price_30d_ago) / price_30d_ago * 100, 1)

    price_data[crop.lower().replace(' ', '_')] = {
        "current_price": int(current),
        "unit": "per quintal",
        "change_30d_pct": change_pct,
        "avg_7d": int(crop_df.tail(7).mean()),
        "forecast_30d": int(forecast[-1]),
        "last_updated": datetime.today().strftime('%Y-%m-%d'),
        "history": [
            {"date": str(date.date()), "price": int(price)}
            for date, price in crop_df.tail(60).items()
        ]
    }

with open(args.out, 'w', encoding='utf-8') as f:
    json.dump(price_data, f, indent=2, ensure_ascii=False)

print(f"✅ Exported {len(price_data)} crops to: {args.out}")