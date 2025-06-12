const moment = require('moment-timezone');
const microclimateService = require('../services/microclimateService');
const { Parser } = require('json2csv');

// 10 data terakhir berdasarkan waktu sekarang
exports.getMicroLast10 = async (req, res) => {
  try {
    // Mengurangi 48 hari untuk mendapatkan tanggal yang tepat
    const now = moment();  // Waktu lokal saat ini
    const targetDate = now.subtract(48, 'days');  // Mengurangi 48 hari dari tanggal sekarang
    const simDateStr = targetDate.format('YYYY-MM-DD HH:mm:ss');  // Menggunakan waktu lokal saat ini setelah pengurangan

    const rows = await microclimateService.getLast10Micro(simDateStr);  // Panggil service dengan simDateStr

    if (rows.length === 0) {
      return res.status(404).json({});  // Mengembalikan objek kosong jika tidak ada data
    }

    // Mengembalikan data dalam format yang sesuai
    res.json(rows.map(row => ({
      timestamp: row.timestamp,
      rainfall: row.rainfall,
      temperature: row.temperature,
      pyrano: row.pyrano,
      humidity: row.humidity
    })));
  } catch (e) {
    console.error("Error in getMicroLast10:", e.message);  // Debug: Log error
    res.status(500).json({ error: e.message });
  }
};

exports.getRealtimeSimulatedMicro = async (req, res) => {
  try {
    // Mengurangi 48 hari untuk mendapatkan tanggal yang tepat
    const now = moment();  // Waktu lokal saat ini
    const targetDate = now.subtract(48, 'days');  // Mengurangi 48 hari dari tanggal sekarang
    const simDateStr = targetDate.format('YYYY-MM-DD HH:mm:ss');  // Menggunakan waktu lokal saat ini setelah pengurangan

    const toleranceSec = 300;  // Toleransi 5 menit
    const rows = await microclimateService.getSimulatedMicro(simDateStr, toleranceSec);

    if (rows.length === 0) {
      return res.status(404).json({});  // Mengembalikan objek kosong jika tidak ada data
    }

    // Mengembalikan data dalam format yang sesuai
    res.json({
      timestamp: rows[0].timestamp,
      rainfall: rows[0].rainfall,
      temperature: rows[0].temperature,
      pyrano: rows[0].pyrano,
      humidity: rows[0].humidity
    });
  } catch (e) {
    console.error("Error in getRealtimeSimulatedMicro:", e.message);  // Debug: Log error
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

// Dowload data
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

// Download by range date
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
