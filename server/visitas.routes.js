// server/visitas.routes.js
const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const router = express.Router();

// Ajustá según tu helper/DB (pool o conexión):
const db = require('./db'); // si tu módulo se llama distinto, cambialo
const { requireAuth, requireRole } = require('./authorize');

// POST /api/visitas  => crear visita + QR (SEGURIDAD o ADMIN)
router.post('/',
  requireAuth(),
  requireRole('SEGURIDAD', 'ADMIN'),
  async (req, res) => {
    try {
      const { nombre, dni, motivo, fecha_visita, expira_en } = req.body;
      if (!nombre || !dni || !motivo || !fecha_visita || !expira_en) {
        return res.status(400).json({ error: 'Faltan campos' });
      }

      const codigo = crypto.randomBytes(8).toString('hex');
      await db.query(
        `INSERT INTO visitas (nombre, dni, motivo, fecha_visita, expira_en, codigo, created_by)
         VALUES (?,?,?,?,?,?,?)`,
        [nombre, dni, motivo, fecha_visita, expira_en, codigo, req.user.id]
      );

      const payload = JSON.stringify({ t: 'VISITA', c: codigo });
      const qrDataURL = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M' });

      res.json({ ok: true, codigo, qrDataURL });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error creando visita' });
    }
  }
);

// GET /api/visitas/mias => listar creadas por el usuario seguridad/admin
router.get('/mias',
  requireAuth(),
  requireRole('SEGURIDAD', 'ADMIN'),
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT id, nombre, dni, motivo, fecha_visita, expira_en, estado, codigo, created_at
         FROM visitas
         WHERE created_by = ?
         ORDER BY created_at DESC`,
        [req.user.id]
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error listando visitas' });
    }
  }
);

// POST /api/visitas/validar => validar QR de visita (puerta)
router.post('/validar',
  requireAuth(),
  requireRole('SEGURIDAD', 'ADMIN'),
  async (req, res) => {
    try {
      const { codigo } = req.body;
      if (!codigo) return res.status(400).json({ error: 'Sin código' });

      const [rows] = await db.query(`SELECT * FROM visitas WHERE codigo = ?`, [codigo]);
      const visita = rows && rows[0];
      if (!visita) return res.status(404).json({ error: 'No encontrada' });

      const now = new Date();
      const expira = new Date(visita.expira_en);
      if (now > expira) {
        await db.query(`UPDATE visitas SET estado = 'EXPIRADA' WHERE id = ?`, [visita.id]);
        return res.status(410).json({ error: 'QR expirado' });
      }

      if (visita.estado === 'VALIDADA') {
        return res.status(409).json({ error: 'Ya validada' });
      }

      await db.query(`UPDATE visitas SET estado = 'VALIDADA' WHERE id = ?`, [visita.id]);
      res.json({ ok: true, visitaId: visita.id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error validando visita' });
    }
  }
);

module.exports = router;
