from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from .model import predict_wheat_price

app = FastAPI()


# Enable CORS to allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionInput(BaseModel):
    location: str
    date: str
    cpi_food_items: float
    pms_price: float
    central_rate_usd: float
    mpr: float
    
@app.get("/api")
async def Hello():
    return "Hello"

@app.post("/api/predict")
async def predict_single(input: PredictionInput):
    try:
        predicted_price = predict_wheat_price(
            location=input.location,
            date=input.date,
            cpi_food_items=input.cpi_food_items,
            pms_price=input.pms_price,
            central_rate_usd=input.central_rate_usd,
            mpr=input.mpr
        )
        return {"price": predicted_price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
    
app.mount("/", StaticFiles(directory="./out", html=True), name="static")
