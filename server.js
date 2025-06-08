require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Mulai MQTT subscribe (langsung eksekusi file)
require('./mqttClient');

// Import routes
const carbonRoutes = require('./routes/carbonRoutes');
const microclimateRoutes = require('./routes/microclimateRoutes');
const carbonPredictRoutes = require('./routes/carbonPredictRoutes');

// Mount API
app.use('/api/carbon-predict', carbonPredictRoutes);
app.use('/api/carbon', carbonRoutes);
app.use('/api/microclimate', microclimateRoutes);

// Route root untuk respon default
app.get('/', (req, res) => {
  res.send('Express Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
