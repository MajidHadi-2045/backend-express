// mqttClient.js
require('dotenv').config();
const mqtt = require('mqtt');
const { insertCarbon, insertMicro } = require('./services/carbonService');
const cache = require('./cache');

const mqttCO2 = mqtt.connect(process.env.MQTT_CO2_URL, {
  username: process.env.MQTT_CO2_USER,
  password: process.env.MQTT_CO2_PASSWORD
});
mqttCO2.on('connect', () => {
  mqttCO2.subscribe(process.env.MQTT_CO2_TOPIC);
});
mqttCO2.on('message', async (_, msg) => {
  try {
    const data = JSON.parse(msg.toString());
    const ts = data.timestamp ? new Date(data.timestamp) : new Date();
    cache.latestCarbon = { co2: data.co2, timestamp: ts };
    // Simpan ke tabel baru
    await insertCarbon(ts, data.co2);
  } catch (e) { console.error('MQTT CO2 error:', e); }
});

const mqttMicro = mqtt.connect(process.env.MQTT_CLIMATE_URL, {
  username: process.env.MQTT_CLIMATE_USER,
  password: process.env.MQTT_CLIMATE_PASSWORD
});
mqttMicro.on('connect', () => {
  mqttMicro.subscribe(process.env.MQTT_CLIMATE_TOPIC);
});
mqttMicro.on('message', async (_, msg) => {
  try {
    const data = JSON.parse(msg.toString());
    const ts = data.timestamp ? new Date(data.timestamp) : new Date();
    cache.latestMicro = {
      temperature: data.temperature,
      humidity: data.humidity,
      rainfall: data.rainfall,
      pyrano: data.pyrano,
      timestamp: ts
    };
    // Simpan ke tabel baru
    await insertMicro(ts, data.temperature, data.humidity, data.rainfall, data.pyrano);
  } catch (e) { console.error('MQTT Micro error:', e); }
});
