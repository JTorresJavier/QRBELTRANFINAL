// public/JavaScript/seguridad.js
const API = '/api/ingresos';

function getToken() {
  return localStorage.getItem('token');
}
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

const el = {
  form: null,
  tbody: null
};

let tickTimer = null;    // interval global para cronómetros

function fmtFechaHora(iso) {
  // espera 'YYYY-MM-DDTHH:mm:ss.sssZ' o 'YYYY-MM-DD HH:mm:ss'
  const d = new Date(String(iso).replace(' ', 'T'));
  return d.toLocaleString('es-AR', { hour12: false });
}

function humanDiff(fromISO) {
  const start = new Date(String(fromISO).replace(' ', 'T')).getTime();
  const now = Date.now();
  let diff = Math.max(0, Math.floor((now - start) / 1000)); // seg
  const h = Math.floor(diff / 3600);
  diff %= 3600;
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  const pad = (x) => String(x).padStart(2,'0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ⇩ NUEVO: formatear duración en segundos a HH:MM:SS
function fmtDurSeconds(total) {
  const t = Math.max(0, Number(total || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (x) => String(x).padStart(2,'0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

async function crearIngreso(payload) {
  const res = await fetch(API, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: text }; }
}

// Trae SOLO una página para mostrar en la tabla (p. ej. 50 filas)
async function listarIngresos(page = 1, pageSize = 50) {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
  const res = await fetch(`${API}?${qs}`, { headers: authHeaders() });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = []; }

  // Compat: si el backend devolviera array viejo, adaptamos
  if (Array.isArray(data)) return { rows: data, total: data.length, page: 1, pageSize: data.length };

  return { rows: data.rows || [], total: data.total || 0, page: data.page || page, pageSize: data.pageSize || pageSize };
}

async function marcarEgreso(id) {
  const res = await fetch(`${API}/${id}/egreso`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: text }; }
}

function renderTabla(data) {
  el.tbody.innerHTML = '';
  data.forEach((row) => {
    const tr = document.createElement('tr');
    if (row.estado === 'DENTRO') tr.classList.add('alerta-dentro');
    tr.dataset.id = row.id;
    tr.dataset.ingresoAt = row.ingreso_at;

    tr.innerHTML = `
      <td>${row.nombre}</td>
      <td>${row.dni}</td>
      <td>${row.celular}</td>
      <td>${row.motivo}</td>
      <td>${fmtFechaHora(row.ingreso_at)}</td>
      <td class="estado">${row.estado}</td>
      <td class="tiempo">${
        row.estado === 'DENTRO'
          ? humanDiff(row.ingreso_at)
          : (row.duration_seconds != null ? fmtDurSeconds(row.duration_seconds) : '-')
      }</td>
      <td class="acciones">
        ${row.estado === 'DENTRO'
          ? `<button class="btn-egreso" data-id="${row.id}">Egreso</button>`
          : `<span class="texto-muted">—</span>`}
      </td>
    `;
    el.tbody.appendChild(tr);
  });

  // (Re)iniciar cronómetros
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    // actualizar celdas "tiempo" de los que están DENTRO
    document.querySelectorAll('#tabla-ingresos tbody tr.alerta-dentro').forEach(tr => {
      const ingresoAt = tr.dataset.ingresoAt;
      const td = tr.querySelector('.tiempo');
      if (td && ingresoAt) td.textContent = humanDiff(ingresoAt);
    });
  }, 1000);
}

async function recargar() {
  const { rows } = await listarIngresos(1, 50);
  renderTabla(rows);
}

/* ================================
   Export helpers (Seguridad) — TODAS las páginas
   ================================ */

// Lee headers de la tabla y decide qué columnas exportar
function segGetHeadersForExport() {
  const headers = Array.from(document.querySelectorAll('#tabla-ingresos thead th'))
    .map(th => th.textContent.trim());
  // Ignoramos "Acciones", exportamos también "Tiempo dentro" (snapshot)
  const IGNORE = new Set(['Acciones']);
  const idx = headers.map((h,i)=> IGNORE.has(h) ? null : i).filter(i => i !== null);
  return { headers: idx.map(i => headers[i]), idx };
}

// Mapea una fila (obj del backend) a las columnas exportables
function segMapRowForExport(row, headerNames) {
  const tiempo = row.estado === 'DENTRO'
    ? humanDiff(row.ingreso_at)
    : (row.duration_seconds != null ? fmtDurSeconds(row.duration_seconds) : '-');

  const dict = {
    'Nombre': row.nombre || '',
    'DNI': row.dni || '',
    'Celular': row.celular || '',
    'Motivo': row.motivo || '',
    'Ingreso': row.ingreso_at ? fmtFechaHora(row.ingreso_at) : '',
    'Estado': row.estado || '',
    'Tiempo dentro': tiempo
  };
  return headerNames.map(h => (dict[h] ?? ''));
}

// CSV
function segToCSV(headers, rows, sep=',') {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g,'""');
    return (s.includes('"') || s.includes('\n') || s.includes(sep)) ? `"${s}"` : s;
  };
  const lines = [ headers.map(esc).join(sep), ...rows.map(r => r.map(esc).join(sep)) ];
  return lines.join('\n');
}

