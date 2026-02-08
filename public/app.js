// state
let flights = [];
let currentIndex = 0;
let isTransitioning = false;
let updateInterval = null;

// dom elements
const flightDisplay = document.getElementById("flightDisplay");
const noFlights = document.getElementById("noFlights");
const error = document.getElementById("error");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const callsign = document.getElementById("callsign");
const route = document.getElementById("route");
const equipment = document.getElementById("equipment");
const indicator = document.getElementById("indicator");
const airlineLogo = document.getElementById("airlineLogo");
const metrics = document.getElementById("metrics");
const distance = document.getElementById("distance");
const speed = document.getElementById("speed");
const eta = document.getElementById("eta");

// fetch flights from backend
async function fetchFlights() {
  try {
    const response = await fetch("/api/flights");

    if (!response.ok) {
      throw new Error(`http error: ${response.status}`);
    }

    const data = await response.json();
    flights = data;

    updateDisplay();
    updateStatus("connected");
  } catch (err) {
    console.error("failed to fetch flights:", err);
    updateStatus("error");
    showError();
  }
}

// update display with current flight
function updateDisplay() {
  if (flights.length === 0) {
    showNoFlights();
    stopRealTimeUpdates();
    return;
  }

  hideAllStates();
  flightDisplay.style.display = "block";

  const flight = flights[currentIndex];

  callsign.textContent = flight.callsign || "Unknown";
  route.textContent = `${flight.origin} → ${flight.destination}`;
  equipment.textContent = flight.equipment || "Unknown";

  if (flight.airlineCode) {
    airlineLogo.src = `/logos/${flight.airlineCode}.png`;
    airlineLogo.style.display = "block";
    airlineLogo.onerror = function () {
      this.src = "/logos/fallback.svg";
    };
  } else {
    airlineLogo.style.display = "none";
  }

  if (flight.speed !== null && flight.currentDistance !== null) {
    metrics.style.display = "flex";
    updateMetrics(flight);
    startRealTimeUpdates(flight);
  } else {
    metrics.style.display = "none";
    stopRealTimeUpdates();
  }

  if (flights.length > 1) {
    indicator.textContent = `flight ${currentIndex + 1} of ${flights.length}`;
  } else {
    indicator.textContent = "";
  }
}

function updateMetrics(flight) {
  const secondsSinceUpdate = (Date.now() - flight.lastUpdate) / 1000;

  let currentDist = flight.currentDistance;
  let currentTimeToClosest = flight.timeToClosest;

  if (flight.speed && flight.speed > 0) {
    const distanceTraveledMiles =
      ((flight.speed * 1.15078) / 3600) * secondsSinceUpdate;
    currentDist = Math.max(0, flight.currentDistance - distanceTraveledMiles);
    currentTimeToClosest = Math.max(
      0,
      flight.timeToClosest - secondsSinceUpdate,
    );
  }

  distance.textContent = `${currentDist.toFixed(1)} mi`;
  speed.textContent = `${Math.round(flight.speed)} kts`;

  if (currentTimeToClosest === 0) {
    if (flight.isDirectFlyover) {
      eta.textContent = "Overhead now";
    } else {
      eta.textContent = "Passing";
    }
  } else {
    eta.textContent = formatCountdown(currentTimeToClosest);
  }
}

function formatCountdown(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 300) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const mins = Math.round(seconds / 60);
    return `${mins}m`;
  }
}

function startRealTimeUpdates(flight) {
  stopRealTimeUpdates();
  updateInterval = setInterval(() => {
    if (!isTransitioning) {
      updateMetrics(flight);
    }
  }, 1000);
}

function stopRealTimeUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// rotate to next flight
function showNextFlight() {
  if (flights.length <= 1 || isTransitioning) {
    return;
  }

  isTransitioning = true;
  stopRealTimeUpdates();

  const card = document.querySelector(".flight-card");
  card.classList.add("transitioning");

  setTimeout(() => {
    currentIndex = (currentIndex + 1) % flights.length;
    updateDisplay();
    card.classList.remove("transitioning");
    isTransitioning = false;
  }, 300);
}

// show no flights state
function showNoFlights() {
  hideAllStates();
  noFlights.style.display = "block";
  currentIndex = 0;
}

// show error state
function showError() {
  hideAllStates();
  error.style.display = "block";
}

// hide all display states
function hideAllStates() {
  flightDisplay.style.display = "none";
  noFlights.style.display = "none";
  error.style.display = "none";
}

// update status indicator
function updateStatus(status) {
  statusDot.className = "status-dot " + status;

  const statusMessages = {
    connected: "connected",
    cached: "cached data",
    error: "disconnected",
  };

  statusText.textContent = statusMessages[status] || "unknown";
}

// initial load
fetchFlights();

// auto-refresh data every 5 seconds
setInterval(fetchFlights, 5000);

// rotate display every 6 seconds
setInterval(showNextFlight, 6000);
