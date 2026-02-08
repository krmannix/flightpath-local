const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const { parseCallsign, getAircraftTypeName } = require('./lib/mappings');
const { calculateClosestApproach } = require('./lib/calculations');
const { lookupFlightInfo } = require('./lib/flightdb');

// configuration
const HOUSE_LAT = parseFloat(process.env.HOUSE_LAT);
const HOUSE_LON = parseFloat(process.env.HOUSE_LON);
const BOUNDING_BOX_MILES = parseFloat(process.env.BOUNDING_BOX_MILES) || 5;
const MAX_ALTITUDE_FEET = parseFloat(process.env.MAX_ALTITUDE_FEET) || 15000;
const POLL_INTERVAL_SECONDS = parseInt(process.env.POLL_INTERVAL_SECONDS) || 60;

// validate configuration
if (isNaN(HOUSE_LAT) || isNaN(HOUSE_LON)) {
  console.error("HOUSE_LAT and HOUSE_LON must be set in .env");
  process.exit(1);
}

// calculate bounding box (simple approximation)
const MILES_TO_DEGREES = 1 / 69; // rough conversion
const boxSize = BOUNDING_BOX_MILES * MILES_TO_DEGREES;

const boundingBox = {
  lamin: HOUSE_LAT - boxSize,
  lomin: HOUSE_LON - boxSize,
  lamax: HOUSE_LAT + boxSize,
  lomax: HOUSE_LON + boxSize,
};

console.log("configuration:", {
  houseLocation: [HOUSE_LAT, HOUSE_LON],
  boundingBox,
  maxAltitudeFeet: MAX_ALTITUDE_FEET,
  pollIntervalSeconds: POLL_INTERVAL_SECONDS,
});

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// in-memory storage
let currentFlights = [];
let lastUpdate = null;
let serverStartTime = new Date();

const axios = require("axios");

// convert feet to meters (opensky uses meters)
const MAX_ALTITUDE_METERS = MAX_ALTITUDE_FEET * 0.3048;

async function fetchOverheadFlights() {
  try {
    console.log('polling adsb exchange api...');

    const distanceNm = BOUNDING_BOX_MILES * 1.15078;
    const url = `https://globe.adsbexchange.com/api/v2/lat/${HOUSE_LAT}/lon/${HOUSE_LON}/dist/${distanceNm}`;

    const response = await axios.get(url, {
      timeout: 10000
    });

    if (!response.data || !response.data.ac) {
      console.log('no flight data from api');
      return;
    }

    const filtered = response.data.ac.filter(aircraft => {
      const altitude = aircraft.alt_baro;
      return altitude !== null && altitude !== 'ground' && altitude < MAX_ALTITUDE_FEET;
    });

    console.log(`found ${filtered.length} flights overhead`);

    const formatted = await Promise.all(filtered.map(formatFlight));
    currentFlights = formatted.filter(f => f !== null);
    lastUpdate = new Date();

  } catch (error) {
    console.error('adsb exchange api error:', error.message);
  }
}

async function formatFlight(aircraft) {
  try {
    const rawCallsign = aircraft.flight || aircraft.r || 'Unknown';
    const { airlineCode, displayCallsign } = parseCallsign(rawCallsign);

    const altitude = aircraft.alt_baro !== 'ground' ? aircraft.alt_baro : null;
    const speed = aircraft.gs || null;
    const heading = aircraft.track || null;
    const lat = aircraft.lat;
    const lon = aircraft.lon;

    if (lat === null || lon === null) {
      return null;
    }

    const approach = calculateClosestApproach(
      HOUSE_LAT,
      HOUSE_LON,
      lat,
      lon,
      heading,
      speed
    );

    let origin = 'Unknown';
    let destination = 'Unknown';

    if (airlineCode && displayCallsign !== rawCallsign) {
      const flightInfo = await lookupFlightInfo(displayCallsign);
      origin = flightInfo.origin;
      destination = flightInfo.destination;
    }

    const aircraftType = getAircraftTypeName(aircraft.t);

    return {
      callsign: displayCallsign,
      airlineCode: airlineCode,
      origin,
      destination,
      equipment: aircraftType,
      latitude: lat,
      longitude: lon,
      altitude,
      speed,
      heading,
      currentDistance: approach.currentDistance,
      closestDistance: approach.closestDistance,
      timeToClosest: approach.timeToClosest,
      isDirectFlyover: approach.isDirectFlyover,
      lastUpdate: Date.now()
    };
  } catch (error) {
    console.error('error formatting flight:', error);
    return null;
  }
}

const cron = require("node-cron");

// poll immediately on startup
fetchOverheadFlights();

// schedule polling
const cronExpression = `*/${POLL_INTERVAL_SECONDS} * * * * *`;
cron.schedule(cronExpression, () => {
  fetchOverheadFlights();
});

console.log(`scheduled polling every ${POLL_INTERVAL_SECONDS} seconds`);

// routes
app.get("/api/flights", (req, res) => {
  res.json(currentFlights);
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor((new Date() - serverStartTime) / 1000),
    lastUpdate: lastUpdate,
    flightCount: currentFlights.length,
  });
});

// start server
app.listen(PORT, () => {
  console.log(`flightpath tracker running on http://localhost:${PORT}`);
});
