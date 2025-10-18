// server/auth.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const router = express.Router();

// helper para crear token
function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

// POST /api/auth/register  (opcional, para crear usuario)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Faltan campos' });

    const [exists] = await pool.query('SELECT id FROM users WHERE username=?', [username]);
    if (exists.length) return res.status(409).json({ message: 'Usuario ya existe' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email || null, hash, role]
    );

    return res.status(201).json({ message: 'Usuario creado' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error al registrar' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Faltan credenciales' });

    const [rows] = await pool.query('SELECT id, username, password_hash, role, is_active FROM users WHERE username=? LIMIT 1', [username]);
    const user = rows[0];
    if (!user || !user.is_active) return res.status(401).json({ message: 'Usuario inexistente o inactivo' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });

    const token = makeToken(user);
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me  (verifica token)
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ message: 'Sin token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ ok: true, user: payload });
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
});

module.exports = router;
