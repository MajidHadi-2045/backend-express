const axios = require('axios');
const { poolEddyKalimantan } = require('../config/database');

// Live prediction dari backend Python (jika masih dipakai)
exports.getLivePrediction = async () => {
  // Panggil backend python dengan source=db
  const pythonApi = process.env.PYTHON_API_URL + '?source=db';
  const res = await axios.get(pythonApi);
  return res.data;
};
// exports.getLivePrediction = async () => {
//   // Panggil backend python dengan source=mqtt
//   const pythonApi = process.env.PYTHON_API_URL + '?source=mqtt';
//   const res = await axios.get(pythonApi);
//   return res.data;
// };

// 10 data terakhir prediksi CO2 bulan April 2025 =>co2_predicted_cp
// carbonPredictService.js - Modifikasi getLast10Predict
exports.getLast10Predict = async (simDateStr = null) => {
  const start = '2025-04-01 00:00:00';
  const end = '2025-04-30 23:59:59';
  
  let timeFilter = '';
  let params = [start, end];
  
  // Cek jika ada simDateStr yang diberikan
  if (simDateStr) {
    timeFilter = "AND timestamp <= $3";
    params.push(simDateStr);
  }

  const { rows } = await poolEddyKalimantan.query(
    `
    SELECT timestamp, co2 AS co2_pred
    FROM station2s
    WHERE timestamp >= $1 AND timestamp <= $2 ${timeFilter}
    ORDER BY timestamp DESC
    LIMIT 10
    `,
    params
  );

  return rows;
};

// Simulasi tolerant (hanya kolom penting)
exports.getSimulatedPredict = async (simDateStr, toleranceSec = 300) => {
  const { rows } = await poolEddyKalimantan.query(
    `
    SELECT timestamp, co2 AS co2_pred, ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) AS diff_s
    FROM station2s
    WHERE 
      timestamp >= '2025-04-01 00:00:00'
      AND ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) <= $2
    ORDER BY diff_s ASC
    LIMIT 1
    `,
    [simDateStr, toleranceSec]
  );
  // Hilangkan diff_s sebelum return //co2 AS co2_pred
  return rows.map(({ timestamp, co2_pred }) => ({ timestamp, co2_pred }));
};

// dowload data //tabel asli =>co2_predicted_cp 
exports.downloadPredict = async (year, month, day, hour, minute, limit = 1000) => {
  let sql = `SELECT timestamp, co2 AS co2_pred FROM station2s WHERE 1=1`;
  const params = [];
  if (year) { sql += ` AND EXTRACT(YEAR FROM timestamp) = $${params.length + 1}`; params.push(year); }
  if (month) { sql += ` AND EXTRACT(MONTH FROM timestamp) = $${params.length + 1}`; params.push(month); }
  if (day) { sql += ` AND EXTRACT(DAY FROM timestamp) = $${params.length + 1}`; params.push(day); }
  if (hour) { sql += ` AND EXTRACT(HOUR FROM timestamp) = $${params.length + 1}`; params.push(hour); }
  if (minute) { sql += ` AND EXTRACT(MINUTE FROM timestamp) = $${params.length + 1}`; params.push(minute); }
  sql += ` ORDER BY timestamp ASC LIMIT $${params.length + 1}`;
  params.push(limit);
  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};

// downlad by range date
exports.downloadPredictByRange = async (start_date, end_date, limit) => {
  let sql = `SELECT timestamp, co2 AS co2_pred FROM station2s WHERE 1=1`;
  const params = [];
  if (start_date) {
    sql += ` AND timestamp >= $${params.length + 1}`;
    params.push(start_date);
  }
  if (end_date) {
    sql += ` AND timestamp <= $${params.length + 1}`;
    params.push(end_date);
  }
  sql += ` ORDER BY timestamp ASC`;
  if (limit) {
    sql += ` LIMIT $${params.length + 1}`;
    params.push(limit);
  }
  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};
