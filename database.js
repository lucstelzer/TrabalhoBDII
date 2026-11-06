require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DATABASE_USER,                     // Seu usuário SQL criado sem '@'
  password: process.env.DATABASE_PASSWORD,                 // Senha configurada
  server: process.env.DATABASE_URL || 'realcc.database.windows.net',                        // Host do servidor Azure
  database: process.env.DATABASE_NAME,                     // Nome do banco de dados
  port: parseInt(process.env.DATABASE_PORT),
  options: {
    encrypt: true,                           // Obrigatório para conexões com o Azure
    trustServerCertificate: true             // Evita falhas de validação de certificado local
  }
};

let pool;

async function conn(){
    if(pool) return pool;

    try{
        pool= await sql.connect(config);
        console.log('Conexão com o banco de dados bem sucedida!');
        return pool;
    }catch(err){
        console.error('Conexão com o banco de dados falhou.', err.message);
        throw err;
    }
}

module.exports = { sql, conn };