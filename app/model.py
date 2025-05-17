import pandas as pd
from datetime import datetime
from catboost import CatBoostRegressor
from sklearn.preprocessing import MinMaxScaler
from statsmodels.tsa.arima.model import ARIMA
import os

# Load and preprocess training data (replace with your actual data path)
data_path = "WheatData2.xlsx"  # Update path as needed
if not os.path.isfile(data_path):
    raise FileNotFoundError(f"Data file not found: {data_path}")
WheatData_Final = pd.read_excel(data_path)

# Preprocessing
WheatData_Final['Date'] = pd.to_datetime(WheatData_Final['Date'])
WheatData_Final['year'] = WheatData_Final['Date'].dt.year
WheatData_Final['month'] = WheatData_Final['Date'].dt.month
WheatData_Final['day'] = WheatData_Final['Date'].dt.day

# Normalize numerical features
features_to_normalize = ['CPI Food Items', 'PMS PRICE', 'Central Rate (US DOLL)', 'mpr']
scaler = MinMaxScaler()
WheatData_Final[features_to_normalize] = scaler.fit_transform(WheatData_Final[features_to_normalize])

# One-hot encode 'Location'
WheatData_Final = pd.get_dummies(WheatData_Final, columns=['Location'], drop_first=True)

# Train ARIMA model
wheat_price = WheatData_Final['Alkama (Wheat)']
arima_model = ARIMA(wheat_price, order=(1, 1, 1))
arima_result = arima_model.fit()
WheatData_Final['Residuals'] = arima_result.resid

# Define features and train CatBoost model
features = ['Residuals', 'year', 'month', 'day', 'CPI Food Items', 'PMS PRICE', 'Central Rate (US DOLL)', 'mpr'] + \
           [col for col in WheatData_Final.columns if 'Location_' in col]
catboost_model = CatBoostRegressor(iterations=200, learning_rate=0.1, depth=6, random_state=42, verbose=0)
catboost_model.fit(WheatData_Final[features], WheatData_Final['Alkama (Wheat)'])

def predict_wheat_price(location: str, date: str, cpi_food_items: float, pms_price: float, central_rate_usd: float, mpr: float) -> float:
    try:
        # Convert date
        date = pd.to_datetime(date)
        year = date.year
        month = date.month
        day = date.day

        # Prepare input features
        input_data = pd.DataFrame({
            'Residuals': [0],  # Default residuals (ARIMA residuals are simplified)
            'year': [year],
            'month': [month],
            'day': [day],
            'CPI Food Items': [cpi_food_items],
            'PMS PRICE': [pms_price],
            'Central Rate (US DOLL)': [central_rate_usd],
            'mpr': [mpr]
        })

        # Normalize input features
        input_data[features_to_normalize] = scaler.transform(input_data[features_to_normalize])

        # Add location dummies
        location_dummies = pd.get_dummies(pd.Series([location]), prefix="Location")
        for col in [col for col in WheatData_Final.columns if 'Location_' in col]:
            if col not in location_dummies.columns:
                location_dummies[col] = 0
        input_data = pd.concat([input_data, location_dummies], axis=1)

        # Ensure all feature columns exist
        for col in features:
            if col not in input_data.columns:
                input_data[col] = 0

        # Reorder columns
        input_data = input_data[features]

        # Predict
        predicted_price = catboost_model.predict(input_data)[0]
        return float(predicted_price)
    except Exception as e:
        raise Exception(f"Prediction error: {str(e)}")