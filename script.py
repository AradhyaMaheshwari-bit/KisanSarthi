import pandas as pd
import numpy as np
import json
import argparse
import os
import sys
from datetime import datetime
from forecasting import run_forecasting_pipeline

# Fix Windows console encoding for Unicode output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# -- Usage -----------------------------------------------------------------
# Default: place dataset.csv in same folder as this script and run:
#   python script.py
# Or specify a custom path:
#   python script.py --csv path/to/dataset.csv --out price_data.json
#
# Expected CSV columns:
#   - Commodity:      Crop name (e.g. "Rice", "Wheat", "Onion")
#   - Arrival_Date:   Date of market arrival (DD-MM-YYYY or similar)
#   - Modal_Price:    Modal price in INR per quintal
# -------------------------------------------------------------------------

EXPECTED_COLUMNS = ['Commodity', 'Arrival_Date', 'Modal_Price']

parser = argparse.ArgumentParser(description='Generate price_data.json from APMC dataset')
parser.add_argument('--csv', default=os.path.join(os.path.dirname(__file__), 'dataset.csv'),
                    help='Path to dataset CSV file (default: dataset.csv next to this script)')
parser.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'price_data.json'),
                    help='Output path for price_data.json (default: same folder as script)')
args = parser.parse_args()

if not os.path.exists(args.csv):
    print(f"ERROR: Dataset not found: {args.csv}")
    print()
    print("The dataset.csv file is required to run the data pipeline.")
    print("Expected CSV columns:")
    for col in EXPECTED_COLUMNS:
        print(f"  - {col}")
    print()
    print("Place your APMC market dataset CSV in the project root,")
    print("or specify a path with: python script.py --csv path/to/dataset.csv")
    print()
    print("The existing price_data.json will continue to work with the frontend.")
    exit(1)

print(f"Loading dataset from: {args.csv}")
df = pd.read_csv(args.csv)

missing = [col for col in EXPECTED_COLUMNS if col not in df.columns]
if missing:
    print(f"ERROR: Missing required columns: {', '.join(missing)}")
    print(f"  Found columns: {', '.join(df.columns)}")
    print(f"  Expected columns: {', '.join(EXPECTED_COLUMNS)}")
    exit(1)

print(f"  Loaded {len(df)} rows, {df['Commodity'].nunique()} crops")
df['Arrival_Date'] = pd.to_datetime(df['Arrival_Date'], dayfirst=True)
df = df.dropna(subset=['Modal_Price'])
df = df.drop_duplicates()

# Remove outliers using IQR method
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

    current = crop_df.iloc[-1]
    price_30d_ago = crop_df.iloc[-30] if len(crop_df) >= 30 else crop_df.iloc[0]
    change_pct = round((current - price_30d_ago) / price_30d_ago * 100, 1)

    # Build history records for forecasting pipeline
    history = [
        {"date": str(date.date()), "price": float(price)}
        for date, price in crop_df.tail(60).items()
    ]

    # ML forecasting pipeline
    crop_key = crop.lower().replace(' ', '_')
    forecast_result = run_forecasting_pipeline(history, crop_name=crop_key)

    price_data[crop_key] = {
        "current_price": int(current),
        "unit": "per quintal",
        "change_30d_pct": change_pct,
        "avg_7d": int(crop_df.tail(7).mean()),
        "forecast_30d": forecast_result['forecast_30d'],
        "forecast_meta": forecast_result['forecast_meta'],
        "last_updated": datetime.today().strftime('%Y-%m-%d'),
        "history": [
            {"date": str(date.date()), "price": int(price)}
            for date, price in crop_df.tail(60).items()
        ]
    }

with open(args.out, 'w', encoding='utf-8') as f:
    json.dump(price_data, f, indent=2, ensure_ascii=False)

print(f"Exported {len(price_data)} crops to: {args.out}")
