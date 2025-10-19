const express = require('express');
const pool = require('./db');
const authorize = require('./authorize');

const router = express.Router();

router.get('/', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT id, username, nombre, apellido, email, dni, turno, anio, role, is_active, created_at
       FROM users
       WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    res.status(500).json({ message: 'Error al obtener datos del perfil' });
  }
});

module.exports = router;