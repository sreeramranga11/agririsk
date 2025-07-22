from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, Optional
from app.data_utils import get_ndvi_stats, get_elevation_stats, get_weather_stats
from shapely.geometry import shape
from shapely.ops import transform
import pyproj

app = FastAPI()

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RiskRequest(BaseModel):
    polygon: Dict[str, Any]  # GeoJSON
    coverage: Optional[float] = 1.0  # 0.1 to 2.0, default 1.0

@app.get("/")
def read_root():
    return {"message": "Precision Risk API is running"}

# Helper to calculate area in hectares

def polygon_area_ha(geojson_polygon):
    proj = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
    poly = shape(geojson_polygon['geometry'])
    poly_proj = transform(proj.transform, poly)
    return poly_proj.area / 10000  # m^2 to hectares

@app.post("/risk")
def calculate_risk(req: RiskRequest):
    ndvi = get_ndvi_stats(req.polygon)
    elevation = get_elevation_stats(req.polygon)
    weather = get_weather_stats(req.polygon)

    # Multi-peril mock logic
    perils = {}
    explanations = {}
    # Drought: high if NDVI is low and weather is dry
    drought_score = max(0, 1 - ((ndvi or 0.5) + (weather or 5)/20))
    explanations['drought'] = f"Drought risk {'high' if drought_score > 0.6 else 'moderate' if drought_score > 0.3 else 'low'} due to NDVI={ndvi:.2f}, weather={weather:.2f}."
    # Flood: high if elevation is low and weather is wet
    flood_score = max(0, 1 - ((elevation or 1000)/2000) + (weather or 5)/20)
    explanations['flood'] = f"Flood risk {'high' if flood_score > 0.6 else 'moderate' if flood_score > 0.3 else 'low'} due to elevation={elevation:.0f}m, weather={weather:.2f}."
    # Hail: random mock, but higher if elevation is high
    hail_score = min(1, ((elevation or 1000)/2000) * 0.7 + 0.2)
    explanations['hail'] = f"Hail risk {'high' if hail_score > 0.6 else 'moderate' if hail_score > 0.3 else 'low'} due to elevation={elevation:.0f}m."
    # Frost: higher at high elevation, low NDVI
    frost_score = min(1, ((elevation or 1000)/2000) * 0.5 + (1 - (ndvi or 0.5)) * 0.5)
    explanations['frost'] = f"Frost risk {'high' if frost_score > 0.6 else 'moderate' if frost_score > 0.3 else 'low'} due to elevation={elevation:.0f}m, NDVI={ndvi:.2f}."
    # Pestilence: higher if NDVI is high (mock: more crops, more pests)
    pestilence_score = min(1, (ndvi or 0.5) * 0.8)
    explanations['pestilence'] = f"Pestilence risk {'high' if pestilence_score > 0.6 else 'moderate' if pestilence_score > 0.3 else 'low'} due to NDVI={ndvi:.2f}."
    perils = {
        'drought': round(drought_score, 3),
        'flood': round(flood_score, 3),
        'hail': round(hail_score, 3),
        'frost': round(frost_score, 3),
        'pestilence': round(pestilence_score, 3)
    }

    # Weighted risk score (mock: average of perils)
    risk_score = sum(perils.values()) / len(perils)
    risk_score = min(max(risk_score, 0), 1)

    # Premium calculation (mock: base_rate * risk * area * coverage)
    base_rate = 100  # $/hectare
    area_ha = polygon_area_ha(req.polygon)
    coverage = req.coverage or 1.0
    peril_weights = {'drought': 0.3, 'flood': 0.25, 'hail': 0.15, 'frost': 0.15, 'pestilence': 0.15}
    peril_premiums = {k: round(base_rate * v * area_ha * coverage * peril_weights[k], 2) for k, v in perils.items()}
    premium = round(sum(peril_premiums.values()), 2)

    return {
        "risk_score": round(risk_score, 3),
        "premium": premium,
        "perils": perils,
        "peril_premiums": peril_premiums,
        "explanations": explanations,
        "report": {
            "NDVI": ndvi,
            "Elevation_m": elevation,
            "Weather_value": weather,
            "Area_ha": round(area_ha, 2),
            "Coverage": coverage
        }
    }
