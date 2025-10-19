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

router.put('/', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { nombre, apellido, email, dni, turno, anio } = req.body;

    await pool.query(
      `UPDATE users
       SET nombre=?, apellido=?, email=?, dni=?, turno=?, anio=?
       WHERE id=?`,
      [nombre, apellido, email, dni, turno, anio, userId]
    );

    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error al actualizar el perfil' });
  }
});

module.exports = router;