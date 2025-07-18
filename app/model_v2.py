"""
model_v2.py
Batch price prediction model supporting multiple commodities and batch requests.
"""

from io import BytesIO
import pandas as pd
from datetime import datetime
from catboost import CatBoostRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler
from statsmodels.tsa.arima.model import ARIMA
import joblib
import os

# --- Load and preprocess data ---
data_path = "WheatData2.xlsx"
if not os.path.isfile(data_path):
    raise FileNotFoundError(f"Data file not found: {data_path}")
df = pd.read_excel(data_path)

# Parse date and extract time features
df['Date'] = pd.to_datetime(df['Date'])
df['year'] = df['Date'].dt.year
df['month'] = df['Date'].dt.month
df['day'] = df['Date'].dt.day

# Normalize macroeconomic features
features_to_normalize = ['CPI Food Items', 'PMS PRICE', 'Central Rate (US DOLL)', 'mpr']
scaler = MinMaxScaler()
df[features_to_normalize] = scaler.fit_transform(df[features_to_normalize])
joblib.dump(scaler, 'scaler.pkl')  # Save scaler for future use

# Define commodity columns (C to K)
commodity_columns = df.columns[2:11].tolist()

# Dictionary to store trained models and their features
trained_models = {}

# --- Train models for all commodities ---
def train_all_commodities():
    """
    Trains a CatBoost model for each commodity using ARIMA residuals and macroeconomic features.
    Stores models and their features in trained_models.
    """
    for commodity in commodity_columns:
        df[commodity] = df[commodity].ffill().bfill()
        try:
            arima_model = ARIMA(df[commodity], order=(1, 1, 1))
            arima_result = arima_model.fit()
            df['Residuals'] = arima_result.resid
        except Exception as e:
            print(f"ARIMA failed for {commodity}: {e}")
            continue
        features = ['Residuals', 'year', 'month', 'day'] + features_to_normalize
        target = commodity
        model_data = df[features + [target]].dropna()
        X = model_data[features]
        y = model_data[target]
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
        model = CatBoostRegressor(iterations=200, learning_rate=0.1, depth=6, random_state=42, verbose=0)
        model.fit(X_train, y_train)
        trained_models[commodity] = {
            'model': model,
            'features': features
        }

# --- Valid locations ---
valid_locations = df['Location'].dropna().unique().tolist()

# --- Batch prediction function ---
def predict_batch_prices(commodity_name, location, future_dates, macro_inputs_raw, export=False, file_name="batch_predictions.xlsx"):
    """
    Predicts prices for a commodity at a location for multiple future dates.
    Args:
        commodity_name (str): Name of the commodity.
        location (str): Location name (validated).
        future_dates (list): List of date strings (YYYY-MM-DD).
        macro_inputs_raw (dict): Raw macroeconomic inputs.
    Returns:
        List of dicts with prediction results.
    """
    if commodity_name not in trained_models:
        raise ValueError(f"'{commodity_name}' is not trained. Choose from: {list(trained_models.keys())}")
    if location not in valid_locations:
        raise ValueError(f"'{location}' is not a recognized location. Choose from: {valid_locations}")
    scaler = joblib.load('scaler.pkl')
    model_info = trained_models[commodity_name]
    model = model_info['model']
    features = model_info['features']
    predictions = []
    for date_str in future_dates:
        future_date = pd.to_datetime(date_str)
        input_data = {
            'year': future_date.year,
            'month': future_date.month,
            'day': future_date.day,
            'Residuals': 0  # Residuals are 0 for future unknown values
        }
        for feature in features_to_normalize:
            if feature not in macro_inputs_raw:
                raise ValueError(f"Missing macroeconomic input: {feature}")
        macro_df = pd.DataFrame([macro_inputs_raw])
        macro_scaled = scaler.transform(macro_df)
        macro_scaled_dict = dict(zip(features_to_normalize, macro_scaled[0]))
        input_data.update(macro_scaled_dict)
        input_df = pd.DataFrame([input_data])[features]
        predicted_price = model.predict(input_df)[0]
        predictions.append({
            'Commodity': commodity_name,
            'Location': location,
            'Date': future_date.date().isoformat(),
            'Predicted Price': round(predicted_price, 2)
        })
    if export:
        output = BytesIO()
        pd.DataFrame(predictions).to_excel(output, index=False)
        output.seek(0)
        return output
    return predictions

# --- Train models on import ---
train_all_commodities()
