require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  server: process.env.DATABASE_URL,
  database: process.env.DATABASE_NAME,
  port: parseInt(process.env.DATABASE_PORT) || 1433,
  connectionTimeout: 60000,
  requestTimeout: 60000,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

let pool;

async function conn() {
  if (pool && pool.connected) return pool;

  try {
    pool = await sql.connect(config);
    console.log('Conexão com o banco de dados bem sucedida!');
    return pool;
  } catch (err) {
    pool = null;
    console.error('Conexão com o banco de dados falhou.', err.message);
    throw err;
  }
}

module.exports = { sql, conn };