const moment = require('moment');  // Mengimpor moment tanpa timezone
const { poolEddyKalimantan } = require('../config/database');

// Ambil data berdasarkan perhitungan tanggal sekarang dengan waktu lokal (tanpa timezone)
exports.getSimulatedCO2 = async (simDateStr, toleranceSec = 300) => {
  console.log("Getting simulated CO2 data for:", simDateStr);  // Debug: Log simulated date
  
  const { rows } = await poolEddyKalimantan.query(
    `
    SELECT timestamp, co2, ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) AS diff_s
    FROM co2_backend
    WHERE 
      timestamp >= '2025-04-01 00:00:00'
      AND ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) <= $2
    ORDER BY diff_s ASC
    LIMIT 1
    `,
    [simDateStr, toleranceSec]
  );

  console.log("Rows returned from query:", rows);  // Debug: Log returned rows
  
  // Hilangkan diff_s sebelum return
  return rows.map(({ timestamp, co2 }) => ({
    timestamp, co2
  }));
};

// Dowload data
exports.downloadCO2 = async (year, month, day, hour, minute, limit = 1000, simDateStr) => {
  // Debug log untuk parameter
  console.log(`Download CO2 data with parameters: year=${year}, month=${month}, day=${day}, hour=${hour}, minute=${minute}, limit=${limit}, simulatedDate=${simDateStr}`);

  let conditions = [];
  let params = [];
  let sqlWhere = "";

  if (year)   { conditions.push(`EXTRACT(YEAR FROM timestamp) = $${params.length + 1}`); params.push(year); }
  if (month)  { conditions.push(`EXTRACT(MONTH FROM timestamp) = $${params.length + 1}`); params.push(month); }
  if (day)    { conditions.push(`EXTRACT(DAY FROM timestamp) = $${params.length + 1}`); params.push(day); }
  if (hour)   { conditions.push(`EXTRACT(HOUR FROM timestamp) = $${params.length + 1}`); params.push(hour); }
  if (minute) { conditions.push(`EXTRACT(MINUTE FROM timestamp) = $${params.length + 1}`); params.push(minute); }
  if (conditions.length > 0) {
    sqlWhere = "WHERE " + conditions.join(" AND ");
  }

  let sql = `
    SELECT
      date_trunc('second', timestamp) + INTERVAL '1 second' * (FLOOR(EXTRACT(EPOCH FROM timestamp)::int / 5) * 5) AS window_start,
      mode() WITHIN GROUP (ORDER BY co2) AS co2_mode
    FROM
      co2_backend
    ${sqlWhere}
    GROUP BY
      window_start
    ORDER BY
      window_start ASC
    LIMIT $${params.length + 1}
  `;
  params.push(limit);

  console.log("SQL Query:", sql);  // Debug: Log SQL query
  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};

// Download by range date
exports.downloadCO2ByRange = async (start_date, end_date, simDateStr) => {
  let sql = `
    SELECT
      date_trunc('second', timestamp) + INTERVAL '1 second' * (FLOOR(EXTRACT(EPOCH FROM timestamp)::int / 5) * 5) AS window_start,
      mode() WITHIN GROUP (ORDER BY co2) AS co2_mode
    FROM
      co2_backend
    WHERE
      timestamp >= $1 AND timestamp <= $2
    GROUP BY
      window_start
    ORDER BY
      window_start ASC
  `;
  const params = [start_date, end_date];
  console.log("SQL Query:", sql);  // Debug: Log SQL query
  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};
