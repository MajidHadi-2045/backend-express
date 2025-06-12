const moment = require('moment');  // Menggunakan moment tanpa timezone
const carbonService = require('../services/carbonService');

// 10 data terakhir berdasarkan waktu simulasi
exports.getCO2Last10 = async (req, res) => {
  try {
    // Mengurangi 48 hari untuk mendapatkan tanggal yang tepat
    const now = moment();  // Waktu lokal saat ini
    const targetDate = now.subtract(48, 'days');  // Mengurangi 48 hari dari tanggal sekarang
    const simDateStr = targetDate.format('YYYY-MM-DD HH:mm:ss');  // Menggunakan waktu lokal saat ini setelah pengurangan

    const rows = await carbonService.getLast10CO2(simDateStr);  // Panggil service dengan simDateStr
    
    // Jika tidak ada data, kirim response kosong
    if (rows.length === 0) {
      return res.status(404).json({});  // Mengembalikan objek kosong jika tidak ada data
    }

    // Mengembalikan data dalam format yang sesuai
    res.json(rows);  // Mengembalikan data yang ditemukan tanpa "data" atau objek pembungkus lainnya
  } catch (e) {
    console.error("Error in getCO2Last10:", e.message);  // Debug: Log error
    res.status(500).json({ error: e.message });
  }
};

exports.getRealtimeSimulatedCO2 = async (req, res) => {
  try {
    // Mengurangi 48 hari untuk mendapatkan tanggal yang tepat
    const now = moment();  // Waktu lokal saat ini
    const targetDate = now.subtract(48, 'days');  // Mengurangi 48 hari dari tanggal sekarang
    const simDateStr = targetDate.format('YYYY-MM-DD HH:mm:ss');  // Menggunakan waktu lokal saat ini setelah pengurangan

    const toleranceSec = 300;  // Toleransi 5 menit
    const rows = await carbonService.getSimulatedCO2(simDateStr, toleranceSec);
    if (!rows.length) {
      return res.status(404).json({ error: 'No data found near simulated time' });
    }
    
    res.json(rows[0]);
  } catch (e) {
    console.error("Error in getRealtimeSimulatedCO2:", e.message);  // Debug: Log error
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

// Dowload data CO2 berdasarkan parameter tanggal
exports.downloadCO2 = async (req, res) => {
  try {
    const { year, month, day, hour, minute } = req.query;
    const limit = parseInt(req.query.limit, 10) || 1000;
    const data = await carbonService.downloadCO2(year, month, day, hour, minute, limit);
    if (!data.length) return res.status(404).json({ error: 'No data found' });
    const parser = new Parser({ fields: ['window_start', 'co2_mode'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`carbon_${year || 'all'}-${month || 'all'}-${day || 'all'}_${hour || 'all'}-${minute || 'all'}.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Download data CO2 berdasarkan rentang tanggal
exports.downloadCO2Range = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const data = await carbonService.downloadCO2ByRange(start_date, end_date);
    if (!data.length) return res.status(404).json({ error: 'No data found' });
    const parser = new Parser({ fields: ['window_start', 'co2_mode'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`carbon_${start_date || 'all'}_to_${end_date || 'all'}.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
