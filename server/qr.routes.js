const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');
const authorize = require('./authorize');

// ✅ helper: ¿el escaneo cae dentro del turno?
function isWithinShift(turno, d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60; // 0..24
  if (turno === 'mañana') return h >= 6  && h < 12;
  if (turno === 'tarde')  return h >= 13 && h < 18;
  if (turno === 'noche')  return h >= 18 && h < 22;
  return false;
}

const router = express.Router();

// Emite URL firmada para QR (válida ~60s)
router.post('/issue', authorize(), async (req, res) => {
  try {
    const user = req.user;
    const jti = uuidv4();
    const expSec = Math.floor(Date.now() / 1000) + 60; // 60s
    const token = jwt.sign(
      { sub: user.id, u: user.username, typ: 'qr', jti, exp: expSec },
      process.env.QR_SECRET,
      { algorithm: 'HS256' }
    );
    const expiresAt = new Date(expSec * 1000);

    await pool.query(
      'INSERT INTO qr_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)',
      [jti, user.id, expiresAt]
    );

    const base = process.env.APP_BASE_URL || 'http://localhost:3000';
    const url = `${base}/paginas/validar.html?token=${token}`;
    res.json({ url, exp: expSec });
  } catch (e) {
    console.error('QR issue error:', e);
    res.status(500).json({ message: 'No se pudo emitir el QR' });
  }
});



// GET /api/qr/verify?token=...
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false, reason: 'missing' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.QR_SECRET); // { sub,u,r,typ,jti,iat,exp }
    } catch {
      return res.status(400).json({ valid: false, reason: 'invalid_or_expired' });
    }

    // Token emitido y vigente
    const [tokRows] = await pool.query(
      'SELECT id, used_at, expires_at FROM qr_tokens WHERE jti=? LIMIT 1',
      [payload.jti]
    );
    if (!tokRows.length) return res.status(400).json({ valid: false, reason: 'unknown' });

    const tok = tokRows[0];
    if (tok.used_at) return res.status(400).json({ valid: false, reason: 'reused' });
    if (new Date(tok.expires_at) < new Date())
      return res.status(400).json({ valid: false, reason: 'expired' });

    // Datos frescos del usuario (incluye nombre/apellido/dni/turno/rol)
    const [uRows] = await pool.query(
      'SELECT id, username, role, dni, turno, nombre, apellido FROM users WHERE id=? LIMIT 1',
      [payload.sub]
    );
    if (!uRows.length) return res.status(400).json({ valid: false, reason: 'unknown_user' });

    const u = uRows[0];

    // Marcar token como usado
    await pool.query('UPDATE qr_tokens SET used_at = NOW() WHERE id=?', [tok.id]);

    // Log de acceso (snapshot con nombre y apellido)
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const ua = req.headers['user-agent'] || '';
    // ✅ calcular si está dentro del turno
    const within = isWithinShift(u.turno, new Date());

    // ✅ guardar el log con within_shift
    await pool.query(
      `INSERT INTO access_logs
     (user_id, jti, ip, user_agent, username, nombre, apellido, role, dni, turno, within_shift)
      VALUES (?,      ?,   ?,  ?,          ?,        ?,       ?,        ?,   ?,    ?,     ?)`,
    [u.id, payload.jti, ip, ua, u.username, u.nombre || null, u.apellido || null, u.role, u.dni || null, u.turno || null, within ? 1 : 0]
    );

    // Hora efectiva grabada
    const [last] = await pool.query('SELECT scanned_at FROM access_logs WHERE jti=? LIMIT 1', [payload.jti]);
    const scannedAt = last.length ? last[0].scanned_at : new Date();

    return res.json({
      valid: true,
      user: {
        id: u.id,
        username: u.username,
        role: u.role,
        dni: u.dni,
        turno: u.turno,
        nombre: u.nombre,
        apellido: u.apellido
      },
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
      scanned_at: scannedAt,
      within_shift: within ? 1 : 0,  // 👈 si querés usarlo en el front
    });
  } catch (e) {
    console.error('QR verify error:', e);
    res.status(500).json({ valid: false, reason: 'server_error' });
  }
});


module.exports = router;
