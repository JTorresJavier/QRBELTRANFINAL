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

    const p = new URLSearchParams({ page, pageSize, sortBy, sortDir });
    if (q)     p.set('q', q);
    if (turno) p.set('turno', turno);
    if (anio)  p.set('anio', anio);

    // 👇 convertir fecha sola a rango del día completo
    if (fromD) p.set('from', `${fromD} 00:00:00`);
    if (toD)   p.set('to',   `${toD} 23:59:59`);

    return p.toString();
  }

  async function load() {
    const res = await fetch('/api/admin/logs?' + buildQueryString(), {
      headers: { Authorization: 'Bearer ' + token },
    });
    const data = await res.json();
    renderTable(data.rows || []);
    renderPager(data.total || 0, data.page || 1, data.pageSize || pageSize);
    updateSortIndicators();
  }

  function renderTable(rows) {
    $tbody.innerHTML = '';
    for (const r of rows) {
      const tr = document.createElement('tr');
      const fh = new Date(r.scanned_at).toLocaleString('es-AR', { hour12: false });
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

  // Indicadores de orden en <th> (para tus flechitas CSS)
  function updateSortIndicators() {
    document.querySelectorAll('#tblLogs thead th[data-k]').forEach((th) => {
      th.removeAttribute('data-sort');
      if (th.getAttribute('data-k') === sortBy) {
        th.setAttribute('data-sort', sortDir); // 'asc' | 'desc'
      }
    });
  }

  // filtros
  $form?.addEventListener('submit', (e) => {
    e.preventDefault();
    page = 1;
    load();
  });

  // ordenar por encabezado
  document.querySelectorAll('#tblLogs thead th[data-k]')?.forEach((th) => {
    th.style.cursor = 'pointer';
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

  // export CSV (mismos parámetros)
  document.getElementById('btnExportCsv')?.addEventListener('click', () => {
    location.href = '/api/admin/logs/export?format=csv&' + buildQueryString();
  });

  // init
  load();
})();
