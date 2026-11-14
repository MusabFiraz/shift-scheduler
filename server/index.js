const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

app.use(express.json());

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns trimmed text if it's a string, otherwise an empty string
const clean = (value) => (typeof value === 'string' ? value.trim() : '');


// Gatekeeper: checks the login token and saves who is asking
function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing token' });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);

    // Tokens from before multi-tenancy have no businessId, so reject them
    if (!payload.businessId) {
      return res.status(401).json({ error: 'invalid token, please log in again' });
    }

    req.userId = payload.userId;
    req.businessId = payload.businessId; // always from the verified token
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

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

// List MY BUSINESS's employees, optionally filtered by ?role=
app.get('/employees', requireAuth, async (req, res) => {
  try {
    const role = clean(req.query.role);
    const result = role
      ? await pool.query(
          'SELECT * FROM employees WHERE business_id = $1 AND role = $2 ORDER BY name',
          [req.businessId, role]
        )
      : await pool.query(
          'SELECT * FROM employees WHERE business_id = $1 ORDER BY name',
          [req.businessId]
        );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

// Create an employee in MY business (login required)
app.post('/employees', requireAuth, async (req, res) => {
  const name = clean(req.body.name);
  const role = clean(req.body.role).toLowerCase();
  const email = clean(req.body.email).toLowerCase();
  const phone = clean(req.body.phone);

  if (!name || name.length > 100) {
    return res.status(400).json({ error: 'name is required (max 100 characters)' });
  }
  if (!role || role.length > 50) {
    return res.status(400).json({ error: 'role is required (max 50 characters)' });
  }
  if (email && (!EMAIL_REGEX.test(email) || email.length > 254)) {
    return res.status(400).json({ error: 'email is not valid' });
  }
  if (phone.length > 30) {
    return res.status(400).json({ error: 'phone is too long (max 30 characters)' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO employees (business_id, manager_id, name, role, email, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.businessId, req.userId, name, role, email || null, phone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

// Delete an employee by id (not protected yet)
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

// Log in: check the password, hand back a signed token
app.post('/auth/login', async (req, res) => {
  try {
   
    const email = clean(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    const passwordOk = user && await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'invalid email or password' });
    }
    
    const token = jwt.sign(
      { userId: user.id, businessId: user.business_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }

});

app.post('/auth/signup', async (req, res) => {
  const businessName = clean(req.body.businessName);
  const managerName = clean(req.body.managerName);
  const email = clean(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!businessName || businessName.length > 100) {
    return res.status(400).json({ error: 'business name is required (max 100 characters)' });
  }
  if (!managerName || managerName.length > 100) {
    return res.status(400).json({ error: 'manager name is required (max 100 characters)' });
  }
  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'a valid email is required' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'password must be between 8 and 72 characters' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const business = await client.query(
      'INSERT INTO businesses (name) VALUES ($1) RETURNING id',
      [businessName]
    );
    const businessId = business.rows[0].id;

    const user = await client.query(
      `INSERT INTO users (business_id, name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, business_id, name, email`,
      [businessId, managerName, email, passwordHash]
    );

    await client.query('COMMIT');
    res.status(201).json(user.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email already registered' });
    }
    console.error(err);
    res.status(500).json({ status: 'error' });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});