// server/admin.routes.js
const express = require('express');
const router = express.Router();
const pool = require('./db');
const authorize = require('./authorize');

// =======================================================
// GET /api/admin/users  (lista usuarios)
// =======================================================
router.get('/users', authorize(['admin']), async (req, res) => {
  try {
    const {
      q = '', turno, anio, page = 1, pageSize = 20,
      sortBy = 'u.apellido', sortDir = 'asc'
    } = req.query;

    const allowedSort = new Set(['u.apellido','u.nombre','u.username','u.dni','u.anio','u.turno']);
    const sBy  = allowedSort.has(sortBy) ? sortBy : 'u.apellido';
    const sDir = String(sortDir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const where = [];
    const params = [];

    if (q) {
      where.push(`(
        u.username LIKE ? OR
        u.nombre   LIKE ? OR
        u.apellido LIKE ? OR
        u.dni      LIKE ?
      )`);
      params.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`);
    }
    if (turno) { where.push('u.turno = ?'); params.push(turno); }
    if (anio)  { where.push('u.anio  = ?'); params.push(Number(anio)); }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u ${whereSQL}`,
      params
    );

    const limit  = Math.max(1, Math.min(200, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.nombre, u.apellido,
              u.dni, u.anio, u.turno, u.role, u.is_active
       FROM users u
       ${whereSQL}
       ORDER BY ${sBy} ${sDir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ total, page: Number(page), pageSize: limit, rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error listando usuarios' });
  }
});

// =======================================================
// GET /api/admin/logs  (registros de accesos)
// =======================================================
router.get('/logs', authorize(['admin']), async (req, res) => {
  try {
    const {
      q = '', user_id, turno, anio, rol, from, to,
      page = 1, pageSize = 10,
      sortBy = 'l.scanned_at', sortDir = 'desc'
    } = req.query;

    const allowedSort = new Set([
      'l.scanned_at','u.apellido','u.nombre',
      'u.username','u.dni','u.anio','u.turno','l.within_shift'
    ]);
    const sBy  = allowedSort.has(sortBy) ? sortBy : 'l.scanned_at';
    const sDir = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const where = ['1=1'];
    const params = [];

    if (q) {
      where.push(`(
        u.username LIKE ? OR
        u.nombre   LIKE ? OR
        u.apellido LIKE ? OR
        u.dni      LIKE ?
      )`);
      params.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`);
    }
    if (user_id) { where.push('u.id = ?'); params.push(Number(user_id)); }
    if (turno)   { where.push('u.turno = ?'); params.push(turno); }
    if (anio)    { where.push('u.anio  = ?'); params.push(Number(anio)); }
    if (rol)     { where.push('u.role  = ?'); params.push(rol); }
    if (from)    { where.push('l.scanned_at >= ?'); params.push(from); }
    if (to)      { where.push('l.scanned_at <  ?'); params.push(to); }

    const whereSQL = `WHERE ${where.join(' AND ')}`;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM access_logs l
       JOIN users u ON u.id = l.user_id
       ${whereSQL}`,
      params
    );

    const curPage = Math.max(1, parseInt(page, 10) || 1);
    const limit   = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const offset  = (curPage - 1) * limit;

    const [rows] = await pool.query(
      `SELECT l.id, l.scanned_at, l.within_shift,
              u.id AS user_id,
              u.username, u.nombre, u.apellido,
              u.dni, u.anio, u.turno, u.role
       FROM access_logs l
       JOIN users u ON u.id = l.user_id
       ${whereSQL}
       ORDER BY ${sBy} ${sDir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ total, page: curPage, pageSize: limit, rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error listando logs' });
  }
});

// =======================================================
// GET /api/admin/logs/export  (CSV)
// =======================================================
router.get('/logs/export', authorize(['admin']), async (req, res) => {
  try {
    const {
      q = '', user_id, turno, anio, rol, from, to,
      sortBy = 'l.scanned_at', sortDir = 'desc',
      format = 'csv'
    } = req.query;

    const allowedSort = new Set([
      'l.scanned_at','u.apellido','u.nombre',
      'u.username','u.dni','u.anio','u.turno','l.within_shift'
    ]);
    const sBy  = allowedSort.has(sortBy) ? sortBy : 'l.scanned_at';
    const sDir = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const where = ['1=1'];
    const params = [];

    if (q) {
      where.push(`(
        u.username LIKE ? OR
        u.nombre   LIKE ? OR
        u.apellido LIKE ? OR
        u.dni      LIKE ?
      )`);
      params.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`);
    }
    if (user_id) { where.push('u.id = ?'); params.push(Number(user_id)); }
    if (turno)   { where.push('u.turno = ?'); params.push(turno); }
    if (anio)    { where.push('u.anio  = ?'); params.push(Number(anio)); }
    if (rol)     { where.push('u.role  = ?'); params.push(rol); }
    if (from)    { where.push('l.scanned_at >= ?'); params.push(from); }
    if (to)      { where.push('l.scanned_at <  ?'); params.push(to); }

    const whereSQL = `WHERE ${where.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT l.scanned_at,
              CASE WHEN l.within_shift = 1
                   THEN 'Dentro de turno'
                   ELSE 'Fuera de turno'
              END AS condicion,
              u.username, u.nombre, u.apellido,
              u.dni, u.anio, u.turno, u.role
       FROM access_logs l
       JOIN users u ON u.id = l.user_id
       ${whereSQL}
       ORDER BY ${sBy} ${sDir}`,
      params
    );

    if (format !== 'csv') {
      return res.status(400).json({ message: 'Format no soportado aún. Usá format=csv' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="informe_accesos.csv"');

    res.write('FechaHora,Condicion,Username,Nombre,Apellido,DNI,Año,Turno,Rol\n');
    for (const r of rows) {
      const line = [
        r.scanned_at,
        r.condicion,
        r.username,
        r.nombre,
        r.apellido,
        r.dni,
        r.anio,
        r.turno,
        r.role
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
      res.write(line + '\n');
    }
    res.end();

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error exportando informe' });
  }
});

// =======================================================
// DELETE /api/admin/schedule/:id  (eliminar clase)
// =======================================================
router.delete('/schedule/:id', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID requerido' });
    }

    const [result] = await pool.query(
      'DELETE FROM class_schedules WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }

    res.json({ message: 'Clase eliminada correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al eliminar clase' });
  }
});

// =======================================================
// POST /api/admin/schedule  (agregar clase)
// =======================================================
router.post('/schedule', authorize(['admin']), async (req, res) => {
  try {
    const { subject_id, teacher, day, start_time, end_time, anio, turno } = req.body;
    if (!subject_id || !teacher || !day || !start_time || !end_time || !anio || !turno) {
      return res.status(400).json({ message: 'Faltan datos' });
    }

    const [result] = await pool.query(
      'INSERT INTO class_schedules (anio, turno, day, subject_id, teacher, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [anio, turno, day, subject_id, teacher, start_time, end_time]
    );

    res.json({ message: 'Clase agregada', id: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al agregar clase' });
  }
});

// =======================================================
// PUT /api/admin/schedule/:id  (editar clase)
// =======================================================
router.put('/schedule/:id', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_id, teacher, day, start_time, end_time, anio, turno } = req.body;

    if (!subject_id || !teacher || !day || !start_time || !end_time || !anio || !turno) {
      return res.status(400).json({ message: 'Faltan datos' });
    }

    const [result] = await pool.query(
      'UPDATE class_schedules SET anio=?, turno=?, day=?, subject_id=?, teacher=?, start_time=?, end_time=? WHERE id=?',
      [anio, turno, day, subject_id, teacher, start_time, end_time, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }

    res.json({ message: 'Clase actualizada' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al actualizar clase' });
  }
});

// =======================================================
// GET /api/admin/subjects  (lista materias)
// =======================================================
router.get('/subjects', authorize(['admin']), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, anio FROM subjects ORDER BY name'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error listando materias' });
  }
});

module.exports = router;
