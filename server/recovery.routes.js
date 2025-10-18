const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { sendResetEmail } = require('./mailer');

const router = express.Router();

// POST /api/auth/recovery/request
router.post('/request', async (req, res) => {
  const { identifier } = req.body || {};
  const ip = req.ip?.toString().slice(0, 45);
  const ua = (req.headers['user-agent'] || '').slice(0, 255);

  if (!identifier || typeof identifier !== 'string') {
    // misma respuesta para no revelar enumeración
    return res.json({ ok: true, message: 'Si existe la cuenta, enviaremos instrucciones' });
  }

  try {
    // buscar user por username o email activo
    const [users] = await pool.query(
      `SELECT id, email, username FROM users
       WHERE (username = ? OR email = ?) AND is_active = 1
       LIMIT 1`,
      [identifier, identifier]
    );

    // respuesta neutra (anti-enumeración)
    if (!users.length || !users[0].email) {
      return res.json({ ok: true, message: 'Si existe la cuenta, enviaremos instrucciones' });
    }

    const user = users[0];

    // token aleatorio + hash sha256 para almacenar
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await pool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, tokenHash, expiresAt, ip || null, ua || null]
    );

    const base = process.env.APP_BASE_URL || 'http://localhost:3000';
    const link = `${base}/paginas/reset.html?token=${token}`;

    // enviar mail
    await sendResetEmail(user.email, link);

    return res.json({ ok: true, message: 'Si existe la cuenta, enviaremos instrucciones' });
  } catch (e) {
    console.error('Recovery request error:', e);
    // Siempre respuesta neutra
    return res.json({ ok: true, message: 'Si existe la cuenta, enviaremos instrucciones' });
  }
});

// POST /api/auth/recovery/reset
router.post('/reset', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || password.length < 8) {
    return res.status(400).json({ message: 'Datos inválidos' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [rows] = await pool.query(
      `SELECT id, user_id, expires_at, used_at
       FROM password_resets
       WHERE token_hash = ?
       ORDER BY id DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows.length) {
      return res.status(400).json({ message: 'Token inválido' });
    }

    const pr = rows[0];
    if (pr.used_at) {
      return res.status(400).json({ message: 'Token ya utilizado' });
    }
    if (new Date(pr.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Token expirado' });
    }

    // actualizar contraseña
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, pr.user_id]);
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id=?', [pr.id]);

    return res.json({ ok: true, message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
  } catch (e) {
    console.error('Recovery reset error:', e);
    return res.status(500).json({ message: 'Error al restablecer' });
  }
});

module.exports = router;
