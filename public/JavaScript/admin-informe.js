(function () {
  const token = localStorage.getItem('token');
  if (!token) return (location.href = '/index.html');

  // Bloqueo extra si no es admin
  document.addEventListener('DOMContentLoaded', () => {
    if (window.CURRENT_USER && window.CURRENT_USER.role !== 'admin') {
      return (location.href = '/paginas/inicio.html');
    }
  });

  const $form  = document.getElementById('filtros');
  const $tbody = document.querySelector('#tblLogs tbody');
  const $pager = document.getElementById('pager');
  const $checkAll = document.getElementById('check-all');

  let page = 1,
      pageSize = 10,
      sortBy = 'l.scanned_at',
      sortDir = 'desc';

  /* ===================== QUERY ===================== */

  function buildQueryString() {
    const q     = document.getElementById('q').value.trim();
    const turno = document.getElementById('turno').value;
    const anio  = document.getElementById('anio').value;
    const rol   = document.getElementById('rol')?.value;
    const fromD = document.getElementById('fromDate')?.value;
    const toD   = document.getElementById('toDate')?.value;

    const p = new URLSearchParams({ page, pageSize, sortBy, sortDir });
    if (q) p.set('q', q);
    if (turno) p.set('turno', turno);
    if (anio) p.set('anio', anio);
    if (rol) p.set('rol', rol);
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
    try { data = JSON.parse(text); }
    catch { data = { rows: [], total: 0, page, pageSize }; }

    renderTable(data.rows || []);
    renderPager(data.total || 0, data.page || 1, data.pageSize || pageSize);
    updateSortIndicators();
  }

  /* ===================== TABLA ===================== */

  function renderTable(rows) {
    $tbody.innerHTML = '';
    if ($checkAll) $checkAll.checked = false;

    for (const r of rows) {
      const tr = document.createElement('tr');

      const fh = r.scanned_at
        ? new Date(r.scanned_at).toLocaleString('es-AR', { hour12: false })
        : '';

      tr.innerHTML = `
        <td>${fh}</td>
        <td>${r.apellido || ''}</td>
        <td>${r.nombre || ''}</td>
        <td>${r.username || ''}</td>
        <td>${r.dni || ''}</td>
        <td>${r.anio || ''}</td>
        <td>${r.turno || ''}</td>
        <td class="${r.within_shift ? 'text-success' : 'text-danger'}">
          ${r.within_shift ? 'Dentro de turno' : 'Fuera de turno'}
        </td>
        <td class="text-center">
          <input type="checkbox"
                 class="form-check-input selector-check"
                 data-id="${r.id}">
        </td>
      `;
      $tbody.appendChild(tr);
    }
  }

  /* ===================== PAGINADO ===================== */

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
          load();
        }
      };
      li.appendChild(a);
      $pager.appendChild(li);
    };

    mk(Math.max(1, cur - 1), '«', cur === 1);
    for (let i = 1; i <= pages && i <= 10; i++) mk(i, i, false, i === cur);
    mk(Math.min(pages, cur + 1), '»', cur === pages);
  }

  /* ===================== ORDEN ===================== */

  function updateSortIndicators() {
    document.querySelectorAll('#tblLogs thead th[data-k]').forEach(th => {
      th.removeAttribute('data-sort');
      if (th.dataset.k === sortBy) th.setAttribute('data-sort', sortDir);
    });
  }

  document.querySelectorAll('#tblLogs thead th[data-k]').forEach(th => {
    th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (sortBy === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortBy = k; sortDir = 'asc'; }
      page = 1;
      load();
    });
  });

  /* ===================== SELECCIÓN ===================== */

  function getSelectedIds() {
    return Array.from(document.querySelectorAll('.selector-check:checked'))
      .map(ch => String(ch.dataset.id));
  }

  $checkAll?.addEventListener('change', e => {
    document.querySelectorAll('.selector-check').forEach(ch => {
      ch.checked = e.target.checked;
    });
  });

  /* ===================== EXPORT ===================== */

  function getHeadersForExport() {
    const headers = Array.from(document.querySelectorAll('#tblLogs thead th'))
      .map(th => th.textContent.trim());
    return headers.filter(h => h !== 'Selector');
  }

  function mapRowForExport(r, headers) {
    const fh = r.scanned_at
      ? new Date(r.scanned_at).toLocaleString('es-AR', { hour12: false })
      : '';

    const map = {
      'Fecha/Hora': fh,
      'Apellido': r.apellido || '',
      'Nombre': r.nombre || '',
      'Usuario': r.username || '',
      'DNI': r.dni || '',
      'Año': r.anio || '',
      'Turno': r.turno || '',
      'Condición': r.within_shift ? 'Dentro de turno' : 'Fuera de turno'
    };

    return headers.map(h => map[h] ?? '');
  }

  async function safeJson(res) {
    const t = await res.text();
    try { return JSON.parse(t); } catch { return null; }
  }

  async function fetchAllRows(max = 1000) {
    const base = new URLSearchParams(buildQueryString());
    base.set('pageSize', max);

    let all = [];
    let cur = 1;

    while (true) {
      base.set('page', cur);
      const res = await fetch('/api/admin/logs?' + base.toString(), {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await safeJson(res) || {};
      const rows = data.rows || [];
      all.push(...rows);
      if (all.length >= data.total || rows.length === 0 || cur > 50) break;
      cur++;
    }
    return all;
  }

  async function getRowsForExport() {
    const selected = getSelectedIds();
    const all = await fetchAllRows(1000);
    return selected.length ? all.filter(r => selected.includes(String(r.id))) : all;
  }

  function toCSV(headers, rows) {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [
      headers.map(esc).join(','),
      ...rows.map(r => r.map(esc).join(','))
    ].join('\n');
  }

  function downloadBlob(name, mime, content) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }


/* ===== PDF  ===== */

document.getElementById('btn-admin-export-pdf')
  ?.addEventListener('click', async () => {

    const headers = getHeadersForExport();
    const data = await getRowsForExport();
    if (!data.length) return alert('No hay datos para exportar');

    const rows = data.map(r => mapRowForExport(r, headers));

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'A4'
    });

    const title = 'Informe de accesos';
    const fecha = new Date().toLocaleString('es-AR', { hour12: false });

    doc.setFontSize(14);
    doc.text(title, 40, 40);

    doc.setFontSize(9);
    doc.text(`Generado: ${fecha}`, 40, 58);

    doc.autoTable({
      startY: 70,
      head: [headers],
      body: rows,
      styles: {
        fontSize: 8,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 20,
        fontStyle: 'bold'
      },
      margin: { left: 40, right: 40 },
      theme: 'grid'
    });

    doc.save(
      `admin-logs-${new Date().toISOString().slice(0,16)}.pdf`
    );
  });


  /* ===== CSV (Excel compatible) ===== */

  document.getElementById('btn-admin-export-excel')
    ?.addEventListener('click', async () => {
      const headers = getHeadersForExport();
      const data = await getRowsForExport();
      if (!data.length) return alert('No hay datos para exportar');

      const rows = data.map(r => mapRowForExport(r, headers));
      const csv = '\uFEFF' + toCSV(headers, rows);

      downloadBlob(
        `admin-logs-${new Date().toISOString().slice(0,16)}.csv`,
        'text/csv;charset=utf-8',
        csv
      );
    });

  /* ===== EXCEL REAL (.xlsx) ===== */

  document.getElementById('btn-admin-export-xlsx')
    ?.addEventListener('click', async () => {
      const headers = getHeadersForExport();
      const data = await getRowsForExport();
      if (!data.length) return alert('No hay datos para exportar');

      const rows = data.map(r => mapRowForExport(r, headers));
      const sheetData = [headers, ...rows];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      ws['!cols'] = headers.map((h, i) => ({
        wch: Math.max(
          h.length,
          ...rows.map(r => String(r[i] ?? '').length)
        ) + 2
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Informe');

      XLSX.writeFile(
        wb,
        `admin-logs-${new Date().toISOString().slice(0,16)}.xlsx`
      );
    });

  /* ===================== FILTROS ===================== */

  $form?.addEventListener('submit', e => {
    e.preventDefault();
    page = 1;
    load();
  });

  load();
})();