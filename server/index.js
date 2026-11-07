const express = require('express');
const pool = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());

// Is the server alive?
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Can the server reach the database?
app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

// List employees, optionally filtered by ?role=
app.get('/employees', async (req, res) => {
  try {
    const { role } = req.query;
    const result = role
      ? await pool.query('SELECT * FROM employees WHERE role = $1', [role])
      : await pool.query('SELECT * FROM employees');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});