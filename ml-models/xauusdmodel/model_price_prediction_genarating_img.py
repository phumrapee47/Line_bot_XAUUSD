import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error
import math
import os
from pathlib import Path
from twelvedata import TDClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY")

# TensorFlow/Keras imports
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, Dropout, Input

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

print("="*80)
print("XAUUSD LSTM Price Prediction Model")
print("="*80)

# ============================================================================
# Download XAUUSD historical data
# ============================================================================
print("\n[1] Downloading XAUUSD historical data from TwelveData...")
symbol = 'XAU/USD'

if not TWELVEDATA_API_KEY or "your_twelvedata_api_key" in TWELVEDATA_API_KEY:
    print("\n[ERROR] TWELVEDATA_API_KEY not configured in .env")
    import sys
    sys.exit(1)

td = TDClient(apikey=TWELVEDATA_API_KEY)
# We'll fetch a large enough chunk of daily data. 
# Note: 5000 is a lot, adjust based on TwelveData limits for your account type.
ts = td.time_series(
    symbol=symbol,
    interval="1day",
    outputsize=2000 
)
df = ts.as_pandas()

if df.empty:
    print("\n[ERROR] No data received from TwelveData")
    import sys
    sys.exit(1)

# Reverse to chronological order
df = df.iloc[::-1]
closing_prices_xauusd = df['close'].astype(float).values.reshape(-1, 1)

print(f"Data shape: {closing_prices_xauusd.shape}")
print(f"First 5 prices: {closing_prices_xauusd[:5].flatten()}")
print(f"Last 5 prices: {closing_prices_xauusd[-5:].flatten()}")

# ============================================================================
# Split XAUUSD data 80/20
# ============================================================================
print("\n[2] Splitting data into 80% training / 20% testing...")
split_index_xauusd = round(len(closing_prices_xauusd) * 0.8)
X_train_xauusd = closing_prices_xauusd[:split_index_xauusd]
X_test_xauusd = closing_prices_xauusd[split_index_xauusd:]
print(f"Training set shape: {X_train_xauusd.shape}")
print(f"Testing set shape: {X_test_xauusd.shape}")

# ============================================================================
# Scale XAUUSD data
# ============================================================================
print("\n[3] Scaling data with MinMaxScaler...")
scaler_xauusd = MinMaxScaler(feature_range=(0, 1))
X_train_xauusd_scaled = scaler_xauusd.fit_transform(X_train_xauusd)
X_test_xauusd_scaled = scaler_xauusd.transform(X_test_xauusd)
print(f"Scaled training set shape: {X_train_xauusd_scaled.shape}")
print(f"Scaled testing set shape: {X_test_xauusd_scaled.shape}")

# ============================================================================
# Create XAUUSD windowed datasets (look_back=60)
# ============================================================================
print("\n[4] Creating windowed datasets with look_back=60...")
def create_dataset(dataset, look_back=60):
    dataX, dataY = [], []
    for i in range(look_back, len(dataset)):
        dataX.append(dataset[i-look_back:i, 0])
        dataY.append(dataset[i, 0])
    return np.array(dataX), np.array(dataY)

look_back = 60
X_train_xauusd_windowed, y_train_xauusd = create_dataset(X_train_xauusd_scaled, look_back)
X_test_xauusd_windowed, y_test_xauusd = create_dataset(X_test_xauusd_scaled, look_back)
print(f"X_train_xauusd_windowed shape: {X_train_xauusd_windowed.shape}")
print(f"y_train_xauusd shape: {y_train_xauusd.shape}")
print(f"X_test_xauusd_windowed shape: {X_test_xauusd_windowed.shape}")
print(f"y_test_xauusd shape: {y_test_xauusd.shape}")

# ============================================================================
# Reshape XAUUSD data for LSTM
# ============================================================================
print("\n[5] Reshaping data for LSTM input...")
X_train_xauusd_windowed = np.reshape(X_train_xauusd_windowed, (X_train_xauusd_windowed.shape[0], X_train_xauusd_windowed.shape[1], 1))
X_test_xauusd_windowed = np.reshape(X_test_xauusd_windowed, (X_test_xauusd_windowed.shape[0], X_test_xauusd_windowed.shape[1], 1))
print(f"X_train_xauusd_windowed reshaped: {X_train_xauusd_windowed.shape}")
print(f"X_test_xauusd_windowed reshaped: {X_test_xauusd_windowed.shape}")

# ============================================================================
# Build LSTM Model
# ============================================================================
print("\n[6] Building LSTM model...")
model = Sequential()
model.add(Input(shape=(X_train_xauusd_windowed.shape[1], X_train_xauusd_windowed.shape[2])))
model.add(LSTM(units=50, return_sequences=True))
model.add(Dropout(0.2))
model.add(LSTM(units=50))
model.add(Dropout(0.2))
model.add(Dense(units=25))
model.add(Dense(units=1))
print(model.summary())

# ============================================================================
# Compile Model
# ============================================================================
print("\n[7] Compiling model...")
model.compile(optimizer='adam', loss='mean_squared_error')
print("Model compiled successfully")

