const moment = require('moment-timezone');  // Mengimpor moment dengan timezone
const { poolEddyKalimantan } = require('../config/database');

// Ambil 10 data terakhir CO2 berdasarkan tanggal yang disesuaikan
exports.getLast10CO2 = async (simDateStr = null) => {
  const nowWIB = moment.tz('Asia/Jakarta');  // Waktu sekarang di zona Jakarta

  // Menyesuaikan tanggal sekarang dengan menggeser 13 hari
  const startDate = nowWIB.clone().subtract(13, 'days').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  const endDate = nowWIB.clone().subtract(13, 'days').set({ hour: 23, minute: 59, second: 59, millisecond: 999 });

  // Format tanggal yang sudah disesuaikan (mulai dari 25 April 2025)
  const startFormatted = startDate.format('YYYY-MM-DD HH:mm:ss');
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
