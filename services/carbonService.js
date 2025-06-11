const { poolEddyKalimantan } = require('../config/database');

// Ambil semua data histori CO2 (hanya timestamp, co2) dengan modus per menit dan toleransi 5 menit
exports.getLast10CO2 = async (simDateStr = null) => {
  const start = '2025-04-01 00:00:00';
  const end   = '2025-04-30 23:59:59';

  let params = [];
  if (simDateStr) {
    const simTimestamp = new Date(simDateStr).getTime() / 1000;
    const windowStartSec = Math.floor(simTimestamp / 60) * 60; // Truncating to minute
    const windowStart = new Date(windowStartSec * 1000).toISOString();
    params.push(windowStart);
  }

  // Fetch the data within the desired timeframe without applying tolerance in SQL
  params.push(start, end);
  let sql = `
    WITH sampled AS (
      SELECT
        date_trunc('minute', timestamp) AS window_start,  // Truncate to minute
        mode() WITHIN GROUP (ORDER BY co2) AS co2_mode
      FROM
        station2s
      WHERE
        timestamp >= $${params.length - 1} AND timestamp <= $${params.length}
      GROUP BY
        window_start
    )
    SELECT *
    FROM sampled
    ORDER BY window_start DESC
    LIMIT 10
  `;
  const { rows } = await poolEddyKalimantan.query(sql, params);

  if (simDateStr) {
    // Filter the data to apply 5-minute tolerance
    const targetTimestamp = new Date(simDateStr).getTime();
    const tolerance = 5 * 60 * 1000; // 5 minutes tolerance in milliseconds

    // Find the closest data points within the 5-minute range
    return rows.filter(row => {
      const rowTimestamp = new Date(row.window_start).getTime();
      return Math.abs(rowTimestamp - targetTimestamp) <= tolerance;
    });
  }

  return rows;
};

// Ambil data simulasi tolerant (hanya timestamp, co2) per menit dengan toleransi 5 menit
exports.getSimulatedCO2 = async (simDateStr, toleranceSec = 300) => {
  const { rows } = await poolEddyKalimantan.query(
    `
    SELECT timestamp, co2, ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) AS diff_s
    FROM microclimate_kalimantan
    WHERE 
      timestamp >= '2025-04-01 00:00:00'
      AND ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) <= $2
    ORDER BY diff_s ASC
    LIMIT 1
    `,
    [simDateStr, toleranceSec]
  );
  // Hilangkan diff_s sebelum return
  return rows.map(({ timestamp, co2 }) => ({
    timestamp, co2
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
exports.downloadCO2 = async (year, month, day, hour, minute, limit = 1000) => {
  // Buat range waktu berdasarkan parameter, default null jika tidak ada
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

  // Query sampling per 5 detik modus
  let sql = `
    SELECT
      date_trunc('second', timestamp) + INTERVAL '1 second' * (FLOOR(EXTRACT(EPOCH FROM timestamp)::int / 5) * 5) AS window_start,
      mode() WITHIN GROUP (ORDER BY co2) AS co2_mode
    FROM
      station2s
    ${sqlWhere}
    GROUP BY
      window_start
    ORDER BY
      window_start ASC
    LIMIT $${params.length + 1}
  `;
  params.push(limit);

  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};

// downlad by range date
exports.downloadCO2ByRange = async (start_date, end_date) => {
  let sql = `
    SELECT
      date_trunc('second', timestamp) + INTERVAL '1 second' * (FLOOR(EXTRACT(EPOCH FROM timestamp)::int / 5) * 5) AS window_start,
      mode() WITHIN GROUP (ORDER BY co2) AS co2_mode
    FROM
      station2s
    WHERE
      timestamp >= $1 AND timestamp <= $2
    GROUP BY
      window_start
    ORDER BY
      window_start ASC
  `;
  const params = [start_date, end_date];
  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};
