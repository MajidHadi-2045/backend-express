const moment = require('moment-timezone');  // Mengimpor moment dengan timezone
const { poolEddyKalimantan } = require('../config/database');

// Ambil data berdasarkan perhitungan tanggal sekarang
exports.getLast10CO2 = async (simDateStr = null) => {
  const nowWIB = moment.tz('Asia/Jakarta');  // Waktu sekarang di zona Jakarta

  // Menghitung perbedaan hari antara tanggal 12 Juni 2025 dan 25 April 2025
  const referenceDate = moment('2025-04-25');  // Tanggal referensi (25 April 2025)
  const daysDifference = nowWIB.diff(referenceDate, 'days');  // Hitung perbedaan hari

  // Sesuaikan tanggal yang diambil berdasarkan perbedaan hari
  const simulatedDate = referenceDate.clone().add(daysDifference, 'days');  // Sesuaikan tanggal simulasi
  simulatedDate.set({ hour: nowWIB.hour(), minute: nowWIB.minute(), second: nowWIB.second(), millisecond: nowWIB.millisecond() });

  const startFormatted = simulatedDate.format('YYYY-MM-DD HH:mm:ss');

  // Tentukan tanggal akhir, yaitu 7 Mei 2025
  const endDate = moment('2025-05-07').set({ hour: nowWIB.hour(), minute: nowWIB.minute(), second: nowWIB.second(), millisecond: nowWIB.millisecond() });
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

