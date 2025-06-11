const carbonService = require('../services/carbonService');
const cache = require('../cache');
const { Parser } = require('json2csv');

// Ambil 10 data terakhir dengan toleransi 5 menit
exports.getCO2Last10 = async (req, res) => {
  try {
    const { sim_time } = req.query;  // Dapatkan parameter sim_time dari query
    const rows = await carbonService.getLast10CO2(sim_time);  // Panggil service dengan simDateStr
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Simulasi tolerant dengan 5 menit toleransi
exports.getRealtimeSimulatedCO2 = async (req, res) => {
  try {
    // Memanggil service untuk mendapatkan data simulasi CO2
    const rows = await carbonService.getSimulatedCO2();
    
    // Jika tidak ada data yang ditemukan
    if (!rows.length) return res.status(404).json({ error: 'No data found near simulated time' });
    
    // Mengirimkan data yang ditemukan ke klien
    res.json(rows[0]);
  } catch (e) {
    // Menangani error jika terjadi
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
    // Update fields: window_start & co2_mode
    const parser = new Parser({ fields: ['window_start', 'co2_mode'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(
      `carbon_${year || 'all'}-${month || 'all'}-${day || 'all'}_${hour || 'all'}-${minute || 'all'}.csv`
    );
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// downlad by range date
exports.downloadCO2Range = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const data = await carbonService.downloadCO2ByRange(
      start_date,
      end_date
    );
    if (!data.length) return res.status(404).json({ error: 'No data found' });
    // Update fields: window_start & co2_mode
    const parser = new Parser({ fields: ['window_start', 'co2_mode'] });
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
