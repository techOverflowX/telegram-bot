const { Pool } = require("pg");
const Redis = require("ioredis");

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  
  // Pool configuration
  // max: 20, // max number of clients in the pool
  // idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
});

// Redis connection
const redis = new Redis(process.env.REDIS_URL);

// Initialize PostgreSQL connection
pool
  .connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => console.error("PostgreSQL connection error", err.stack));

module.exports = {
  pool,
  redis
};