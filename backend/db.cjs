// const { Pool } = require("pg");

// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "postgres",
//   password: "Punjab@100",
//   port: 5432,
// });

// module.exports = pool;

const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : new Pool({
      user: "postgres",
      host: "localhost",
      database: "postgres",
      password: "Punjab@100",
      port: 5432,
    });

module.exports = pool;