const moment = require('moment-timezone');
const carbonService = require('../services/carbonService');
const cache = require('../cache');
const { Parser } = require('json2csv');

// Ambil 10 data terakhir
exports.getCO2Last10 = async (req, res) => {
  try {
    const rows = await carbonService.getLast10CO2();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Simulasi tolerant
exports.getRealtimeSimulatedCO2 = async (req, res) => {
  try {
    const nowWIB = moment.tz('Asia/Jakarta');
    const simDateWIB = nowWIB.clone().month(3).year(2025);
    const simDateUTC = simDateWIB.clone().tz('UTC');
    const simDateStr = simDateUTC.format('YYYY-MM-DD HH:mm:ss');
    const toleranceSec = 300;
    const rows = await carbonService.getSimulatedCO2(simDateStr, toleranceSec);
    if (!rows.length) return res.status(404).json({ error: 'No data found near simulated time' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Endpoint MQTT stream (realtime)
exports.getCO2Stream = (req, res) => {
  if (!cache.latestCarbon) {
    return res.status(404).json({ error: 'Belum ada data stream CO2' });
  }
  res.json(cache.latestCarbon);
};

// dowload
exports.downloadCO2 = async (req, res) => {
  try {
    const { year, month, day, hour, minute } = req.query;
    const limit = parseInt(req.query.limit, 10) || 1000;
    const data = await carbonService.downloadCO2(year, month, day, hour, minute, limit);
    if (!data.length) return res.status(404).json({ error: 'No data found' });
    const parser = new Parser({ fields: ['timestamp', 'co2'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`carbon_${year || 'all'}-${month || 'all'}-${day || 'all'}_${hour || 'all'}-${minute || 'all'}.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// downlad by range date
exports.downloadCO2Range = async (req, res) => {
  try {
    const { start_date, end_date, limit } = req.query;
    const data = await carbonService.downloadCO2ByRange(
      start_date,
      end_date,
      limit ? parseInt(limit) : undefined
    );
    if (!data.length) return res.status(404).json({ error: 'No data found' });
    const parser = new Parser({ fields: ['timestamp', 'co2'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(
      `carbon_${start_date || 'all'}_to_${end_date || 'all'}.csv`
    );
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
