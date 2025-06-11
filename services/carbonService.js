const moment = require('moment-timezone');  // Mengimpor moment dengan timezone
const { poolEddyKalimantan } = require('../config/database');

// Ambil 10 data terakhir CO2 berdasarkan tanggal yang disesuaikan
exports.getLast10CO2 = async (simDateStr = null) => {
  const nowWIB = moment.tz('Asia/Jakarta');  // Waktu sekarang di zona Jakarta

  // Ambil waktu sekarang, ganti bulan menjadi April dan tahun menjadi 2025
  const simulatedDate = nowWIB.clone().year(2025).month(3).date(25);  // Set ke 25 April 2025
  simulatedDate.set({ hour: nowWIB.hour(), minute: nowWIB.minute(), second: nowWIB.second(), millisecond: nowWIB.millisecond() });

  const startFormatted = simulatedDate.format('YYYY-MM-DD HH:mm:ss');

  // Tentukan tanggal akhir
  const endDate = nowWIB.clone().year(2025).month(4).date(7);  // Set ke 7 Mei 2025
  endDate.set({ hour: nowWIB.hour(), minute: nowWIB.minute(), second: nowWIB.second(), millisecond: nowWIB.millisecond() });

  const endFormatted = endDate.format('YYYY-MM-DD HH:mm:ss');

  let params = [startFormatted, endFormatted];

  // Query untuk mengambil data berdasarkan waktu yang disesuaikan
  let sql = `
    WITH sampled AS (
      SELECT
        date_trunc('minute', timestamp) AS window_start,  // Truncate to minute
        mode() WITHIN GROUP (ORDER BY co2) AS co2_mode
      FROM
        co2_backend
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

// Simulasi tolerant (hanya timestamp, co2) per menit dengan toleransi 5 menit
exports.getSimulatedCO2 = async (simDateStr, toleranceSec = 300) => {
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
  // Hilangkan diff_s sebelum return
  return rows.map(({ timestamp, co2 }) => ({
    timestamp, co2
  }));
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

  // Query untuk mengambil data dengan sampling per 5 detik modus
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

  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};

// Download by range date
exports.downloadCO2ByRange = async (start_date, end_date) => {
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
  const { rows } = await poolEddyKalimantan.query(sql, params);
  return rows;
};
