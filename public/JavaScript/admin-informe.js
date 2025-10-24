// public/JavaScript/admin-informe.js
(function () {
  const token = localStorage.getItem('token');
  if (!token) return (location.href = '/index.html');

  // (extra) si common.js ya cargó CURRENT_USER, bloqueamos no-admin
  document.addEventListener('DOMContentLoaded', () => {
    if (window.CURRENT_USER && window.CURRENT_USER.role !== 'admin') {
      return (location.href = '/paginas/inicio.html');
    }
  });

  const $form  = document.getElementById('filtros');
  const $tbody = document.querySelector('#tblLogs tbody');
  const $pager = document.getElementById('pager');

  let page = 1,
      pageSize = 10,
      sortBy = 'l.scanned_at',
      sortDir = 'desc';

  function buildQueryString() {
    const q      = document.getElementById('q').value.trim();
    const turno  = document.getElementById('turno').value;
    const anio   = document.getElementById('anio').value;
    const fromD  = document.getElementById('fromDate')?.value; // 'YYYY-MM-DD' o ''
    const toD    = document.getElementById('toDate')?.value;   // 'YYYY-MM-DD' o ''
    const rol    = document.getElementById('rol')?.value;

    const p = new URLSearchParams({ page, pageSize, sortBy, sortDir });
    if (q)     p.set('q', q);
    if (turno) p.set('turno', turno);
    if (anio)  p.set('anio', anio);
    if (rol)   p.set('rol', rol);

    // convertir fecha sola a rango del día completo
    if (fromD) p.set('from', `${fromD} 00:00:00`);
    if (toD)   p.set('to',   `${toD} 23:59:59`);

    return p.toString();
  }

  async function load() {
    const res = await fetch('/api/admin/logs?' + buildQueryString(), {
      headers: { Authorization: 'Bearer ' + token },
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { rows: [], total: 0, page, pageSize }; }

    renderTable(data.rows || []);
    renderPager(data.total || 0, data.page || 1, data.pageSize || pageSize);
    updateSortIndicators();
  }

  function renderTable(rows) {
    $tbody.innerHTML = '';
    for (const r of rows) {
      const tr = document.createElement('tr');
      const fh = r.scanned_at ? new Date(r.scanned_at).toLocaleString('es-AR', { hour12: false }) : '';
      const condicion = r.within_shift ? 'Dentro de turno' : 'Fuera de turno';
      tr.innerHTML = `
        <td>${fh}</td>
        <td>${r.apellido || ''}</td>
        <td>${r.nombre   || ''}</td>
        <td>${r.username || ''}</td>
        <td>${r.dni      || ''}</td>
        <td>${r.anio     || ''}</td>
        <td>${r.turno    || ''}</td>
        <td class="${r.within_shift ? 'text-success' : 'text-danger'}">${condicion}</td>
        <td>${r.selector ?? ''}</td>
      `;
      $tbody.appendChild(tr);
    }
  }

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
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (!disabled && p !== page) {
          page = p;
          load();
        }
      });
      li.appendChild(a);
      $pager.appendChild(li);
    };

    mk(Math.max(1, cur - 1), '«', cur === 1);
    for (let i = 1; i <= pages && i <= 10; i++) mk(i, String(i), false, i === cur);
    mk(Math.min(pages, cur + 1), '»', cur === pages);
  }

  // Indicadores de orden en <th> (usar CSS, nada inline)
  function updateSortIndicators() {
    document.querySelectorAll('#tblLogs thead th[data-k]').forEach((th) => {
      th.removeAttribute('data-sort');
      if (th.getAttribute('data-k') === sortBy) {
        th.setAttribute('data-sort', sortDir); // 'asc' | 'desc'
      }
    });
  }

  // ===== Helpers de exportación (exportan TODO el dataset con los filtros actuales) =====

  // Lee headers actuales del DOM y define cuáles ignorar en exportación
  function getHeadersForExport() {
    const headers = Array.from(document.querySelectorAll('#tblLogs thead th'))
      .map(th => th.textContent.trim());
    const IGNORE = new Set(['Acciones','Acción','Action','Editar','Eliminar','Opciones','Selector']);
    const idx = headers.map((h,i)=> IGNORE.has(h) ? null : i).filter(i => i !== null);
    return { headers: idx.map(i=> headers[i]), idx };
  }

  // Mapea una fila de datos a columnas según los headers de la tabla
  function mapRowForExport(row, headerNames) {
    // Orden esperado por tus encabezados visibles (excepto ignorados)
    // ['Fecha/Hora','Apellido','Nombre','Usuario','DNI','Año','Turno','Condición']
    const fh = row.scanned_at ? new Date(row.scanned_at).toLocaleString('es-AR', { hour12: false }) : '';
    const condicion = row.within_shift ? 'Dentro de turno' : 'Fuera de turno';

    const dict = {
      'Fecha/Hora': fh,
      'Apellido': row.apellido || '',
      'Nombre': row.nombre || '',
      'Usuario': row.username || '',
      'DNI': row.dni || '',
      'Año': row.anio || '',
      'Turno': row.turno || '',
      'Condición': condicion
      // 'Selector' se ignora
    };

    return headerNames.map(h => (dict[h] ?? ''));
  }

  // Descarga blob
  function downloadBlob(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  // Convierte a CSV
  function toCSV(headers, rows, sep = ',') {
    const esc = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return (s.includes('"') || s.includes('\n') || s.includes(sep)) ? `"${s}"` : s;
    };
    const lines = [ headers.map(esc).join(sep), ...rows.map(r => r.map(esc).join(sep)) ];
    return lines.join('\n');
  }

  // PDF sin estilos/scripts inline (CSP-friendly)
  function openPrintPDF(title, headers, rows) {
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

  // Lee JSON seguro (si backend falla y devuelve HTML no rompe)
  async function safeJson(res) {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return null; }
  }

  // Trae TODAS las filas paginando en el backend con los mismos filtros
  async function fetchAllRows(maxPerPage = 1000) {
    const base = new URLSearchParams(buildQueryString());
    base.set('pageSize', String(maxPerPage));
    let all = [];
    let total = 0;
    let cur = 1;

    while (true) {
      base.set('page', String(cur));
      const res = await fetch('/api/admin/logs?' + base.toString(), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await safeJson(res) || {};
      const rows = Array.isArray(data.rows) ? data.rows : [];
      all.push(...rows);

      total = Number(data.total || all.length);
      if (all.length >= total || rows.length === 0) break;

      cur += 1;
      // por si hay algún límite lógico, corta en 50 páginas (~50k registros)
      if (cur > 50) break;
    }

    return all;
  }

  // filtros
  $form?.addEventListener('submit', (e) => {
    e.preventDefault();
    page = 1;
    load();
  });

  // ordenar por encabezado (sin inline styles)
  document.querySelectorAll('#tblLogs thead th[data-k]')?.forEach((th) => {
    th.addEventListener('click', () => {
      const k = th.getAttribute('data-k');
      if (sortBy === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else {
        sortBy = k;
        sortDir = 'asc';
      }
      page = 1;
      load();
    });
  });

  // export CSV del backend (ya lo tenías)
  document.getElementById('btnExportCsv')?.addEventListener('click', () => {
    location.href = '/api/admin/logs/export?format=csv&' + buildQueryString();
  });

  // ✅ Exportar Excel (CSV) — TODAS las páginas
  document.getElementById('btn-admin-export-excel')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-admin-export-excel');
    btn.disabled = true;
    try {
      const { headers } = getHeadersForExport();
      const data = await fetchAllRows(1000); // trae todo con los filtros actuales
      if (!data.length) { alert('No hay datos para exportar.'); return; }
      const rows = data.map(r => mapRowForExport(r, headers));
      const csv = toCSV(headers, rows, ','); // si Excel separa mal, probá ';'
      const name = `admin-logs-${new Date().toISOString().replace(/[:T]/g,'-').slice(0,16)}.csv`;
      downloadBlob(name, 'text/csv;charset=utf-8', csv);
    } finally {
      btn.disabled = false;
    }
  });

  // ✅ Exportar PDF — TODAS las páginas
  document.getElementById('btn-admin-export-pdf')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-admin-export-pdf');
    btn.disabled = true;
    try {
      const { headers } = getHeadersForExport();
      const data = await fetchAllRows(1000);
      if (!data.length) { alert('No hay datos para exportar.'); return; }
      const rows = data.map(r => mapRowForExport(r, headers));
      openPrintPDF('Informe de accesos - Admin', headers, rows);
    } finally {
      btn.disabled = false;
    }
  });

  // init
  load();
})();