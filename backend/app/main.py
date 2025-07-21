from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict
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

    # Normalize metrics
    ndvi_norm = 1 - (ndvi - 0.1) / (0.9 - 0.1) if ndvi is not None else 0.5
    elev_norm = 1 - min(elevation, 2000) / 2000 if elevation is not None else 0.5
    weather_norm = min(weather, 10) / 10 if weather is not None else 0.5

    # Weighted risk score
    risk_score = 0.5 * ndvi_norm + 0.3 * elev_norm + 0.2 * weather_norm
    risk_score = min(max(risk_score, 0), 1)

    # Premium calculation
    base_rate = 100  # $/hectare
    area_ha = polygon_area_ha(req.polygon)
    premium = base_rate * risk_score * area_ha

    return {
        "risk_score": round(risk_score, 3),
        "premium": round(premium, 2),
        "report": {
            "NDVI": ndvi,
            "Elevation_m": elevation,
            "Weather_value": weather,
            "Area_ha": round(area_ha, 2)
        }
    }
