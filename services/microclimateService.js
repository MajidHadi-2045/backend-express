const moment = require('moment-timezone');
const { poolClimate } = require('../config/database');

// 10 data terakhir microclimate bulan April 2025
exports.getLast10Micro = async (simDateStr = null) => {
  // Mengurangi 48 hari dari tanggal sekarang
  const nowWIB = moment.tz('Asia/Jakarta');
  const targetDate = nowWIB.subtract(48, 'days');  // Mengurangi 48 hari dari tanggal sekarang
  const simDate = targetDate.format('YYYY-MM-DD HH:mm:ss');  // Menggunakan waktu lokal setelah pengurangan
  
  const start = '2025-04-01 00:00:00';
  const end   = '2025-04-30 23:59:59';

  let timeFilter = '';
  let params = [start, end];

  if (simDateStr) {
    timeFilter = "AND timestamp <= $3";
    params.push(simDate);
  }

  let sql = `
    SELECT timestamp, rainfall, temperature, pyrano, humidity
    FROM microclimate_kalimantan
    WHERE timestamp >= $1 AND timestamp <= $2 ${timeFilter}
    ORDER BY timestamp DESC
    LIMIT 10
  `;
  const { rows } = await poolClimate.query(sql, params);
  return rows;
};

// Simulasi tolerant (hanya field utama)
exports.getSimulatedMicro = async (simDateStr, toleranceSec = 300) => {
  // Mengurangi 48 hari dari tanggal sekarang
  const nowWIB = moment.tz('Asia/Jakarta');
  const targetDate = nowWIB.subtract(48, 'days');  // Mengurangi 48 hari dari tanggal sekarang
  const simDate = targetDate.format('YYYY-MM-DD HH:mm:ss');  // Menggunakan waktu lokal setelah pengurangan

  const { rows } = await poolClimate.query(
    `
    SELECT timestamp, rainfall, temperature, pyrano, humidity, ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) AS diff_s
    FROM microclimate_kalimantan
    WHERE 
      timestamp >= '2025-04-01 00:00:00'
      AND ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) <= $2
    ORDER BY diff_s ASC
    LIMIT 1
    `,
    [simDate, toleranceSec]
  );
  // Hilangkan diff_s sebelum return
  return rows.map(({ timestamp, rainfall, temperature, pyrano, humidity }) => ({
    timestamp, rainfall, temperature, pyrano, humidity
  }));
};

exports.insertMicro = async (timestamp, temperature, humidity, rainfall, pyrano) => {
  await poolClimate.query(
    `INSERT INTO climate (timestamp, temperature, humidity, rainfall, pyrano)
     VALUES ($1, $2, $3, $4, $5)`,
    [timestamp, temperature, humidity, rainfall, pyrano]
  );
};

// Dowload data
exports.downloadMicro = async (year, month, day, hour, minute, limit = 1000) => {
  let sql = `SELECT timestamp, rainfall, temperature, pyrano, humidity FROM microclimate_kalimantan WHERE 1=1`;
  const params = [];
  if (year)   { sql += ` AND EXTRACT(YEAR FROM timestamp) = $${params.length + 1}`; params.push(year); }
  if (month)  { sql += ` AND EXTRACT(MONTH FROM timestamp) = $${params.length + 1}`; params.push(month); }
  if (day)    { sql += ` AND EXTRACT(DAY FROM timestamp) = $${params.length + 1}`; params.push(day); }
  if (hour)   { sql += ` AND EXTRACT(HOUR FROM timestamp) = $${params.length + 1}`; params.push(hour); }
  if (minute) { sql += ` AND EXTRACT(MINUTE FROM timestamp) = $${params.length + 1}`; params.push(minute); }
  sql += ` ORDER BY timestamp ASC LIMIT $${params.length + 1}`;
  params.push(limit);
  const { rows } = await poolClimate.query(sql, params);
  return rows;
};

// downlad by range date
exports.downloadMicroByRange = async (start_date, end_date) => {
  let sql = `SELECT timestamp, rainfall, temperature, pyrano, humidity FROM microclimate_kalimantan WHERE 1=1`;
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
  const { rows } = await poolClimate.query(sql, params);
  return rows;
};
