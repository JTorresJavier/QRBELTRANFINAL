// server/student.routes.js
const express = require('express');
const pool = require('./db');
const authorize = require('./authorize');

const router = express.Router();

function dayToken(d) {
  // 0=Dom, 1=Lun,... 6=Sab  → tokens 'lun','mar','mie','jue','vie','sab'
  const map = ['dom','lun','mar','mie','jue','vie','sab'];
  return map[d] || 'lun';
}

/* =========================================================
   GET /api/student/today-classes
   ========================================================= */
router.get('/today-classes', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;

    const [uRows] = await pool.query(
      'SELECT anio, turno, username, nombre, apellido FROM users WHERE id=? LIMIT 1',
      [userId]
    );
    if (!uRows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const u = uRows[0];
    const today = new Date();
    const day = dayToken(today.getDay());

    if (day === 'dom') {
      return res.json({
        anio: u.anio,
        turno: u.turno,
        day,
        classes: []
      });
    }

    const [rows] = await pool.query(
      `SELECT cs.id,
              s.name AS subject,
              cs.teacher,
              TIME_FORMAT(cs.start_time,'%H:%i') AS start,
              TIME_FORMAT(cs.end_time,'%H:%i')   AS end
       FROM class_schedules cs
       JOIN subjects s ON s.id = cs.subject_id
       WHERE cs.anio=? AND cs.turno=? AND cs.day=?
       ORDER BY cs.start_time ASC
       LIMIT 2`,
      [u.anio, u.turno, day]
    );

    res.json({
      anio: u.anio,
      turno: u.turno,
      day,
      classes: rows,
      user: {
        username: u.username,
        nombre: u.nombre,
        apellido: u.apellido
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al cargar clases de hoy' });
  }
});

/* =========================================================
   GET /api/student/schedule  → HORARIO SEMANAL
   ========================================================= */
router.get('/schedule', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;

    const [uRows] = await pool.query(
      'SELECT anio, turno FROM users WHERE id=? LIMIT 1',
      [userId]
    );
    if (!uRows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const { anio, turno } = uRows[0];

    const [rows] = await pool.query(
      `SELECT cs.id,
              cs.day,
              s.name AS subject,
              cs.teacher,
              TIME_FORMAT(cs.start_time,'%H:%i') AS start,
              TIME_FORMAT(cs.end_time,'%H:%i')   AS end
       FROM class_schedules cs
       JOIN subjects s ON s.id = cs.subject_id
       WHERE cs.anio=? AND cs.turno=?
       ORDER BY FIELD(cs.day,'lun','mar','mie','jue','vie','sab'),
                cs.start_time`,
      [anio, turno]
    );

    const weekly = {
      lun: [], mar: [], mie: [],
      jue: [], vie: [], sab: [], dom: []
    };

    rows.forEach(r => {
      weekly[r.day].push({
        id: r.id,          
        subject: r.subject,
        teacher: r.teacher,
        start: r.start,
        end: r.end,
        day: r.day
      });
    });

    res.json({ anio, turno, weekly });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al cargar la grilla' });
  }
});

module.exports = router;