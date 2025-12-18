// public/JavaScript/seguridad.js
const API = '/api/ingresos';

/* ==============================
   Auth helpers
   ============================== */
function getToken() {
  return localStorage.getItem('token');
}
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

/* ==============================
   DOM refs
   ============================== */
const el = {
  form: null,
  tbody: null
};

let tickTimer = null;

/* ==============================
   Utils
   ============================== */
function fmtFechaHora(iso) {
  if (!iso) return '-';
  const d = new Date(String(iso).replace(' ', 'T'));
  return d.toLocaleString('es-AR', { hour12: false });
}

function humanDiff(fromISO) {
  const start = new Date(String(fromISO).replace(' ', 'T')).getTime();
  const now = Date.now();
  let diff = Math.max(0, Math.floor((now - start) / 1000));
  const h = Math.floor(diff / 3600);
  diff %= 3600;
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  const pad = x => String(x).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function fmtDurSeconds(total) {
  const t = Math.max(0, Number(total || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = x => String(x).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/* ==============================
   API
   ============================== */
async function crearIngreso(payload) {
  const res = await fetch(API, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function listarIngresos(page = 1, pageSize = 50) {
  const qs = new URLSearchParams({ page, pageSize }).toString();
  const res = await fetch(`${API}?${qs}`, { headers: authHeaders() });
  return res.json();
}

async function listarIngresosActivos() {
  const res = await fetch(`${API}/activos`, { headers: authHeaders() });
  return res.json();
}

async function marcarEgreso(id) {
  const res = await fetch(`${API}/${id}/egreso`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  return res.json();
}

/* ==============================
   Render tabla
   ============================== */
function renderTabla(rows) {
  el.tbody.innerHTML = '';

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    tr.dataset.ingresoAt = row.ingreso_at;

    if (row.estado === 'DENTRO') {
      tr.classList.add('alerta-dentro');
    }

tr.innerHTML = `
  <td>${row.nombre}</td>
  <td>${row.dni}</td>
  <td>${row.celular}</td>
  <td>${row.motivo}</td>
  <td>${fmtFechaHora(row.ingreso_at)}</td>
  <td>${row.estado}</td>
  <td class="tiempo">
    ${row.estado === 'DENTRO'
      ? humanDiff(row.ingreso_at)
      : fmtDurSeconds(row.duration_seconds)}
  </td>
  <td>${row.creado_por || '—'}</td>
  <td>
    ${row.estado === 'DENTRO'
      ? `<button class="btn-egreso nav-seguridad" data-id="${row.id}">Egreso</button>`
      : '—'}
  </td>
`;
    el.tbody.appendChild(tr);
  });

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    document.querySelectorAll('tr.alerta-dentro').forEach(tr => {
      const td = tr.querySelector('.tiempo');
      if (td) td.textContent = humanDiff(tr.dataset.ingresoAt);
    });
  }, 1000);
}

/* ==============================
   Reload helpers
   ============================== */
async function recargarTodos() {
  const data = await listarIngresos(1, 50);
  renderTabla(data.rows || []);
}

async function recargarActivos() {
  const rows = await listarIngresosActivos();
  renderTabla(rows || []);
}

/* ==============================
   Export helpers
   ============================== */
function segToCSV(headers, rows) {
  const esc = v =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    headers.map(esc).join(','),
    ...rows.map(r => r.map(esc).join(','))
  ].join('\n');
}

function segDownloadBlob(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ==============================
   DOMContentLoaded
   ============================== */
document.addEventListener('DOMContentLoaded', () => {
  el.form = document.getElementById('form-ingreso');
  el.tbody = document.querySelector('#tabla-ingresos tbody');

  /* Crear ingreso */
  el.form?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(el.form);
    const payload = {
      nombre: fd.get('nombre'),
      dni: fd.get('dni'),
      celular: fd.get('celular'),
      motivo: fd.get('motivo')
    };

    const r = await crearIngreso(payload);
    if (r.ok) {
      el.form.reset();
      recargarTodos();
    } else {
      alert(r.error || 'Error');
    }
  });

  /* Egreso */
  document.getElementById('tabla-ingresos')
    .addEventListener('click', async e => {
      const btn = e.target.closest('.btn-egreso');
      if (!btn) return;
      const r = await marcarEgreso(btn.dataset.id);
      if (r.ok) recargarTodos();
      else alert(r.error);
    });

  /* Botones filtros */
  document.getElementById('btn-ver-todos')
    ?.addEventListener('click', recargarTodos);

  document.getElementById('btn-solo-dentro')
    ?.addEventListener('click', recargarActivos);

  /* Logout */
  document.getElementById('btn-logout')
    ?.addEventListener('click', () => {
      localStorage.clear();
      location.href = '/index.html';
    });

  /* Carga inicial */
  recargarTodos();
});
