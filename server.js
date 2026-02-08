const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// configuration
const HOUSE_LAT = parseFloat(process.env.HOUSE_LAT);
const HOUSE_LON = parseFloat(process.env.HOUSE_LON);
const BOUNDING_BOX_MILES = parseFloat(process.env.BOUNDING_BOX_MILES) || 5;
const MAX_ALTITUDE_FEET = parseFloat(process.env.MAX_ALTITUDE_FEET) || 15000;
const POLL_INTERVAL_SECONDS = parseInt(process.env.POLL_INTERVAL_SECONDS) || 60;

// validate configuration
if (isNaN(HOUSE_LAT) || isNaN(HOUSE_LON)) {
  console.error('HOUSE_LAT and HOUSE_LON must be set in .env');
  process.exit(1);
}

// calculate bounding box (simple approximation)
const MILES_TO_DEGREES = 1 / 69; // rough conversion
const boxSize = BOUNDING_BOX_MILES * MILES_TO_DEGREES;

const boundingBox = {
  lamin: HOUSE_LAT - boxSize,
  lomin: HOUSE_LON - boxSize,
  lamax: HOUSE_LAT + boxSize,
  lomax: HOUSE_LON + boxSize
};

console.log('configuration:', {
  houseLocation: [HOUSE_LAT, HOUSE_LON],
  boundingBox,
  maxAltitudeFeet: MAX_ALTITUDE_FEET,
  pollIntervalSeconds: POLL_INTERVAL_SECONDS
});

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// in-memory storage
let currentFlights = [];
let lastUpdate = null;
let serverStartTime = new Date();

const axios = require('axios');

// convert feet to meters (opensky uses meters)
const MAX_ALTITUDE_METERS = MAX_ALTITUDE_FEET * 0.3048;

async function fetchOverheadFlights() {
  try {
    console.log('polling opensky api...');

    const response = await axios.get('https://opensky-network.org/api/states/all', {
      params: boundingBox,
      timeout: 10000
    });

    if (!response.data || !response.data.states) {
      console.log('no flight data from api');
      return;
    }

    // filter by altitude
    const filtered = response.data.states.filter(state => {
      const altitude = state[7]; // barometric altitude in meters
      return altitude !== null && altitude < MAX_ALTITUDE_METERS;
    });

    console.log(`found ${filtered.length} flights overhead`);

    // format for display
    currentFlights = filtered.map(formatFlight);
    lastUpdate = new Date();

  } catch (error) {
    console.error('opensky api error:', error.message);
    // keep showing last successful data
  }
}

function formatFlight(state) {
  // opensky state vector format:
  // [0] icao24, [1] callsign, [2] origin_country, [5] longitude, [6] latitude,
  // [7] baro_altitude, [9] velocity, [10] true_track, [13] geo_altitude

  const callsign = state[1]?.trim() || 'Unknown';
  const altitude = state[7] ? Math.round(state[7] * 3.28084) : null; // meters to feet

  return {
    callsign,
    origin: 'Unknown', // not available from opensky
    destination: 'Unknown', // not available from opensky
    equipment: 'Unknown', // not available from opensky
    latitude: state[6],
    longitude: state[5],
    altitude,
    velocity: state[9] ? Math.round(state[9] * 1.94384) : null, // m/s to knots
    heading: state[10]
  };
}

const cron = require('node-cron');

// poll immediately on startup
fetchOverheadFlights();

// schedule polling
const cronExpression = `*/${POLL_INTERVAL_SECONDS} * * * * *`;
cron.schedule(cronExpression, () => {
  fetchOverheadFlights();
});

console.log(`scheduled polling every ${POLL_INTERVAL_SECONDS} seconds`);

// routes
app.get('/api/flights', (req, res) => {
  res.json(currentFlights);
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((new Date() - serverStartTime) / 1000),
    lastUpdate: lastUpdate,
    flightCount: currentFlights.length
  });
});

// start server
app.listen(PORT, () => {
  console.log(`flightpath tracker running on http://localhost:${PORT}`);
});
