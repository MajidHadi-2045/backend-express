// test-db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

pool.connect()
  .then(async (client) => {
    console.log("✅ Koneksi ke PostgreSQL BERHASIL!");

    // Optional: tes query sederhana
    const res = await client.query('SELECT NOW()');
    console.log("🕒 Waktu server:", res.rows[0]);

    client.release();
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Gagal konek ke PostgreSQL:");
    console.error(err.message);
    process.exit(1);
  });
