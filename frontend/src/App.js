import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [currentView, setCurrentView] = useState('seasons');
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasonDetails, setSeasonDetails] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [constructors, setConstructors] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [raceDetails, setRaceDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/seasons`);
      setSeasons(response.data.seasons);
    } catch (err) {
      setError('Failed to fetch seasons');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonDetails = async (year) => {
    try {
      setLoading(true);
      const [seasonRes, driversRes, constructorsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/seasons/${year}`),
        axios.get(`${API_BASE_URL}/api/seasons/${year}/drivers`),
        axios.get(`${API_BASE_URL}/api/seasons/${year}/constructors`)
      ]);
      
      setSeasonDetails(seasonRes.data);
      setDrivers(driversRes.data.drivers);
      setConstructors(constructorsRes.data.constructors);
      setSelectedSeason(year);
      setCurrentView('season-detail');
    } catch (err) {
      setError(`Failed to fetch season ${year} details`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRaceDetails = async (year, round) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/races/${year}/${round}`);
      setRaceDetails(response.data);
      setSelectedRace({ year, round });
      setCurrentView('race-detail');
    } catch (err) {
      setError(`Failed to fetch race details for ${year} Round ${round}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderSeasons = () => (
    <div className="seasons-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Formula 1 Race Data</h1>
          <p className="hero-subtitle">Complete F1 data from 2005 to present</p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">{seasons.length}</span>
              <span className="stat-label">Seasons</span>
            </div>
            <div className="stat">
              <span className="stat-number">20+</span>
              <span className="stat-label">Years of Data</span>
            </div>
            <div className="stat">
              <span className="stat-number">400+</span>
              <span className="stat-label">Races</span>
            </div>
          </div>
        </div>
      </div>

      <div className="seasons-grid">
        <h2 className="section-title">Select a Season</h2>
        <div className="grid">
          {seasons.map((season) => (
            <div
              key={season.year}
              className="season-card"
              onClick={() => fetchSeasonDetails(season.year)}
            >
              <div className="season-year">{season.year}</div>
              <div className="season-info">
                <span className={`data-source ${season.data_source}`}>
                  {season.data_source === 'jolpica' ? 'Historical' : 'Modern'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSeasonDetail = () => (
    <div className="season-detail">
      <div className="season-header">
        <button className="back-btn" onClick={() => setCurrentView('seasons')}>
          ← Back to Seasons
        </button>
        <h1 className="season-title">{selectedSeason} F1 Season</h1>
        <div className="season-stats">
          <div className="stat">
            <span className="stat-number">{seasonDetails?.total_races || 0}</span>
            <span className="stat-label">Races</span>
          </div>
          <div className="stat">
            <span className="stat-number">{drivers.length}</span>
            <span className="stat-label">Drivers</span>
          </div>
          <div className="stat">
            <span className="stat-number">{constructors.length}</span>
            <span className="stat-label">Teams</span>
          </div>
        </div>
      </div>

      <div className="season-content">
        <div className="section">
          <h2 className="section-title">Races</h2>
          <div className="races-grid">
            {seasonDetails?.races?.map((race, index) => (
              <div 
                key={index} 
                className="race-card"
                onClick={() => fetchRaceDetails(selectedSeason, race.round || index + 1)}
              >
                <div className="race-round">Round {race.round || index + 1}</div>
                <div className="race-name">
                  {race.raceName || race.meeting_name}
                </div>
                <div className="race-location">
                  {race.Circuit?.Location?.locality || race.location}
                  {race.Circuit?.Location?.country && `, ${race.Circuit.Location.country}`}
                  {race.country_name && `, ${race.country_name}`}
                </div>
                <div className="race-date">
                  {race.date || race.date_start?.split('T')[0]}
                </div>
                <div className="race-action">
                  Click for Results →
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Drivers</h2>
          <div className="drivers-grid">
            {drivers.map((driver, index) => (
              <div key={index} className="driver-card">
                {driver.headshot_url && (
                  <img 
                    src={driver.headshot_url} 
                    alt={driver.full_name || `${driver.givenName} ${driver.familyName}`}
                    className="driver-photo"
                    onError={(e) => {e.target.style.display = 'none'}}
                  />
                )}
                <div className="driver-info">
                  <div className="driver-name">
                    {driver.full_name || `${driver.givenName} ${driver.familyName}`}
                  </div>
                  <div className="driver-details">
                    <span className="driver-number">#{driver.driver_number || driver.permanentNumber}</span>
                    <span className="driver-nationality">
                      {driver.country_code || driver.nationality}
                    </span>
                  </div>
                  {driver.team_name && (
                    <div className="driver-team" style={{color: `#${driver.team_colour}`}}>
                      {driver.team_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Teams</h2>
          <div className="teams-grid">
            {constructors.map((constructor, index) => (
              <div key={index} className="team-card">
                <div className="team-name">
                  {constructor.name}
                </div>
                <div className="team-details">
                  <span className="team-nationality">
                    {constructor.nationality}
                  </span>
                  {constructor.team_colour && (
                    <div 
                      className="team-color"
                      style={{backgroundColor: `#${constructor.team_colour}`}}
                    ></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading F1 data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {currentView === 'seasons' && renderSeasons()}
      {currentView === 'season-detail' && renderSeasonDetail()}
    </div>
  );
}

export default App;