# ============================================================================
# Train Model
# ============================================================================
print("\n[8] Training model (100 epochs, batch_size=32)...")
history = model.fit(X_train_xauusd_windowed, y_train_xauusd, epochs=100, batch_size=32, verbose=0)
print("Model training completed")

# ============================================================================
# Predict on test set
# ============================================================================
print("\n[9] Making predictions on test set...")
predictions_xauusd = model.predict(X_test_xauusd_windowed, verbose=0)
predictions_xauusd = scaler_xauusd.inverse_transform(predictions_xauusd)
y_test_xauusd_original = scaler_xauusd.inverse_transform(y_test_xauusd.reshape(-1, 1))
rmse_xauusd = math.sqrt(mean_squared_error(y_test_xauusd_original, predictions_xauusd))
print(f"Test RMSE: {rmse_xauusd:.6f}")

# ============================================================================
# Prepare recent XAUUSD data (last 90 days from the downloaded set)
# ============================================================================
print("\n[10] Preparing recent XAUUSD data for visualization...")

# Since we already downloaded 2000 rows, we can just use the most recent ones
# instead of downloading again.
recent_xauusd_data = df.tail(120) 
recent_closing_prices_xauusd = recent_xauusd_data['close'].astype(float).values.reshape(-1, 1)

print(f"Recent data shape: {recent_closing_prices_xauusd.shape}")
print(f"First 5 recent prices: {recent_closing_prices_xauusd[:5].flatten()}")
print(f"Last 5 recent prices: {recent_closing_prices_xauusd[-5:].flatten()}")

# ============================================================================
# Re-fit scaler with combined historical + recent data
# ============================================================================
print("\n[11] Re-fitting scaler with combined historical + recent data...")
combined_xauusd_prices = np.concatenate((closing_prices_xauusd, recent_closing_prices_xauusd))
updated_scaler_xauusd = MinMaxScaler(feature_range=(0, 1))
updated_scaler_xauusd.fit(combined_xauusd_prices)
print(f"Combined dataset shape: {combined_xauusd_prices.shape}")
print("Updated scaler fitted successfully")

# ============================================================================
# Prepare recent data for prediction
# ============================================================================
print("\n[12] Preparing recent data for prediction...")
look_back_recent = 60

if len(recent_closing_prices_xauusd) < look_back_recent:
    raise ValueError(f"Not enough recent data. Need at least {look_back_recent} days, but only have {len(recent_closing_prices_xauusd)}.")

x_input_updated = recent_closing_prices_xauusd[-look_back_recent:].reshape(-1, 1)
x_input_scaled_updated = updated_scaler_xauusd.transform(x_input_updated)
x_input_reshaped_updated = x_input_scaled_updated.reshape(1, look_back_recent, 1)
print(f"Input shape for prediction: {x_input_reshaped_updated.shape}")

# ============================================================================
# Predict current XAUUSD price
# ============================================================================
print("\n[13] Predicting current XAUUSD price...")
predicted_xauusd_price_scaled_updated = model.predict(x_input_reshaped_updated, verbose=0)
predicted_xauusd_price_updated = updated_scaler_xauusd.inverse_transform(predicted_xauusd_price_scaled_updated)
predicted_price = predicted_xauusd_price_updated[0][0]
print(f"Predicted current XAUUSD price: ${predicted_price:.2f}")

# ============================================================================
# Generate visualization and save as image
# ============================================================================
print("\n[14] Generating visualization...")

recent_dates = recent_xauusd_data.index
actual_recent_series = pd.Series(recent_closing_prices_xauusd.flatten(), index=recent_dates)

last_actual_date = recent_dates[-1]
predicted_date = last_actual_date + timedelta(days=1)
predicted_series = pd.Series([predicted_price], index=[predicted_date])

plt.figure(figsize=(14, 7))
plt.plot(actual_recent_series, label='Actual Recent XAUUSD Price', color='blue', linewidth=2)
plt.plot(predicted_series.index, predicted_series.values, 'o',
         label='Predicted Next Day XAUUSD Price', color='red', markersize=10)
plt.title('Recent XAUUSD Price and Next Day Prediction', fontsize=14, fontweight='bold')
plt.xlabel('Date', fontsize=12)
plt.ylabel('Price', fontsize=12)
plt.legend(fontsize=11, loc='best')
plt.grid(True, alpha=0.3)
plt.xticks(rotation=45)
plt.tight_layout()

# ============================================================================
# Save plot to file instead of showing
# ============================================================================
project_root = Path(__file__).parent.parent.parent
output_dir = project_root / 'backend' / 'data' / 'predictions'
output_dir.mkdir(parents=True, exist_ok=True)

current_date = datetime.now().strftime('%Y%m%d')
output_path = output_dir / f'xauusd_prediction_{current_date}.png'

plt.savefig(str(output_path), dpi=100, bbox_inches='tight')
print(f"Plot saved as {output_path}")
print(f"Visualization generated successfully at: {output_path}")

plt.close()

print("\n" + "="*80)
print("PREDICTION COMPLETE!")
print("="*80)
print(f"Current date: {datetime.now().strftime('%Y-%m-%d')}")
print(f"Predicted price: ${predicted_price:.2f}")
print(f"Test RMSE: {rmse_xauusd:.6f}")
print("="*80)