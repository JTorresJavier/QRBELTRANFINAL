// server/admin.routes.js
const express = require('express');
const router = express.Router();
const pool = require('./db');
const authorize = require('./authorize');

// GET /api/admin/users  (lista alumnos con filtros)
router.get('/users', authorize(['admin']), async (req, res) => {
  try {
    const {
      q = '', turno, anio, page = 1, pageSize = 20,
      sortBy = 'u.apellido', sortDir = 'asc'
    } = req.query;

    const allowedSort = new Set(['u.apellido','u.nombre','u.username','u.dni','u.anio','u.turno']);
    const sBy  = allowedSort.has(sortBy) ? sortBy : 'u.apellido';
    const sDir = (String(sortDir).toLowerCase() === 'desc') ? 'DESC' : 'ASC';

    const where = [];
    const params = [];

    if (q) {
      where.push(`(u.username LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ? OR u.dni LIKE ?)`);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (turno) { where.push('u.turno=?'); params.push(turno); }
    if (anio)  { where.push('u.anio=?');  params.push(Number(anio)); }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // total
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users u
       ${whereSQL}`,
      params
    );

    // data
    const limit = Math.max(1, Math.min(200, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.nombre, u.apellido, u.dni, u.anio, u.turno, u.role, u.is_active
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

// GET /api/admin/logs  (registros de accesos con filtros/orden/paginación)
router.get('/logs', authorize(['admin']), async (req, res) => {
  try {
    const {
      q = '', user_id, turno, anio, from, to,
      page = 1, pageSize = 10,   // 👈 default 10
      sortBy = 'l.scanned_at', sortDir = 'desc'
    } = req.query;

    const allowedSort = new Set(['l.scanned_at','u.apellido','u.nombre','u.username','u.dni','u.anio','u.turno','l.within_shift']);
    const sBy  = allowedSort.has(sortBy) ? sortBy : 'l.scanned_at';
    const sDir = (String(sortDir).toLowerCase() === 'asc') ? 'ASC' : 'DESC';

    const where = ['1=1'];
    const params = [];

    if (q) {
      where.push(`(u.username LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ? OR u.dni LIKE ?)`);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (user_id) { where.push('u.id=?'); params.push(Number(user_id)); }
    if (turno)   { where.push('u.turno=?'); params.push(turno); }
    if (anio)    { where.push('u.anio=?');  params.push(Number(anio)); }
    if (from)    { where.push('l.scanned_at >= ?'); params.push(from); }
    if (to)      { where.push('l.scanned_at < ?');  params.push(to); } // exclusivo fin

    const whereSQL = `WHERE ${where.join(' AND ')}`;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM access_logs l
       JOIN users u ON u.id = l.user_id
       ${whereSQL}`,
      params
    );

    // 👇 normalizo page/pageSize y pongo un cap razonable
    const curPage = Math.max(1, parseInt(page, 10) || 1);
    const limit   = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const offset  = (curPage - 1) * limit;

    const [rows] = await pool.query(
      `SELECT l.id, l.scanned_at, l.within_shift,
              u.id AS user_id, u.username, u.nombre, u.apellido, u.dni, u.anio, u.turno
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

// GET /api/admin/logs/export?format=csv&... (CSV listo)
router.get('/logs/export', authorize(['admin']), async (req, res) => {
  try {
    const {
      q = '', user_id, turno, anio, from, to,
      sortBy = 'l.scanned_at', sortDir = 'desc',
      format = 'csv'
    } = req.query;

    const allowedSort = new Set(['l.scanned_at','u.apellido','u.nombre','u.username','u.dni','u.anio','u.turno','l.within_shift']);
    const sBy  = allowedSort.has(sortBy) ? sortBy : 'l.scanned_at';
    const sDir = (String(sortDir).toLowerCase() === 'asc') ? 'ASC' : 'DESC';

    const where = ['1=1'];
    const params = [];
    if (q)       { where.push(`(u.username LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ? OR u.dni LIKE ?)`); params.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`); }
    if (user_id) { where.push('u.id=?'); params.push(Number(user_id)); }
    if (turno)   { where.push('u.turno=?'); params.push(turno); }
    if (anio)    { where.push('u.anio=?');  params.push(Number(anio)); }
    if (from)    { where.push('l.scanned_at >= ?'); params.push(from); }
    if (to)      { where.push('l.scanned_at < ?');  params.push(to); }
    const whereSQL = `WHERE ${where.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT l.scanned_at,
              CASE WHEN l.within_shift=1 THEN 'Dentro de turno' ELSE 'Fuera de turno' END AS condicion,
              u.username, u.nombre, u.apellido, u.dni, u.anio, u.turno
       FROM access_logs l
       JOIN users u ON u.id = l.user_id
       ${whereSQL}
       ORDER BY ${sBy} ${sDir}`,
      params
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="informe_accesos.csv"');
      // encabezado
      res.write('FechaHora,Condicion,Username,Nombre,Apellido,DNI,Año,Turno\n');
      for (const r of rows) {
        const line = [
          r.scanned_at.toISOString?.() ?? r.scanned_at, r.condicion, r.username,
          r.nombre, r.apellido, r.dni, r.anio, r.turno
        ].map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',');
        res.write(line + '\n');
      }
      return res.end();
    }

    // ganchos para XLSX/PDF (próxima tanda)
    return res.status(400).json({ message: 'Format no soportado aún. Usá format=csv' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error exportando informe' });
  }
});

module.exports = router;