// Descargar blob
function segDownloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

// PDF (sin inline styles/scripts → CSP ok)
function segOpenPrintPDF(title, headers, rows) {
  const w = window.open('', '_blank');
  if (!w) { alert('Popup bloqueado. Permití ventanas para exportar PDF.'); return; }

  const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
  const tbody = rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('');

  w.document.open();
  w.document.write(`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <link rel="stylesheet" href="/styles/print-export.css">
    </head>
    <body>
      <h3 class="title">${title}</h3>
      <table class="export">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>
    </body>
  </html>`);
  w.document.close();

  w.addEventListener('load', () => {
    try { w.focus(); w.print(); } catch {}
    setTimeout(() => { try { w.close(); } catch {} }, 300);
  });
}

// Traer TODAS las páginas de /api/ingresos (usa la paginación nueva del backend)
async function segFetchAllIngresos(maxPerPage = 1000) {
  let all = [];
  let total = 0;
  let cur = 1;

  while (true) {
    const qs = new URLSearchParams({ page: String(cur), pageSize: String(maxPerPage) }).toString();
    const res = await fetch(`/api/ingresos?${qs}`, { headers: authHeaders() });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { rows: [], total: 0 }; }

    const rows = Array.isArray(data.rows) ? data.rows : [];
    all.push(...rows);
    total = Number(data.total || all.length);

    if (all.length >= total || rows.length === 0) break;
    cur += 1;
    if (cur > 50) break; // safety cap
  }

  return all;
}

function segNowStamp() {
  return new Date().toISOString().replace(/[:T]/g,'-').slice(0,16);
}

document.addEventListener('DOMContentLoaded', () => {
  el.form = document.getElementById('form-ingreso');
  el.tbody = document.querySelector('#tabla-ingresos tbody');

  // Envío del formulario
  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(el.form);
    const payload = {
      nombre:  (fd.get('nombre')  || '').trim(),
      dni:     (fd.get('dni')     || '').trim(),
      celular: (fd.get('celular') || '').trim(),
      motivo:  (fd.get('motivo')  || '').trim()
    };

    if (!payload.nombre || !payload.dni || !payload.celular || !payload.motivo) {
      alert('Completá todos los campos.');
      return;
    }

    const btn = el.form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const r = await crearIngreso(payload);
    btn.disabled = false;

    if (r && r.ok) {
      el.form.reset();
      await recargar();
    } else {
      alert(r.error || 'No se pudo registrar el ingreso');
    }
  });

  // Delegación para botón Egreso
  document.getElementById('tabla-ingresos').addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-egreso');
    if (!btn) return;
    const id = btn.dataset.id;
    btn.disabled = true;
    const r = await marcarEgreso(id);
    btn.disabled = false;

    if (r && r.ok) {
      await recargar();
    } else {
      alert(r.error || 'No se pudo marcar el egreso');
    }
  });

  // Cargar tabla inicial
  recargar();

  // --- Logout ---
  document.getElementById('btn-logout')?.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/index.html'; // o al login que uses
  });

  // --- Exportar Excel (todas las páginas) ---
  document.getElementById('btn-seg-export-excel')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-seg-export-excel');
    btn.disabled = true;
    try {
      const { headers } = segGetHeadersForExport();
      const data = await segFetchAllIngresos(1000);
      if (!data.length) { alert('No hay datos para exportar.'); return; }
      const rows = data.map(r => segMapRowForExport(r, headers));
      const csv = segToCSV(headers, rows, ','); // si Excel separa mal, probá ';'
      segDownloadBlob(`seguridad-ingresos-${segNowStamp()}.csv`, 'text/csv;charset=utf-8', csv);
    } finally {
      btn.disabled = false;
    }
  });

  // --- Exportar PDF (todas las páginas) ---
  document.getElementById('btn-seg-export-pdf')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-seg-export-pdf');
    btn.disabled = true;
    try {
      const { headers } = segGetHeadersForExport();
      const data = await segFetchAllIngresos(1000);
      if (!data.length) { alert('No hay datos para exportar.'); return; }
      const rows = data.map(r => segMapRowForExport(r, headers));
      segOpenPrintPDF('Ingresos manuales - Seguridad', headers, rows);
    } finally {
      btn.disabled = false;
    }
  });
});
