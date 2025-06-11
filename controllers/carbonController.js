const moment = require('moment');  // Menggunakan moment tanpa timezone
const carbonService = require('../services/carbonService');

exports.getCO2Last10 = async (req, res) => {
  try {
    const { sim_time } = req.query;  // Dapatkan parameter sim_time dari query
    console.log("Simulated Time Received:", sim_time);  // Debug: Log parameter sim_time
    
    // Mengurangi 48 hari untuk mendapatkan tanggal yang tepat
    const now = moment();  // Waktu lokal saat ini
    const targetDate = now.subtract(48, 'days');  // Mengurangi 48 hari dari tanggal sekarang
    const simDateStr = targetDate.format('YYYY-MM-DD HH:mm:ss');  // Menggunakan waktu lokal saat ini setelah pengurangan
    
    const response = await carbonService.getLast10CO2(simDateStr);  // Panggil service dengan simDateStr
    console.log("Response from carbonService.getLast10CO2:", response);  // Debug: Log hasil response
    
    res.json({
      data: response.data,
      simulatedDate: response.simulatedDate // Mengembalikan tanggal simulasi yang diambil
    });
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

    console.log("Simulated Date:", simDateStr);  // Debug: Log simulated date

    const toleranceSec = 300;  // Toleransi 5 menit
    const rows = await carbonService.getSimulatedCO2(simDateStr, toleranceSec);
    if (!rows.length) {
      console.log("No data found near simulated time");  // Debug: Log jika tidak ada data ditemukan
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
    console.log("No latest carbon data in cache");  // Debug: Log jika tidak ada data stream CO2
    return res.status(404).json({ error: 'Belum ada data stream CO2' });
  }
  res.json(cache.latestCarbon);
};

// Download data
exports.downloadCO2 = async (req, res) => {
  try {
    const { year, month, day, hour, minute } = req.query;
    const limit = parseInt(req.query.limit, 10) || 1000;
    console.log(`Downloading CO2 data for: ${year}-${month}-${day} ${hour}:${minute}, Limit: ${limit}`);  // Debug: Log parameter download
    
    // Mengurangi 48 hari untuk mendapatkan tanggal yang tepat
    const now = moment();  // Waktu lokal saat ini
    const targetDate = now.subtract(48, 'days');  // Mengurangi 48 hari dari tanggal sekarang
    const simDateStr = targetDate.format('YYYY-MM-DD HH:mm:ss');  // Menggunakan waktu lokal saat ini setelah pengurangan
    
    const data = await carbonService.downloadCO2(year, month, day, hour, minute, limit, simDateStr);
    if (!data.length) {
      console.log("No data found for download");  // Debug: Log jika tidak ada data ditemukan
      return res.status(404).json({ error: 'No data found' });
    }
    
    const parser = new Parser({ fields: ['window_start', 'co2_mode'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`carbon_${year || 'all'}-${month || 'all'}-${day || 'all'}_${hour || 'all'}-${minute || 'all'}.csv`);
    res.send(csv);
  } catch (e) {
    console.error("Error in downloadCO2:", e.message);  // Debug: Log error
    res.status(500).json({ error: e.message });
  }
};

// Download by range date
exports.downloadCO2Range = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    console.log(`Downloading CO2 data between ${start_date} and ${end_date}`);  // Debug: Log parameter range download
    
    // Mengurangi 48 hari untuk mendapatkan tanggal yang tepat
    const now = moment();  // Waktu lokal saat ini
    const targetDate = now.subtract(48, 'days');  // Mengurangi 48 hari dari tanggal sekarang
    const simDateStr = targetDate.format('YYYY-MM-DD HH:mm:ss');  // Menggunakan waktu lokal saat ini setelah pengurangan
    
    const data = await carbonService.downloadCO2ByRange(start_date, end_date, simDateStr);
    if (!data.length) {
      console.log("No data found for download range");  // Debug: Log jika tidak ada data ditemukan
      return res.status(404).json({ error: 'No data found' });
    }
    
    const parser = new Parser({ fields: ['window_start', 'co2_mode'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`carbon_${start_date || 'all'}_to_${end_date || 'all'}.csv`);
    res.send(csv);
  } catch (e) {
    console.error("Error in downloadCO2Range:", e.message);  // Debug: Log error
    res.status(500).json({ error: e.message });
  }
};
