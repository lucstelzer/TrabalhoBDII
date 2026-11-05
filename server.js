app.get('/api/regioes', async (req, res) => {
  try {
    const resultado = await pool.request().query('exec regioes');
    res.json(resultado.recordset)
  }catch(err){
    console.error('A consulta no banco falhou', err.message)
    res.status(500);
  }
});