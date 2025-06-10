const moment = require('moment-timezone');
const microclimateService = require('../services/microclimateService');
const cache = require('../cache');
const { Parser } = require('json2csv');

// 10 data terakhir
exports.getMicroLast10 = async (req, res) => {
  try {
    // Ambil waktu window simulasi dari query jika ingin benar-benar sinkron
    const { sim_time } = req.query;
    const rows = await microclimateService.getLast10Micro(sim_time);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getRealtimeSimulatedMicro = async (req, res) => {
  try {
    const nowWIB = moment.tz('Asia/Jakarta');
    const simDateWIB = nowWIB.clone().month(3).year(2025);
    const simDateStr = simDateWIB.format('YYYY-MM-DD HH:mm:ss');
    const toleranceSec = 300;

    const rows = await microclimateService.getSimulatedMicro(simDateStr, toleranceSec);
    if (!rows.length) return res.status(404).json({ error: 'No data found near simulated time' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};


// Endpoint MQTT stream (realtime)
exports.getMicroStream = (req, res) => {
  if (!cache.latestMicro) {
    return res.status(404).json({ error: 'Belum ada data stream microclimate' });
  }
  // Hanya ambil field utama dari cache
  const { rainfall, temperature, pyrano, humidity, timestamp } = cache.latestMicro;
  res.json({ rainfall, temperature, pyrano, humidity, timestamp });
};

// dowload
exports.downloadMicro = async (req, res) => {
  try {
    const { year, month, day, hour, minute } = req.query;
    const limit = parseInt(req.query.limit, 10) || 1000;
    const data = await microclimateService.downloadMicro(year, month, day, hour, minute, limit);
    if (!data.length) return res.status(404).json({ error: 'No data found' });
    const parser = new Parser({ fields: ['timestamp', 'rainfall', 'temperature', 'pyrano', 'humidity'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`microclimate_${year || 'all'}-${month || 'all'}-${day || 'all'}_${hour || 'all'}-${minute || 'all'}.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// downlad by range date
exports.downloadMicroRange = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const data = await microclimateService.downloadMicroByRange(
      start_date,
      end_date
    );
    if (!data.length) return res.status(404).json({ error: 'No data found' });
    const parser = new Parser({ fields: ['timestamp', 'rainfall', 'temperature', 'pyrano', 'humidity'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(
      `microclimate_${start_date || 'all'}_to_${end_date || 'all'}.csv`
    );
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
