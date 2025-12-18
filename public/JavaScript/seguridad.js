// public/JavaScript/seguridad.js
const API = '/api/ingresos';
const token = localStorage.getItem('token');
if (!token) location.href = '/index.html';

/* ============================== DOM refs ============================== */
const $tbody = document.querySelector('#tabla-ingresos tbody');
const $pager = document.getElementById('seg-pager');
const $checkAll = document.getElementById('select-all');

let page = 1;
let pageSize = 5;
let totalRows = 0;

/* ============================== Utils ============================== */
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

/* ============================== API ============================== */
async function safeJson(res) {
  const t = await res.text();
  try { return JSON.parse(t); } catch { return null; }
}

async function fetchRows(p = page, size = pageSize) {
  const qs = new URLSearchParams({ page: p, pageSize: size }).toString();
  const res = await fetch(`${API}?${qs}`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  return safeJson(res) || { rows: [], total: 0 };
}

async function fetchAllRows(max = 1000) {
  let all = [];
  let cur = 1;
  while (true) {
    const qs = new URLSearchParams({ page: cur, pageSize: max }).toString();
    const res = await fetch(`${API}?${qs}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await safeJson(res) || { rows: [], total: 0 };
    all.push(...data.rows);
    if (all.length >= data.total || data.rows.length === 0 || cur > 50) break;
    cur++;
  }
  return all;
}

/* ============================== Render tabla ============================== */
let tickTimer = null;
function renderTable(rows) {
  $tbody.innerHTML = '';
  if ($checkAll) $checkAll.checked = false;

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    tr.dataset.ingresoAt = row.ingreso_at;
    if (row.estado === 'DENTRO') tr.classList.add('alerta-dentro');

    tr.innerHTML = `
      <td>${row.nombre}</td>
      <td>${row.dni}</td>
      <td>${row.celular}</td>
      <td>${row.motivo}</td>
      <td>${fmtFechaHora(row.ingreso_at)}</td>
      <td>${row.estado}</td>
      <td class="tiempo">
        ${row.estado === 'DENTRO' ? humanDiff(row.ingreso_at) : '-'}
      </td>
      <td>${row.creado_por || '—'}</td>
      <td>
        ${row.estado === 'DENTRO'
          ? `<button class="btn-egreso nav-seguridad" data-id="${row.id}">Egreso</button>`
          : '—'}
      </td>
      <td><input type="checkbox" class="selector-check" data-id="${row.id}"></td>
    `;
    $tbody.appendChild(tr);
  });

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    document.querySelectorAll('tr.alerta-dentro').forEach(tr => {
      const td = tr.querySelector('.tiempo');
      if (td) td.textContent = humanDiff(tr.dataset.ingresoAt);
    });
  }, 1000);
}

/* ============================== Paginador ============================== */
/* ============================== PAGINADOR INTELIGENTE ============================== */
function renderPager(total, cur, size) {
  $pager.innerHTML = '';
  const pages = Math.max(1, Math.ceil(total / size));

  const mk = (p, text, disabled = false, active = false) => {
    const li = document.createElement('li');
    li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.textContent = text;
    a.onclick = e => {
      e.preventDefault();
      if (!disabled && p !== page) {
        page = p;
        load(); // recarga la tabla con la nueva página
      }
    };
    li.appendChild(a);
    $pager.appendChild(li);
  };

  // Botón «« para ir a la página anterior
  mk(Math.max(1, cur - 1), '«', cur === 1);

  // Mostrar hasta 10 páginas
  const start = Math.max(1, cur - 4); // intenta centrar la página actual
  const end = Math.min(pages, start + 9);
  for (let i = start; i <= end; i++) mk(i, i, false, i === cur);

  // Botón »» para ir a la página siguiente
  mk(Math.min(pages, cur + 1), '»', cur === pages);
}


/* ============================== Helpers export ============================== */
function getSelectedIds() {
  return Array.from(document.querySelectorAll('.selector-check:checked'))
    .map(ch => String(ch.dataset.id));
}

function getHeaders() {
  return Array.from(document.querySelectorAll('#tabla-ingresos thead th'))
    .map(th => th.textContent.trim())
    .filter(h => h !== '');
}

function mapRow(row, headers) {
  const map = {
    'Nombre': row.nombre,
    'DNI': row.dni,
    'Celular': row.celular,
    'Motivo': row.motivo,
    'Ingreso': fmtFechaHora(row.ingreso_at),
    'Estado': row.estado,
    'Tiempo': row.estado === 'DENTRO' ? humanDiff(row.ingreso_at) : '-',
    'Creado por': row.creado_por || '—',
    'Acción': ''
  };
  return headers.map(h => map[h] ?? '');
}

async function getRowsForExport() {
  const selected = getSelectedIds();
  const all = await fetchAllRows(1000);
  return selected.length ? all.filter(r => selected.includes(String(r.id))) : all;
}

function toCSV(headers, rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
}

function downloadBlob(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================== Export handlers ============================== */
document.getElementById('btn-export-csv')?.addEventListener('click', async () => {
  const headers = getHeaders();
  const data = await getRowsForExport();
  if (!data.length) return alert('No hay datos para exportar');
  const rows = data.map(r => mapRow(r, headers));
  downloadBlob(`ingresos-${new Date().toISOString().slice(0,16)}.csv`, 'text/csv;charset=utf-8', '\uFEFF' + toCSV(headers, rows));
});

document.getElementById('btn-export-xlsx')?.addEventListener('click', async () => {
  const headers = getHeaders();
  const data = await getRowsForExport();
  if (!data.length) return alert('No hay datos para exportar');
  const rows = data.map(r => mapRow(r, headers));
  const sheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');
  XLSX.writeFile(wb, `ingresos-${new Date().toISOString().slice(0,16)}.xlsx`);
});

document.getElementById('btn-export-pdf')?.addEventListener('click', async () => {
  const headers = getHeaders();
  const data = await getRowsForExport();
  if (!data.length) return alert('No hay datos para exportar');
  const rows = data.map(r => mapRow(r, headers));
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
  doc.setFontSize(14);
  doc.text('Informe de ingresos', 40, 40);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString('es-AR', { hour12: false })}`, 40, 58);
  doc.autoTable({
    startY: 70,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [230,230,230], textColor: 20, fontStyle: 'bold' },
    margin: { left: 40, right: 40 },
    theme: 'grid'
  });
  doc.save(`ingresos-${new Date().toISOString().slice(0,16)}.pdf`);
});

