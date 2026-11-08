const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

// Create an employee (manager_id is hardcoded until login exists)
app.post('/employees', async (req, res) => {
  try {
    const { name, role, email, phone } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'name and role are required' });
    }

    const result = await pool.query(
      `INSERT INTO employees (manager_id, name, role, email, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [1, name, role, email, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

// Delete an employee by id
app.delete('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'employee not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

// Register a manager account (password is hashed, never stored as-is)
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email already registered' });
    }
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    const passwordOk = user && await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});