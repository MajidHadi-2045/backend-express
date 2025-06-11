const { poolEddyKalimantan } = require('../config/database');
const fs = require('fs');
const csv = require('csv-parser');

// Helper function to read CSV files and return data
const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    let data = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Only push the CO2 data (assuming the CO2 column is named 'co2_mode')
        data.push({ co2_mode: row.co2_mode, timestamp: row.timestamp });
      })
      .on('end', () => {
        resolve(data);
      })
      .on('error', reject);
  });
};

// Get the last 10 CO2 records from CSV files
exports.getLast10CO2 = async () => {
  try {
    // Load all CSV files
    const data1_5 = await readCSV('data1_5.csv');
    const data6_11 = await readCSV('data6_11.csv');
    const data11 = await readCSV('data11.csv');
    const data12_15 = await readCSV('data12_15.csv');

    // Combine and sort data by timestamp
    const combinedData = [...data1_5, ...data6_11, ...data11, ...data12_15];
    combinedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Return the last 10 records
    return combinedData.slice(-10);
  } catch (error) {
    console.error('Error retrieving CO2 data:', error);
    throw error;
  }
};

// Simulate CO2 data based on timestamp
exports.getSimulatedCO2 = async (simDateStr) => {
  try {
    // Load all CSV files
    const data1_5 = await readCSV('data1_5.csv');
    const data6_11 = await readCSV('data6_11.csv');
    const data11 = await readCSV('data11.csv');
    const data12_15 = await readCSV('data12_15.csv');

    // Combine all data
    const combinedData = [...data1_5, ...data6_11, ...data11, ...data12_15];

    // Find the closest record to the simulated timestamp
    const simulatedDate = new Date(simDateStr);
    const closestRecord = combinedData.reduce((prev, curr) => {
      const prevDiff = Math.abs(new Date(prev.timestamp) - simulatedDate);
      const currDiff = Math.abs(new Date(curr.timestamp) - simulatedDate);
      return currDiff < prevDiff ? curr : prev;
    });

    // Return only CO2 mode data
    return closestRecord ? [{ co2_mode: closestRecord.co2_mode }] : [];
  } catch (error) {
    console.error('Error simulating CO2 data:', error);
    throw error;
  }
};

// Download CO2 data based on parameters (year, month, day, hour, minute)
exports.downloadCO2 = async (year, month, day, hour, minute, limit = 1000) => {
  try {
    // Load all CSV files
    const data1_5 = await readCSV('data1_5.csv');
    const data6_11 = await readCSV('data6_11.csv');
    const data11 = await readCSV('data11.csv');
    const data12_15 = await readCSV('data12_15.csv');

    // Combine all data
    const combinedData = [...data1_5, ...data6_11, ...data11, ...data12_15];

    // Filter data based on query parameters (year, month, etc.)
    const filteredData = combinedData.filter((row) => {
      const timestamp = new Date(row.timestamp);
      if (year && timestamp.getFullYear() !== year) return false;
      if (month && timestamp.getMonth() + 1 !== month) return false;
      if (day && timestamp.getDate() !== day) return false;
      if (hour && timestamp.getHours() !== hour) return false;
      if (minute && timestamp.getMinutes() !== minute) return false;
      return true;
    });

    // Return only CO2 mode data, limiting by 'limit'
    return filteredData.slice(0, limit).map(row => ({ co2_mode: row.co2_mode }));
  } catch (error) {
    console.error('Error downloading CO2 data:', error);
    throw error;
  }
};



// // Ambil semua data histori CO2 (hanya timestamp, co2)
// // 10 data terakhir CO2 bulan April 2025
// exports.getLast10CO2 = async (simDateStr = null) => {
//   const start = '2025-04-01 00:00:00';
//   const end = '2025-04-30 23:59:59';
  
//   let windowFilter = '';
//   let params = [];
  
//   if (simDateStr) {
//     const simTimestamp = new Date(simDateStr).getTime() / 1000;
//     const windowStartSec = Math.floor(simTimestamp / 5) * 5;
//     const windowStart = new Date(windowStartSec * 1000).toISOString();
//     windowFilter = "AND window_start <= $1";
//     params.push(windowStart);
//   }
  
//   params.push(start, end);

