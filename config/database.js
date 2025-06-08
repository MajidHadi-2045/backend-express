const { Pool } = require('pg');
require('dotenv').config();

const poolEddyKalimantan = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: 'eddykalimantan',
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

const poolClimate = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: 'climate',
  user: 'climate',
  password: process.env.PGPASSWORD
});

module.exports = { poolEddyKalimantan, poolClimate };