/* ============================== Select all ============================== */
$checkAll?.addEventListener('change', e => {
  document.querySelectorAll('.selector-check').forEach(ch => ch.checked = e.target.checked);
});

/* ============================== Egreso ============================== */
document.getElementById('tabla-ingresos')?.addEventListener('click', async e => {
  const btn = e.target.closest('.btn-egreso');
  if (!btn) return;
  const res = await fetch(`${API}/${btn.dataset.id}/egreso`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token }
  });
  const r = await safeJson(res);
  if (r?.ok) load();
  else alert(r?.error || 'Error al marcar egreso');
});

/* ============================== Load ============================== */
async function load() {
  const data = await fetchRows(page, pageSize);
  totalRows = data.total || 0;
  renderTable(data.rows || []);
  renderPager(totalRows, page, pageSize);
}

/* ============================== Nuevo ingreso ============================== */
const $formIngreso = document.getElementById('form-ingreso');

$formIngreso?.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData($formIngreso);
  const ingreso = {
    nombre: formData.get('nombre')?.trim(),
    dni: formData.get('dni')?.trim(),
    celular: formData.get('celular')?.trim(),
    motivo: formData.get('motivo')?.trim()
  };

  // Array para acumular errores
  const errores = [];

  // Validaciones
  if (!ingreso.nombre) errores.push('El campo "Nombre" es obligatorio');
  else if (ingreso.nombre.length < 3) errores.push('El "Nombre" debe tener al menos 3 caracteres');
  else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(ingreso.nombre)) errores.push('El "Nombre" solo puede contener letras y espacios');

  if (!ingreso.dni) errores.push('El campo "DNI" es obligatorio');
  else if (!/^\d{7,10}$/.test(ingreso.dni)) errores.push('DNI inválido (7-10 dígitos)');

  if (!ingreso.celular) errores.push('El campo "Celular" es obligatorio');
  else if (!/^\d{6,15}$/.test(ingreso.celular)) errores.push('Celular inválido');

  if (!ingreso.motivo) errores.push('El campo "Motivo" es obligatorio');
  else if (ingreso.motivo.length < 5) errores.push('El "Motivo" debe tener al menos 5 caracteres');
  else if (!/^[\w\s.,¡!¿?()-]+$/.test(ingreso.motivo)) errores.push('El "Motivo" contiene caracteres inválidos');

  // Mostrar todos los errores en un solo alert
  if (errores.length) {
    return alert('Por favor corrija los siguientes errores:\n\n' + errores.join('\n'));
  }

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(ingreso)
    });
    const r = await safeJson(res);
    if (r?.ok) {
      alert('Ingreso registrado correctamente');
      $formIngreso.reset();
      load();
    } else {
      alert(r?.error || 'Error al registrar ingreso');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.clear();
    location.href = '/index.html';
  });
  load();
});