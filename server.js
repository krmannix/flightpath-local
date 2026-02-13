const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { parseCallsign, getAircraftTypeName } = require("./lib/mappings");
const { calculateClosestApproach } = require("./lib/calculations");
const { lookupFlightInfo } = require("./lib/flightdb");
const { getOverheadFlights } = require("./lib/flightsource");

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

console.log("configuration:", {
  houseLocation: [HOUSE_LAT, HOUSE_LON],
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

async function fetchOverheadFlights() {
  try {
    const provider = process.env.FLIGHT_DATA_PROVIDER || "airplanes.live";
    console.log(`polling ${provider} api...`);

    const aircraft = await getOverheadFlights(
      HOUSE_LAT,
      HOUSE_LON,
      BOUNDING_BOX_MILES,
      MAX_ALTITUDE_FEET,
    );

    console.log(`found ${aircraft.length} flights overhead`);

    const formatted = await Promise.all(aircraft.map(formatFlight));
    currentFlights = formatted.filter((f) => f !== null);
    lastUpdate = new Date();
  } catch (error) {
    console.error("flight data api error:", error.message);
  }
}

async function formatFlight(aircraft) {
  try {
    const rawCallsign = aircraft.flight || aircraft.registration || "Unknown";
    const { airlineCode, displayCallsign } = parseCallsign(rawCallsign);

    const altitude = aircraft.alt_baro;
    const speed = aircraft.gs;
    const heading = aircraft.track;
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
      speed,
    );

    let origin = "Unknown";
    let destination = "Unknown";

    if (airlineCode && displayCallsign !== rawCallsign) {
      const flightInfo = await lookupFlightInfo(displayCallsign);
      origin = flightInfo.origin;
      destination = flightInfo.destination;
    }

    const aircraftType = getAircraftTypeName(aircraft.type);

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
      lastUpdate: Date.now(),
    };
  } catch (error) {
    console.error("error formatting flight:", error);
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
