require("dotenv").config();
const { Pool } = require("pg");

// Use DATABASE_URL if available (Render), otherwise use individual env vars
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Required for Render
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

pool.connect()
  .then(() => console.log("✅ Admin DB Connected Successfully"))
  .catch(err => console.error("❌ DB Connection Error:", err.message));

module.exports = pool;
