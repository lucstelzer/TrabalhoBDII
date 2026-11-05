require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DATABASE_USERNAME,                     // Seu usuário SQL criado sem '@'
  password: process.env.DATABASE_PASSWORD,                 // Senha configurada
  server: process.env.DATABASE_URL,                        // Host do servidor Azure
  database: process.env.DATABASE_NAME,                     // Nome do banco de dados
  port: process.env.DATABASE_PORT,
  options: {
    encrypt: true,                           // Obrigatório para conexões com o Azure
    trustServerCertificate: true             // Evita falhas de validação de certificado local
  }
};

let poll;

async function conn(){

    try{
        poll= await sql.connect(config);
        console.log('Conexão com o banco de dados bem sucedida!');
    }catch(err){
        console.error('Conexão com o banco de dados falhou.', err.message);
    }
}

conectarBanco();

module.exports = { sql, pool };