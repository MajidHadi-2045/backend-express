const { poolEddyKalimantan } = require('../config/database');

// Ambil semua data histori CO2 (hanya timestamp, co2)
// 10 data terakhir CO2 bulan April 2025
exports.getLast10CO2 = async () => {
  const start = '2025-04-01 00:00:00';
  const end   = '2025-04-30 23:59:59';
  const { rows } = await poolEddyKalimantan.query(
    `SELECT timestamp, co2 
     FROM station2s 
     WHERE timestamp >= $1 AND timestamp <= $2 
     ORDER BY timestamp DESC 
     LIMIT 10`,
    [start, end]
  );
  return rows;
};

// Ambil data simulasi tolerant (hanya timestamp, co2)
exports.getSimulatedCO2 = async (simDateStr, toleranceSec = 300) => {
  const { rows } = await poolEddyKalimantan.query(
    `
    SELECT timestamp, co2, ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) AS diff_s
    FROM station2s
    WHERE 
      timestamp >= '2025-04-01 00:00:00'
      AND ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) <= $2
    ORDER BY diff_s ASC
    LIMIT 1
    `,
    [simDateStr, toleranceSec]
  );
  // Hilangkan diff_s sebelum return
  return rows.map(({ timestamp, co2 }) => ({ timestamp, co2 }));
};

exports.insertCarbon = async (timestamp, co2) => {
  await poolEddyKalimantan.query(
    `INSERT INTO station2s (timestamp, co2) VALUES ($1, $2)`,
    [timestamp, co2]
  );
};

// Dowload data
exports.downloadCO2 = async (year, month, day, hour, minute, limit = 1000) => {
  let sql = `SELECT timestamp, co2 FROM station2s WHERE 1=1`;
  const params = [];
  if (year)   { sql += ` AND EXTRACT(YEAR FROM timestamp) = $${params.length + 1}`; params.push(year); }
  if (month)  { sql += ` AND EXTRACT(MONTH FROM timestamp) = $${params.length + 1}`; params.push(month); }
  if (day)    { sql += ` AND EXTRACT(DAY FROM timestamp) = $${params.length + 1}`; params.push(day); }
  if (hour)   { sql += ` AND EXTRACT(HOUR FROM timestamp) = $${params.length + 1}`; params.push(hour); }
  if (minute) { sql += ` AND EXTRACT(MINUTE FROM timestamp) = $${params.length + 1}`; params.push(minute); }
  sql += ` ORDER BY timestamp ASC LIMIT $${params.length + 1}`;
  params.push(limit);
  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};
