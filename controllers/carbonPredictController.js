const carbonPredictService = require('../services/carbonPredictService');
const moment = require('moment-timezone');

// 10 data terakhir berdasarkan waktu simulasi dengan pengurangan 48 hari
exports.getCO2Last10 = async (req, res) => {
  try {
    const { sim_time } = req.query;  // Dapatkan parameter sim_time dari query
    const response = await carbonPredictService.getLast10CO2(sim_time);  // Panggil service dengan simDateStr
    
    // Jika tidak ada data, kirim response kosong
    if (response.length === 0) {
      return res.status(404).json({});  // Mengembalikan objek kosong jika tidak ada data
    }

    // Mengembalikan data dalam format yang sesuai
    res.json(response);  // Mengembalikan data yang ditemukan tanpa "data" atau objek pembungkus lainnya
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Simulasi data CO2 berdasarkan waktu simulasi dengan pengurangan 48 hari
exports.getSimulatedCO2 = async (req, res) => {
  try {
    const { sim_time } = req.query;  // Dapatkan parameter sim_time dari query
    const response = await carbonPredictService.getSimulatedCO2(sim_time);  // Panggil service dengan simDateStr
    
    // Jika tidak ada data, kirim response kosong
    if (response.length === 0) {
      return res.status(404).json({});  // Mengembalikan objek kosong jika tidak ada data
    }

    // Mengembalikan data simulasi yang ditemukan
    res.json(response[0]);  // Mengembalikan data simulasi tanpa simulatedDate
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Prediksi live dari Python
exports.getLivePrediction = async (req, res) => {
  try {
    const result = await carbonPredictService.getLivePrediction();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Download
exports.downloadPredict = async (req, res) => {
  try {
    const { year, month, day, hour, minute } = req.query;
    const limit = parseInt(req.query.limit, 10) || 1000;
    const data = await carbonPredictService.downloadPredict(year, month, day, hour, minute, limit);
    if (!data.length) return res.status(404).json({ error: 'No data found' });
    const parser = new Parser({ fields: ['timestamp', 'co2_pred'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`carbonpredict_${year || 'all'}-${month || 'all'}-${day || 'all'}_${hour || 'all'}-${minute || 'all'}.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Download by range date
exports.downloadPredictRange = async (req, res) => {
  try {
    const { start_date, end_date, limit } = req.query;
    const data = await carbonPredictService.downloadPredictByRange(
      start_date,
      end_date,
      limit ? parseInt(limit) : undefined
    );
    if (!data.length) return res.status(404).json({ error: 'No data found' });
    const parser = new Parser({ fields: ['timestamp', 'co2_pred'] });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(
      `carbonpredict_${start_date || 'all'}_to_${end_date || 'all'}.csv`
    );
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
