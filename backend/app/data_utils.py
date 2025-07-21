import numpy as np
import pandas as pd
from shapely.geometry import shape, Point
import os

# Always resolve paths relative to the project root
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
NDVI_CSV_PATH = os.path.join(BASE_DIR, 'backend', 'data', 'ndvi.csv')
ELEVATION_CSV_PATH = os.path.join(BASE_DIR, 'backend', 'data', 'elevation.csv')
WEATHER_CSV_PATH = os.path.join(BASE_DIR, 'backend', 'data', 'weather.csv')


def get_ndvi_stats(geojson_polygon):
    poly = shape(geojson_polygon['geometry'])
    df = pd.read_csv(NDVI_CSV_PATH)
    points = df.apply(lambda row: poly.contains(Point(row['lon'], row['lat'])), axis=1)
    values = df[points]['ndvi']
    if not values.empty:
        return float(values.mean())
    # Fallback: nearest neighbor
    centroid = poly.centroid
    df['dist'] = df.apply(lambda row: centroid.distance(Point(row['lon'], row['lat'])), axis=1)
    nearest_value = df.loc[df['dist'].idxmin()]['ndvi']
    return float(nearest_value)

def get_elevation_stats(geojson_polygon):
    poly = shape(geojson_polygon['geometry'])
    df = pd.read_csv(ELEVATION_CSV_PATH)
    points = df.apply(lambda row: poly.contains(Point(row['lon'], row['lat'])), axis=1)
    values = df[points]['elevation']
    if not values.empty:
        return float(values.mean())
    # Fallback: nearest neighbor
    centroid = poly.centroid
    df['dist'] = df.apply(lambda row: centroid.distance(Point(row['lon'], row['lat'])), axis=1)
    nearest_value = df.loc[df['dist'].idxmin()]['elevation']
    return float(nearest_value)

def get_weather_stats(geojson_polygon):
    poly = shape(geojson_polygon['geometry'])
    df = pd.read_csv(WEATHER_CSV_PATH)
    points = df.apply(lambda row: poly.contains(Point(row['lon'], row['lat'])), axis=1)
    values = df[points]['value']
    if not values.empty:
        return float(values.mean())
    # Fallback: nearest neighbor
    centroid = poly.centroid
    df['dist'] = df.apply(lambda row: centroid.distance(Point(row['lon'], row['lat'])), axis=1)
    nearest_value = df.loc[df['dist'].idxmin()]['value']
    return float(nearest_value) 