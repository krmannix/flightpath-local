// state
let flights = [];
let currentIndex = 0;
let isTransitioning = false;

// dom elements
const flightDisplay = document.getElementById('flightDisplay');
const noFlights = document.getElementById('noFlights');
const error = document.getElementById('error');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const callsign = document.getElementById('callsign');
const route = document.getElementById('route');
const equipment = document.getElementById('equipment');
const indicator = document.getElementById('indicator');

// fetch flights from backend
async function fetchFlights() {
  try {
    const response = await fetch('/api/flights');

    if (!response.ok) {
      throw new Error(`http error: ${response.status}`);
    }

    const data = await response.json();
    flights = data;

    updateDisplay();
    updateStatus('connected');

  } catch (err) {
    console.error('failed to fetch flights:', err);
    updateStatus('error');
    showError();
  }
}

// update display with current flight
function updateDisplay() {
  if (flights.length === 0) {
    showNoFlights();
    return;
  }

  hideAllStates();
  flightDisplay.style.display = 'block';

  const flight = flights[currentIndex];

  callsign.textContent = flight.callsign || 'Unknown';
  route.textContent = `${flight.origin} → ${flight.destination}`;
  equipment.textContent = flight.equipment || 'Unknown';

  if (flights.length > 1) {
    indicator.textContent = `flight ${currentIndex + 1} of ${flights.length}`;
  } else {
    indicator.textContent = '';
  }
}

// rotate to next flight
function showNextFlight() {
  if (flights.length <= 1 || isTransitioning) {
    return;
  }

  isTransitioning = true;

  // fade out current
  const card = document.querySelector('.flight-card');
  card.classList.add('transitioning');

  setTimeout(() => {
    currentIndex = (currentIndex + 1) % flights.length;
    updateDisplay();
    card.classList.remove('transitioning');
    isTransitioning = false;
  }, 300);
}

// show no flights state
function showNoFlights() {
  hideAllStates();
  noFlights.style.display = 'block';
  currentIndex = 0;
}

// show error state
function showError() {
  hideAllStates();
  error.style.display = 'block';
}

// hide all display states
function hideAllStates() {
  flightDisplay.style.display = 'none';
  noFlights.style.display = 'none';
  error.style.display = 'none';
}

// update status indicator
function updateStatus(status) {
  statusDot.className = 'status-dot ' + status;

  const statusMessages = {
    connected: 'connected',
    cached: 'cached data',
    error: 'disconnected'
  };

  statusText.textContent = statusMessages[status] || 'unknown';
}

// initial load
fetchFlights();

// auto-refresh data every 5 seconds
setInterval(fetchFlights, 5000);

// rotate display every 12 seconds
setInterval(showNextFlight, 12000);
