const carbonPredictService = require('../services/carbonPredictService');
const moment = require('moment-timezone');
const { Parser } = require('json2csv');

// 10 data terakhir prediksi CO2
exports.getPredictLast10 = async (req, res) => {
  try {
    const rows = await carbonPredictService.getLast10Predict();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Simulasi tolerant
exports.getRealtimeSimulatedPredict = async (req, res) => {
  try {
    const nowWIB = moment.tz('Asia/Jakarta');
    const simDateWIB = nowWIB.clone().month(3).year(2025);
    const simDateUTC = simDateWIB.clone().tz('UTC');
    const simDateStr = simDateUTC.format('YYYY-MM-DD HH:mm:ss');
    const toleranceSec = 300;
    const rows = await carbonPredictService.getSimulatedPredict(simDateStr, toleranceSec);
    if (!rows.length) return res.status(404).json({ error: 'No data found near simulated time' });
    res.json(rows[0]);
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

// download
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
