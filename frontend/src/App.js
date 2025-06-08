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

  const renderRaceDetail = () => {
    if (!raceDetails) return null;

    const isHistorical = raceDetails.data_source === 'jolpica';
    
    // Helper function to format qualifying results
    const formatQualifyingResults = () => {
      if (isHistorical && raceDetails.qualifying_data?.[0]?.QualifyingResults) {
        return raceDetails.qualifying_data[0].QualifyingResults.map((result, index) => ({
          position: result.position,
          driver: `${result.Driver.givenName} ${result.Driver.familyName}`,
          team: result.Constructor.name,
          q1: result.Q1 || 'N/A',
          q2: result.Q2 || 'N/A',
          q3: result.Q3 || 'N/A'
        }));
      } else if (!isHistorical && raceDetails.qualifying_data?.positions) {
        // For modern data, we need to process positions and match with drivers
        const drivers = raceDetails.qualifying_data.drivers || [];
        const positions = raceDetails.qualifying_data.positions || [];
        const laps = raceDetails.qualifying_data.laps || [];
        
        // Group positions by driver and get final qualifying position
        const finalPositions = {};
        positions.forEach(pos => {
          if (!finalPositions[pos.driver_number] || 
              new Date(pos.date) > new Date(finalPositions[pos.driver_number].date)) {
            finalPositions[pos.driver_number] = pos;
          }
        });
        
        // Get best lap times for each driver
        const bestLaps = {};
        laps.forEach(lap => {
          if (lap.lap_duration && (!bestLaps[lap.driver_number] || lap.lap_duration < bestLaps[lap.driver_number])) {
            bestLaps[lap.driver_number] = lap.lap_duration;
          }
        });
        
        return Object.values(finalPositions)
          .sort((a, b) => a.position - b.position)
          .map(pos => {
            const driver = drivers.find(d => d.driver_number === pos.driver_number);
            return {
              position: pos.position,
              driver: driver?.full_name || `Driver ${pos.driver_number}`,
              team: driver?.team_name || 'Unknown',
              bestTime: bestLaps[pos.driver_number] ? `${bestLaps[pos.driver_number].toFixed(3)}s` : 'N/A',
              q1: 'N/A',
              q2: 'N/A',
              q3: 'N/A'
            };
          });
      }
      return [];
    };

    // Helper function to format race results
    const formatRaceResults = () => {
      if (isHistorical && raceDetails.race_data?.[0]?.Results) {
        return raceDetails.race_data[0].Results.map(result => ({
          position: result.position,
          driver: `${result.Driver.givenName} ${result.Driver.familyName}`,
          team: result.Constructor.name,
          laps: result.laps,
          time: result.Time?.time || result.status,
          points: result.points,
          status: result.status
        }));
      } else if (!isHistorical && raceDetails.race_data?.positions) {
        // For modern data, process race results
        const drivers = raceDetails.race_data.drivers || [];
        const positions = raceDetails.race_data.positions || [];
        const laps = raceDetails.race_data.laps || [];
        
        // Get final race positions
        const finalPositions = {};
        positions.forEach(pos => {
          if (!finalPositions[pos.driver_number] || 
              new Date(pos.date) > new Date(finalPositions[pos.driver_number].date)) {
            finalPositions[pos.driver_number] = pos;
          }
        });
        
        // Count laps for each driver
        const lapCounts = {};
        laps.forEach(lap => {
          lapCounts[lap.driver_number] = (lapCounts[lap.driver_number] || 0) + 1;
        });
        
        return Object.values(finalPositions)
          .sort((a, b) => a.position - b.position)
          .map(pos => {
            const driver = drivers.find(d => d.driver_number === pos.driver_number);
            return {
              position: pos.position,
              driver: driver?.full_name || `Driver ${pos.driver_number}`,
              team: driver?.team_name || 'Unknown',
              laps: lapCounts[pos.driver_number] || 0,
              time: 'N/A',
              points: 'N/A',
              status: 'Finished'
            };
          });
      }
      return [];
    };

    const qualifyingResults = formatQualifyingResults();
    const raceResults = formatRaceResults();
    const raceInfo = isHistorical ? raceDetails.race_data?.[0] : raceDetails.race_data?.meeting;

    return (
      <div className="race-detail">
        <div className="race-header">
          <button className="back-btn" onClick={() => setCurrentView('season-detail')}>
            ← Back to {selectedSeason} Season
          </button>
          <h1 className="race-title">
            {raceInfo?.raceName || raceInfo?.meeting_name} {selectedRace?.year}
          </h1>
          <div className="race-info">
            <div className="race-location-detail">
              📍 {raceInfo?.Circuit?.Location?.locality || raceInfo?.location}
              {raceInfo?.Circuit?.Location?.country && `, ${raceInfo.Circuit.Location.country}`}
              {raceInfo?.country_name && `, ${raceInfo.country_name}`}
            </div>
            <div className="race-date-detail">
              📅 {raceInfo?.date || raceInfo?.date_start?.split('T')[0]}
            </div>
            <div className="race-round-detail">
              🏁 Round {selectedRace?.round}
            </div>
          </div>
        </div>

        <div className="results-container">
          {/* Qualifying Results */}
          <div className="results-section">
            <h2 className="results-title">🔥 Qualifying Results</h2>
            {qualifyingResults.length > 0 ? (
              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Driver</th>
                      <th>Team</th>
                      {isHistorical ? (
                        <>
                          <th>Q1</th>
                          <th>Q2</th>
                          <th>Q3</th>
                        </>
                      ) : (
                        <th>Best Time</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {qualifyingResults.map((result, index) => (
                      <tr key={index} className={index < 3 ? 'podium-position' : ''}>
                        <td className="position">{result.position}</td>
                        <td className="driver-name">{result.driver}</td>
                        <td className="team-name">{result.team}</td>
                        {isHistorical ? (
                          <>
                            <td>{result.q1}</td>
                            <td>{result.q2}</td>
                            <td>{result.q3}</td>
                          </>
                        ) : (
                          <td>{result.bestTime}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">Qualifying results not available</div>
            )}
          </div>

          {/* Race Results */}
          <div className="results-section">
            <h2 className="results-title">🏆 Race Results</h2>
            {raceResults.length > 0 ? (
              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Driver</th>
                      <th>Team</th>
                      <th>Laps</th>
                      <th>Time/Status</th>
                      {isHistorical && <th>Points</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {raceResults.map((result, index) => (
                      <tr key={index} className={index < 3 ? 'podium-position' : ''}>
                        <td className="position">
                          {result.position}
                          {index === 0 && <span className="trophy">🥇</span>}
                          {index === 1 && <span className="trophy">🥈</span>}
                          {index === 2 && <span className="trophy">🥉</span>}
                        </td>
                        <td className="driver-name">{result.driver}</td>
                        <td className="team-name">{result.team}</td>
                        <td>{result.laps}</td>
                        <td>{result.time}</td>
                        {isHistorical && <td className="points">{result.points}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">Race results not available</div>
            )}
          </div>
        </div>
      </div>
    );
  };
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