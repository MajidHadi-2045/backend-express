const { poolEddyKalimantan } = require('../config/database');

// Ambil semua data histori CO2 (hanya timestamp, co2) dengan modus per menit dan toleransi 5 menit
exports.getLast10CO2 = async (simDateStr = null) => {
  const start = '2025-04-01 00:00:00';
  const end   = '2025-04-30 23:59:59';

  let windowFilter = '';
  let params = [];
  if (simDateStr) {
    const simTimestamp = new Date(simDateStr).getTime() / 1000;
    const windowStartSec = Math.floor(simTimestamp / 60) * 60; // Truncating to minute
    const windowStart = new Date(windowStartSec * 1000).toISOString();
    
    // Adding 5 minutes tolerance: +/- 300 seconds (5 minutes)
    windowFilter = `
      AND (timestamp BETWEEN $1 AND ($1::timestamp + INTERVAL '5 minute') 
           OR timestamp BETWEEN ($1::timestamp - INTERVAL '5 minute') AND $1)
    `;
    params.push(windowStart);
  }
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
    WHERE 1=1 ${windowFilter}
    ORDER BY window_start DESC
    LIMIT 10
  `;
  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};

// Ambil data simulasi tolerant (hanya timestamp, co2) per menit dengan toleransi 5 menit
exports.getSimulatedCO2 = async (simDateStr) => {
  const simTimestamp = new Date(simDateStr).getTime() / 1000;
  const windowStartSec = Math.floor(simTimestamp / 60) * 60;  // Truncating to minute
  const windowStart = new Date(windowStartSec * 1000).toISOString();

  // Adding 5 minutes tolerance: +/- 300 seconds (5 minutes)
  const sql = `
    SELECT
      mode() WITHIN GROUP (ORDER BY co2) AS co2_mode,
      MIN(timestamp) as window_start
    FROM
      station2s
    WHERE
      (timestamp BETWEEN $1 AND ($1::timestamp + INTERVAL '5 minute') 
       OR timestamp BETWEEN ($1::timestamp - INTERVAL '5 minute') AND $1)
    GROUP BY
      window_start
  `;
  const { rows } = await poolEddyKalimantan.query(sql, [windowStart]);
  if (!rows.length || rows[0].co2_mode === null) return [];
  return [{
    window_start: windowStart,
    co2_mode: rows[0].co2_mode
  }];
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
