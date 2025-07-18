from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.responses import StreamingResponse, JSONResponse
# Import old single prediction model for backward compatibility
# from app.model import predict_wheat_price
# Import new batch model
from app.model_v2 import predict_batch_prices, valid_locations, trained_models


# Initialize FastAPI app
app = FastAPI()



# Enable CORS to allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request model for single prediction (old)
class PredictionInput(BaseModel):
    location: str
    date: str
    cpi_food_items: float
    pms_price: float
    central_rate_usd: float
    mpr: float

# Request model for batch prediction (new)
class BatchPredictionInput(BaseModel):
    commodity_name: str
    location: str
    future_dates: list
    macro_inputs_raw: dict
    export: bool = False  # Add export parameter
    file_name: str = "batch_predictions.xlsx"  # Add file_name parameter
    

# Health check endpoint
@app.get("/api")
async def Hello():
    return "Hello"


# Single prediction endpoint (old model, for backward compatibility)
# @app.post("/api/predict")
# async def predict_single(input: PredictionInput):
#     try:
#         predicted_price = predict_wheat_price(
#             location=input.location,
#             date=input.date,
#             cpi_food_items=input.cpi_food_items,
#             pms_price=input.pms_price,
#             central_rate_usd=input.central_rate_usd,
#             mpr=input.mpr
#         )
#         return {"price": predicted_price}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# Batch prediction endpoint (new model)
@app.post("/api/batch_predict")
async def batch_predict(input: BatchPredictionInput):
    """
    Predicts prices for a commodity at a location for multiple future dates using the batch model.
    """
    print("Starting batch prediction...", input)  # First debug print

    try:
        # Validate commodity and location
        print("Validating inputs...", {"commodity_name": input.commodity_name, "location": input.location})
        if input.commodity_name not in trained_models:
            raise HTTPException(status_code=400, detail=f"Commodity '{input.commodity_name}' not trained. Choose from: {list(trained_models.keys())}")
        if input.location not in valid_locations:
            raise HTTPException(status_code=400, detail=f"Location '{input.location}' not recognized. Choose from: {valid_locations}")

        print("Inputs validated, calling predict_batch_prices...", input)  # Second debug print
        results = predict_batch_prices(
            commodity_name=input.commodity_name,
            location=input.location,
            future_dates=input.future_dates,
            macro_inputs_raw=input.macro_inputs_raw,
            export=input.export,
            file_name=input.file_name
        )
        if input.export:
            return StreamingResponse(
                iter([results.getvalue()]),  # Convert BytesIO to iterable
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={input.file_name}"}
            )
        print("Prediction completed successfully", results)  # Third debug print
        return {"results": results}
    except HTTPException as http_err:
        print(f"HTTP Error: {http_err.detail}")
        raise
    except Exception as e:
        print(f"Error in batch_predict: {str(e)}")  # Log the specific error
        raise HTTPException(status_code=500, detail=f"Batch prediction error: {str(e)}")

# Serve static files (frontend)
app.mount("/", StaticFiles(directory="./out", html=True), name="static")
