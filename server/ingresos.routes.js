// server/ingresos.routes.js
const express = require('express');
const router = express.Router();
const db = require('./db');
const { requireAuth, requireRole } = require('./authorize');

// Crear ingreso manual (DENTRO)
router.post('/',
  requireAuth(),
  requireRole('SEGURIDAD', 'ADMIN'),
  async (req, res) => {
    try {
      const { nombre, dni, celular, motivo } = req.body;
      if (!nombre || !dni || !celular || !motivo) {
        return res.status(400).json({ error: 'Faltan campos' });
      }
      await db.query(
        `INSERT INTO ingresos (nombre, dni, celular, motivo, created_by)
         VALUES (?,?,?,?,?)`,
        [nombre.trim(), dni.trim(), celular.trim(), motivo.trim(), req.user.id]
      );
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error creando ingreso' });
    }
  }
);

// GET /api/ingresos  => lista paginada + total (incluye duration_seconds)
router.get('/',
  requireAuth(),
  requireRole('SEGURIDAD', 'ADMIN'),
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const pageSize = Math.min(1000, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
      const offset = (page - 1) * pageSize;

      const [totRows] = await db.query(`SELECT COUNT(*) AS total FROM ingresos`);
      const total = Number(totRows?.[0]?.total || 0);

      const [rows] = await db.query(
        `SELECT id, nombre, dni, celular, motivo, ingreso_at, egreso_at, estado, duration_seconds
         FROM ingresos
         ORDER BY ingreso_at DESC
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

      res.json({ rows, total, page, pageSize });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error listando ingresos' });
    }
  }
);

// Listar sólo activos (DENTRO)
router.get('/activos',
  requireAuth(),
  requireRole('SEGURIDAD', 'ADMIN'),
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT id, nombre, dni, celular, motivo, ingreso_at, estado
         FROM ingresos
         WHERE estado = 'DENTRO'
         ORDER BY ingreso_at DESC`
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error listando activos' });
    }
  }
);

// Marcar egreso (guarda duration_seconds)
router.patch('/:id/egreso',
  requireAuth(),
  requireRole('SEGURIDAD', 'ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query(`SELECT id, estado, ingreso_at FROM ingresos WHERE id = ?`, [id]);
      if (!rows || !rows[0]) return res.status(404).json({ error: 'Ingreso no encontrado' });
      if (rows[0].estado === 'FUERA') {
        return res.status(409).json({ error: 'Ya registrado como FUERA' });
      }

      await db.query(
        `UPDATE ingresos
         SET estado = 'FUERA',
             egreso_at = NOW(),
             duration_seconds = TIMESTAMPDIFF(SECOND, ingreso_at, NOW())
         WHERE id = ?`,
        [id]
      );
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error marcando egreso' });
    }
  }
);

module.exports = router;