//   let sql = `
//     WITH sampled AS (
//       SELECT
//         date_trunc('second', timestamp) + INTERVAL '1 second' * (FLOOR(EXTRACT(EPOCH FROM timestamp)::int / 5) * 5) AS window_start,
//         mode() WITHIN GROUP (ORDER BY co2) AS co2_mode
//       FROM
//         station2s
//       WHERE
//         timestamp >= $${params.length - 1} AND timestamp <= $${params.length}
//       GROUP BY
//         window_start
//     )
//     SELECT *
//     FROM sampled
//     WHERE 1=1 ${windowFilter}
//     ORDER BY window_start DESC
//     LIMIT 10
//   `;
  
//   const { rows } = await poolEddyKalimantan.query(sql, params);
//   return rows;
// };

// // Ambil data simulasi tolerant (hanya timestamp, co2)
// exports.getSimulatedCO2 = async (simDateStr) => {
//   const simTimestamp = new Date(simDateStr).getTime() / 1000;
//   const windowStartSec = Math.floor(simTimestamp / 5) * 5;
//   const windowStart = new Date(windowStartSec * 1000).toISOString();

//   const sql = `
//     SELECT
//       mode() WITHIN GROUP (ORDER BY co2) AS co2_mode,
//       MIN(timestamp) as window_start
//     FROM
//       station2s
//     WHERE
//       timestamp >= $1
//       AND timestamp < ($1::timestamp + INTERVAL '5 second')
//   `;
//   const { rows } = await poolEddyKalimantan.query(sql, [windowStart]);
//   if (!rows.length || rows[0].co2_mode === null) return [];
//   return [{
//     window_start: windowStart,
//     co2_mode: rows[0].co2_mode
//   }];
// };

// // Dowload data
// exports.downloadCO2 = async (year, month, day, hour, minute, limit = 1000) => {
//   // Buat range waktu berdasarkan parameter, default null jika tidak ada
//   let conditions = [];
//   let params = [];
//   let sqlWhere = "";

//   if (year)   { conditions.push(`EXTRACT(YEAR FROM timestamp) = $${params.length + 1}`); params.push(year); }
//   if (month)  { conditions.push(`EXTRACT(MONTH FROM timestamp) = $${params.length + 1}`); params.push(month); }
//   if (day)    { conditions.push(`EXTRACT(DAY FROM timestamp) = $${params.length + 1}`); params.push(day); }
//   if (hour)   { conditions.push(`EXTRACT(HOUR FROM timestamp) = $${params.length + 1}`); params.push(hour); }
//   if (minute) { conditions.push(`EXTRACT(MINUTE FROM timestamp) = $${params.length + 1}`); params.push(minute); }
//   if (conditions.length > 0) {
//     sqlWhere = "WHERE " + conditions.join(" AND ");
//   }

//   // Query sampling per 5 detik modus
//   let sql = `
//     SELECT
//       date_trunc('second', timestamp) + INTERVAL '1 second' * (FLOOR(EXTRACT(EPOCH FROM timestamp)::int / 5) * 5) AS window_start,
//       mode() WITHIN GROUP (ORDER BY co2) AS co2_mode
//     FROM
//       station2s
//     ${sqlWhere}
//     GROUP BY
//       window_start
//     ORDER BY
//       window_start ASC
//     LIMIT $${params.length + 1}
//   `;
//   params.push(limit);

//   const { rows } = await poolEddyKalimantan.query(sql, params);
//   return rows;
// };

// // downlad by range date
// exports.downloadCO2ByRange = async (start_date, end_date) => {
//   let sql = `
//     SELECT
//       date_trunc('second', timestamp) + INTERVAL '1 second' * (FLOOR(EXTRACT(EPOCH FROM timestamp)::int / 5) * 5) AS window_start,
//       mode() WITHIN GROUP (ORDER BY co2) AS co2_mode
//     FROM
//       station2s
//     WHERE
//       timestamp >= $1 AND timestamp <= $2
//     GROUP BY
//       window_start
//     ORDER BY
//       window_start ASC
//   `;
//   const params = [start_date, end_date];
//   const { rows } = await poolEddyKalimantan.query(sql, params);
//   return rows;
// };
