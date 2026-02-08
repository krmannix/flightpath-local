const airlineCodes = {
  'AAL': 'AA',
  'DAL': 'DL',
  'UAL': 'UA',
  'SWA': 'WN',
  'JBU': 'B6',
  'ASA': 'AS',
  'NKS': 'NK',
  'FFT': 'F9',
  'BAW': 'BA',
  'DLH': 'LH',
  'AFR': 'AF',
  'KLM': 'KL',
  'IBE': 'IB',
  'AZA': 'AZ',
  'ANA': 'NH',
  'JAL': 'JL',
  'SIA': 'SQ',
  'CPA': 'CX',
  'QFA': 'QF',
  'UAE': 'EK',
  'QTR': 'QR',
  'ETD': 'EY',
  'ACA': 'AC',
  'WJA': 'WS',
  'AMX': 'AM',
  'LAN': 'LA',
  'AVA': 'AV'
};

const aircraftTypes = {
  'B738': 'Boeing 737-800',
  'B737': 'Boeing 737',
  'B739': 'Boeing 737-900',
  'B38M': 'Boeing 737 MAX 8',
  'B39M': 'Boeing 737 MAX 9',
  'B77W': 'Boeing 777-300ER',
  'B772': 'Boeing 777-200',
  'B773': 'Boeing 777-300',
  'B788': 'Boeing 787-8',
  'B789': 'Boeing 787-9',
  'B78X': 'Boeing 787-10',
  'B763': 'Boeing 767-300',
  'B764': 'Boeing 767-400',
  'A320': 'Airbus A320',
  'A321': 'Airbus A321',
  'A319': 'Airbus A319',
  'A20N': 'Airbus A320neo',
  'A21N': 'Airbus A321neo',
  'A339': 'Airbus A330-900neo',
  'A333': 'Airbus A330-300',
  'A332': 'Airbus A330-200',
  'A359': 'Airbus A350-900',
  'A35K': 'Airbus A350-1000',
  'A388': 'Airbus A380-800',
  'E75L': 'Embraer E175',
  'E170': 'Embraer E170',
  'E190': 'Embraer E190',
  'CRJ9': 'Bombardier CRJ-900',
  'CRJ7': 'Bombardier CRJ-700',
  'DH8D': 'Bombardier Dash 8 Q400'
};

function getIataAirlineCode(icaoCode) {
  return airlineCodes[icaoCode] || null;
}

function getAircraftTypeName(icaoType) {
  return aircraftTypes[icaoType] || icaoType || 'Unknown';
}

function parseCallsign(callsign) {
  if (!callsign || callsign === 'Unknown') {
    return { airlineCode: null, flightNumber: null, displayCallsign: callsign };
  }

  const trimmed = callsign.trim();
  const icaoMatch = trimmed.match(/^([A-Z]{3})(\d+[A-Z]?)$/);

  if (icaoMatch) {
    const icaoCode = icaoMatch[1];
    const flightNumber = icaoMatch[2];
    const iataCode = getIataAirlineCode(icaoCode);

    if (iataCode) {
      return {
        airlineCode: iataCode,
        flightNumber: flightNumber,
        displayCallsign: `${iataCode} ${flightNumber}`
      };
    }
  }

  return { airlineCode: null, flightNumber: null, displayCallsign: trimmed };
}

module.exports = {
  getIataAirlineCode,
  getAircraftTypeName,
  parseCallsign
};
