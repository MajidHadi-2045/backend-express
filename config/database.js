const { Pool } = require('pg');
require('dotenv').config();

const poolEddyKalimantan = new Pool({
  host: process.env.PGHOST_EDDY,
  port: process.env.PGPORT_EDDY,
  database: process.env.PGDATABASE_EDDY,
  user: process.env.PGUSER_EDDY,
  password: process.env.PGPASSWORD_EDDY
});

const poolClimate = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: 'climate',
  user: 'climate',
  password: process.env.PGPASSWORD
});

module.exports = { poolEddyKalimantan, poolClimate };
