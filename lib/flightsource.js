const axios = require("axios");

async function getOverheadFlights(lat, lon, radiusMiles, maxAltitudeFeet) {
  const provider = process.env.FLIGHT_DATA_PROVIDER || "airplanes.live";

  switch (provider) {
    case "airplanes.live":
      return getAirplanesLive(lat, lon, radiusMiles, maxAltitudeFeet);
    case "opensky":
      return getOpenSky(lat, lon, radiusMiles, maxAltitudeFeet);
    case "adsbexchange":
      return getAdsbExchange(lat, lon, radiusMiles, maxAltitudeFeet);
    default:
      throw new Error(`Unknown flight data provider: ${provider}`);
  }
}

async function getAirplanesLive(lat, lon, radiusMiles, maxAltitudeFeet) {
  const radiusNm = radiusMiles * 0.868976;
  const url = `https://api.airplanes.live/v2/point/${lat}/${lon}/${radiusNm}`;

  const response = await axios.get(url, { timeout: 10000 });

  if (!response.data || !response.data.ac) {
    return [];
  }

  return response.data.ac
    .filter((aircraft) => {
      const altitude = aircraft.alt_baro;
      return (
        altitude !== null && altitude !== "ground" && altitude < maxAltitudeFeet
      );
    })
    .map((aircraft) => ({
      flight: aircraft.flight,
      registration: aircraft.r,
      type: aircraft.t,
      lat: aircraft.lat,
      lon: aircraft.lon,
      alt_baro: aircraft.alt_baro,
      gs: aircraft.gs,
      track: aircraft.track,
    }));
}

async function getOpenSky(lat, lon, radiusMiles, maxAltitudeFeet) {
  const MILES_TO_DEGREES = 1 / 69;
  const boxSize = radiusMiles * MILES_TO_DEGREES;

  const boundingBox = {
    lamin: lat - boxSize,
    lomin: lon - boxSize,
    lamax: lat + boxSize,
    lomax: lon + boxSize,
  };

  const response = await axios.get(
    "https://opensky-network.org/api/states/all",
    {
      params: boundingBox,
      timeout: 10000,
    },
  );

  if (!response.data || !response.data.states) {
    return [];
  }

  const maxAltitudeMeters = maxAltitudeFeet * 0.3048;

  return response.data.states
    .filter((state) => {
      const altitude = state[7];
      return altitude !== null && altitude < maxAltitudeMeters;
    })
    .map((state) => ({
      flight: state[1],
      registration: null,
      type: null,
      lat: state[6],
      lon: state[5],
      alt_baro: state[7] ? Math.round(state[7] * 3.28084) : null,
      gs: state[9] ? Math.round(state[9] * 1.94384) : null,
      track: state[10],
    }));
}

async function getAdsbExchange(lat, lon, radiusMiles, maxAltitudeFeet) {
  const distanceNm = radiusMiles * 0.868976;
  const url = `https://globe.adsbexchange.com/api/v2/lat/${lat}/lon/${lon}/dist/${distanceNm}`;

  const response = await axios.get(url, { timeout: 10000 });

  if (!response.data || !response.data.ac) {
    return [];
  }

  return response.data.ac
    .filter((aircraft) => {
      const altitude = aircraft.alt_baro;
      return (
        altitude !== null && altitude !== "ground" && altitude < maxAltitudeFeet
      );
    })
    .map((aircraft) => ({
      flight: aircraft.flight,
      registration: aircraft.r,
      type: aircraft.t,
      lat: aircraft.lat,
      lon: aircraft.lon,
      alt_baro: aircraft.alt_baro,
      gs: aircraft.gs,
      track: aircraft.track,
    }));
}

module.exports = {
  getOverheadFlights,
};
