const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
