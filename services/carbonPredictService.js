const axios = require('axios');
const { poolEddyKalimantan } = require('../config/database');
const moment = require('moment-timezone');

// 10 data terakhir prediksi CO2 dari tabel co2_predicted_cp
exports.getLast10CO2 = async (simDateStr = null) => {
  const nowWIB = moment.tz('Asia/Jakarta');  // Waktu sekarang di zona Jakarta (WIB)

  // Menghitung perbedaan hari antara tanggal sekarang dan 48 hari yang lalu
  const referenceDate = moment('2025-04-25');  // Tanggal referensi (25 April 2025)
  const daysDifference = nowWIB.diff(referenceDate, 'days') - 48;  // Mengurangi 48 hari dari perhitungan

  // Sesuaikan tanggal yang diambil berdasarkan perbedaan hari yang sudah dikurangi
  const simulatedDate = referenceDate.clone().add(daysDifference, 'days');  // Sesuaikan tanggal simulasi
  simulatedDate.set({ hour: nowWIB.hour(), minute: nowWIB.minute(), second: nowWIB.second(), millisecond: nowWIB.millisecond() });

  const startFormatted = simulatedDate.format('YYYY-MM-DD HH:mm:ss');

  // Tentukan tanggal akhir, yaitu 7 Mei 2025
  const endDate = moment('2025-05-07').set({ hour: nowWIB.hour(), minute: nowWIB.minute(), second: nowWIB.second(), millisecond: nowWIB.millisecond() });
  const endFormatted = endDate.format('YYYY-MM-DD HH:mm:ss');

  let params = [startFormatted, endFormatted];

  // Query untuk mengambil data dari tabel co2_predicted_cp berdasarkan waktu yang disesuaikan
  let sql = `
    SELECT timestamp, co2_pred
    FROM co2_predicted_cp
    WHERE timestamp >= $1 AND timestamp <= $2
    ORDER BY timestamp DESC
    LIMIT 10
  `;

  const { rows } = await poolEddyKalimantan.query(sql, params);

  return rows.map(({ timestamp, co2_pred }) => ({
    timestamp,
    co2: co2_pred  // Mengganti co2 dengan co2_pred
  }));
};

// Fungsi untuk mendapatkan data CO2 berdasarkan waktu simulasi dengan pengurangan 48 hari
exports.getSimulatedCO2 = async (simDateStr, toleranceSec = 300) => {
  const nowWIB = moment.tz('Asia/Jakarta');  // Waktu sekarang di zona Jakarta (WIB)

  // Menghitung perbedaan hari antara tanggal sekarang dan 48 hari yang lalu
  const referenceDate = moment('2025-04-25');  // Tanggal referensi (25 April 2025)
  const daysDifference = nowWIB.diff(referenceDate, 'days') - 48;  // Mengurangi 48 hari dari perhitungan

  // Sesuaikan tanggal yang diambil berdasarkan perbedaan hari yang sudah dikurangi
  const simulatedDate = referenceDate.clone().add(daysDifference, 'days');  // Sesuaikan tanggal simulasi
  simulatedDate.set({ hour: nowWIB.hour(), minute: nowWIB.minute(), second: nowWIB.second(), millisecond: nowWIB.millisecond() });

  const startFormatted = simulatedDate.format('YYYY-MM-DD HH:mm:ss');

  // Query untuk mendapatkan data CO2 dari tabel co2_predicted_cp berdasarkan waktu simulasi
  const { rows } = await poolEddyKalimantan.query(
    `
    SELECT timestamp, co2_pred, ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) AS diff_s
    FROM co2_predicted_cp
    WHERE 
      timestamp >= '2025-04-01 00:00:00'
      AND ABS(EXTRACT(EPOCH FROM (timestamp - $1::timestamp))) <= $2
    ORDER BY diff_s ASC
    LIMIT 1
    `,
    [startFormatted, toleranceSec]
  );
  return rows.map(({ timestamp, co2_pred }) => ({
    timestamp, co2: co2_pred  // Mengganti co2 dengan co2_pred
  }));
};

// Fungsi untuk download data CO2 tanpa pengurangan 48 hari
exports.downloadCO2 = async (year, month, day, hour, minute, limit = 1000, simDateStr) => {
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
      mode() WITHIN GROUP (ORDER BY co2_pred) AS co2_mode
    FROM
      co2_predicted_cp
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

// Fungsi untuk download data CO2 dalam rentang tanggal tanpa pengurangan 48 hari
exports.downloadCO2ByRange = async (start_date, end_date, simDateStr) => {
  let sql = `
    SELECT
      date_trunc('second', timestamp) + INTERVAL '1 second' * (FLOOR(EXTRACT(EPOCH FROM timestamp)::int / 5) * 5) AS window_start,
      mode() WITHIN GROUP (ORDER BY co2_pred) AS co2_mode
    FROM
      co2_predicted_cp
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
