function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateClosestApproach(
  houseLat,
  houseLon,
  aircraftLat,
  aircraftLon,
  heading,
  speedKnots,
) {
  const currentDistance = calculateDistance(
    houseLat,
    houseLon,
    aircraftLat,
    aircraftLon,
  );

  if (speedKnots === null || speedKnots === 0 || heading === null) {
    return {
      currentDistance,
      closestDistance: currentDistance,
      timeToClosest: 0,
      isDirectFlyover: false,
    };
  }

  const speedMph = speedKnots * 1.15078;

  const lat1Rad = toRadians(houseLat);
  const lon1Rad = toRadians(houseLon);
  const lat2Rad = toRadians(aircraftLat);
  const lon2Rad = toRadians(aircraftLon);

  const dLon = lon2Rad - lon1Rad;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearingToHouse = toDegrees(Math.atan2(y, x));
  const normalizedBearingToHouse = (bearingToHouse + 360) % 360;

  const angleDiff = Math.abs(normalizedBearingToHouse - heading);
  const minAngleDiff = Math.min(angleDiff, 360 - angleDiff);

  if (minAngleDiff > 90) {
    return {
      currentDistance,
      closestDistance: currentDistance,
      timeToClosest: 0,
      isDirectFlyover: false,
    };
  }

  const approachAngleRad = toRadians(minAngleDiff);
  const timeToClosestHours =
    (currentDistance / speedMph) * Math.cos(approachAngleRad);
  const closestDistance = currentDistance * Math.sin(approachAngleRad);

  const timeToClosest = Math.max(0, timeToClosestHours * 3600);
  const isDirectFlyover = closestDistance < 0.5;

  return {
    currentDistance,
    closestDistance,
    timeToClosest: Math.round(timeToClosest),
    isDirectFlyover,
  };
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLon = toRadians(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

function bearingToCompass(bearing) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

module.exports = {
  calculateDistance,
  calculateClosestApproach,
  calculateBearing,
  bearingToCompass,
};
