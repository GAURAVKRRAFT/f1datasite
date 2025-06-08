from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from typing import List, Dict, Optional
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client["f1_database"]

app = FastAPI(title="F1 Race Data API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API URLs
JOLPICA_BASE_URL = "https://api.jolpi.ca/ergast/f1"
OPENF1_BASE_URL = "https://api.openf1.org/v1"

@app.get("/")
async def root():
    return {"message": "F1 Race Data API", "status": "active"}

@app.get("/api/seasons")
async def get_seasons():
    """Get all available F1 seasons from 2005 to current"""
    try:
        seasons = []
        current_year = datetime.now().year
        
        # Add seasons from 2005 to current
        for year in range(2005, current_year + 1):
            seasons.append({
                "year": year,
                "data_source": "jolpica" if year <= 2022 else "openf1"
            })
        
        return {
            "seasons": seasons,
            "total": len(seasons)
        }
    except Exception as e:
        logger.error(f"Error getting seasons: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/seasons/{year}")
async def get_season_details(year: int):
    """Get detailed information for a specific season"""
    try:
        if year <= 2022:
            # Use Jolpica API for historical data
            response = requests.get(f"{JOLPICA_BASE_URL}/{year}.json")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Season not found")
            
            data = response.json()
            races = data["MRData"]["RaceTable"]["Races"]
            
            return {
                "year": year,
                "total_races": len(races),
                "races": races,
                "data_source": "jolpica"
            }
        else:
            # Use OpenF1 API for modern data
            response = requests.get(f"{OPENF1_BASE_URL}/meetings?year={year}")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Season not found")
            
            meetings = response.json()
            # Filter out pre-season testing
            races = [m for m in meetings if "Grand Prix" in m.get("meeting_name", "")]
            
            return {
                "year": year,
                "total_races": len(races),
                "races": races,
                "data_source": "openf1"
            }
    except requests.RequestException as e:
        logger.error(f"API request error: {e}")
        raise HTTPException(status_code=500, detail="External API error")
    except Exception as e:
        logger.error(f"Error getting season {year}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/seasons/{year}/drivers")
async def get_season_drivers(year: int):
    """Get all drivers for a specific season"""
    try:
        if year <= 2022:
            # Use Jolpica API
            response = requests.get(f"{JOLPICA_BASE_URL}/{year}/drivers.json")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Drivers not found")
            
            data = response.json()
            drivers = data["MRData"]["DriverTable"]["Drivers"]
            
            return {
                "year": year,
                "drivers": drivers,
                "total": len(drivers),
                "data_source": "jolpica"
            }
        else:
            # Use OpenF1 API - get drivers from first race session
            meetings_response = requests.get(f"{OPENF1_BASE_URL}/meetings?year={year}")
            if meetings_response.status_code != 200:
                raise HTTPException(status_code=404, detail="Season not found")
            
            meetings = meetings_response.json()
            if not meetings:
                return {"year": year, "drivers": [], "total": 0, "data_source": "openf1"}
            
            # Get first race meeting
            first_race = next((m for m in meetings if "Grand Prix" in m.get("meeting_name", "")), None)
            if not first_race:
                return {"year": year, "drivers": [], "total": 0, "data_source": "openf1"}
            
            # Get sessions for first race
            sessions_response = requests.get(f"{OPENF1_BASE_URL}/sessions?meeting_key={first_race['meeting_key']}&session_name=Race")
            if sessions_response.status_code != 200:
                return {"year": year, "drivers": [], "total": 0, "data_source": "openf1"}
            
            sessions = sessions_response.json()
            if not sessions:
                return {"year": year, "drivers": [], "total": 0, "data_source": "openf1"}
            
            # Get drivers from first race session
            drivers_response = requests.get(f"{OPENF1_BASE_URL}/drivers?session_key={sessions[0]['session_key']}")
            if drivers_response.status_code != 200:
                return {"year": year, "drivers": [], "total": 0, "data_source": "openf1"}
            
            drivers = drivers_response.json()
            
            return {
                "year": year,
                "drivers": drivers,
                "total": len(drivers),
                "data_source": "openf1"
            }
    except requests.RequestException as e:
        logger.error(f"API request error: {e}")
        raise HTTPException(status_code=500, detail="External API error")
    except Exception as e:
        logger.error(f"Error getting drivers for {year}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/seasons/{year}/constructors")
async def get_season_constructors(year: int):
    """Get all constructors/teams for a specific season"""
    try:
        if year <= 2022:
            # Use Jolpica API
            response = requests.get(f"{JOLPICA_BASE_URL}/{year}/constructors.json")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Constructors not found")
            
            data = response.json()
            constructors = data["MRData"]["ConstructorTable"]["Constructors"]
            
            return {
                "year": year,
                "constructors": constructors,
                "total": len(constructors),
                "data_source": "jolpica"
            }
        else:
            # Use OpenF1 API - extract teams from drivers
            drivers_data = await get_season_drivers(year)
            teams = {}
            
            for driver in drivers_data["drivers"]:
                team_name = driver.get("team_name")
                team_colour = driver.get("team_colour")
                if team_name and team_name not in teams:
                    teams[team_name] = {
                        "constructorId": team_name.lower().replace(" ", "_"),
                        "name": team_name,
                        "nationality": "Unknown",  # OpenF1 doesn't provide team nationality
                        "team_colour": team_colour
                    }
            
            return {
                "year": year,
                "constructors": list(teams.values()),
                "total": len(teams),
                "data_source": "openf1"
            }
    except requests.RequestException as e:
        logger.error(f"API request error: {e}")
        raise HTTPException(status_code=500, detail="External API error")
    except Exception as e:
        logger.error(f"Error getting constructors for {year}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/seasons/{year}/standings/drivers")
async def get_driver_standings(year: int):
    """Get driver championship standings for a season"""
    try:
        if year <= 2022:
            # Use Jolpica API
            response = requests.get(f"{JOLPICA_BASE_URL}/{year}/driverStandings.json")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Standings not found")
            
            data = response.json()
            standings = data["MRData"]["StandingsTable"]["StandingsLists"]
            
            return {
                "year": year,
                "standings": standings,
                "data_source": "jolpica"
            }
        else:
            # For OpenF1, we would need to calculate standings from race results
            # This is complex, so for now return a placeholder
            return {
                "year": year,
                "standings": [],
                "message": "Standings calculation for modern seasons not yet implemented",
                "data_source": "openf1"
            }
    except requests.RequestException as e:
        logger.error(f"API request error: {e}")
        raise HTTPException(status_code=500, detail="External API error")
    except Exception as e:
        logger.error(f"Error getting driver standings for {year}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/races/{year}/{round}")
async def get_race_details(year: int, round: int):
    """Get detailed information for a specific race"""
    try:
        if year <= 2022:
            # Use Jolpica API
            response = requests.get(f"{JOLPICA_BASE_URL}/{year}/{round}/results.json")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Race not found")
            
            data = response.json()
            race_data = data["MRData"]["RaceTable"]["Races"]
            
            return {
                "year": year,
                "round": round,
                "race_data": race_data,
                "data_source": "jolpica"
            }
        else:
            # For OpenF1, we need to find the race by meeting key
            meetings_response = requests.get(f"{OPENF1_BASE_URL}/meetings?year={year}")
            if meetings_response.status_code != 200:
                raise HTTPException(status_code=404, detail="Season not found")
            
            meetings = meetings_response.json()
            races = [m for m in meetings if "Grand Prix" in m.get("meeting_name", "")]
            
            if round > len(races) or round < 1:
                raise HTTPException(status_code=404, detail="Race round not found")
            
            race_meeting = races[round - 1]
            
            # Get race session
            sessions_response = requests.get(f"{OPENF1_BASE_URL}/sessions?meeting_key={race_meeting['meeting_key']}&session_name=Race")
            if sessions_response.status_code != 200:
                raise HTTPException(status_code=404, detail="Race session not found")
            
            sessions = sessions_response.json()
            if not sessions:
                raise HTTPException(status_code=404, detail="Race session not found")
            
            race_session = sessions[0]
            
            # Get race results (positions at end of race)
            positions_response = requests.get(f"{OPENF1_BASE_URL}/position?session_key={race_session['session_key']}")
            drivers_response = requests.get(f"{OPENF1_BASE_URL}/drivers?session_key={race_session['session_key']}")
            
            race_data = {
                "meeting": race_meeting,
                "session": race_session,
                "positions": positions_response.json() if positions_response.status_code == 200 else [],
                "drivers": drivers_response.json() if drivers_response.status_code == 200 else []
            }
            
            return {
                "year": year,
                "round": round,
                "race_data": race_data,
                "data_source": "openf1"
            }
    except requests.RequestException as e:
        logger.error(f"API request error: {e}")
        raise HTTPException(status_code=500, detail="External API error")
    except Exception as e:
        logger.error(f"Error getting race details for {year}/{round}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)