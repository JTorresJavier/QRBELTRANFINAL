// public/JavaScript/calendario.js
(function () {
  const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const tokenDay = d => ['dom','lun','mar','mie','jue','vie','sab'][d];
  const fullMonth = (y, m) => new Date(y, m, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  let WEEKLY = null;           // { lun:[{subject,teacher,start,end}], ... }
  let meta = { anio: null, turno: null };
  let cur = new Date();        // mes actual a mostrar (clonado)

  const $title  = document.getElementById('calTitle');
  const $grid   = document.getElementById('calMes');
  const $grilla = document.getElementById('calGrilla');
  const $grillaBody = document.getElementById('calGrillaBody');

  async function fetchSchedule() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/student/schedule', { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('schedule');
    const data = await res.json();
    WEEKLY = data.weekly || {};
    meta.anio = data.anio; meta.turno = data.turno;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function renderMonth(date) {
    if (!WEEKLY) return;
    clear($grid);

    const y = date.getFullYear();
    const m = date.getMonth();
    $title.textContent = `${fullMonth(y, m)} · Año ${meta.anio} · Turno ${meta.turno}`;

    // encabezados
    dayNames.forEach(n => {
      const h = document.createElement('div');
      h.className = 'cal-cell cal-head';
      h.textContent = n;
      $grid.appendChild(h);
    });

    const first = new Date(y, m, 1);
    const startWeekday = first.getDay(); // 0=dom..6=sab
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    // celdas previas (mes anterior)
    for (let i = 0; i < startWeekday; i++) {
      const c = document.createElement('div');
      c.className = 'cal-cell cal-empty';
      $grid.appendChild(c);
    }

    // días del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';

      const dt = new Date(y, m, d);
      const wd = dt.getDay();                   // 0..6
      const tk = tokenDay(wd);                  // 'lun'..'sab'
      const classes = WEEKLY[tk] || [];

      const head = document.createElement('div');
      head.className = 'cal-date';
      head.textContent = d.toString().padStart(2,'0');
      cell.appendChild(head);

      if (classes.length === 0) {
        const none = document.createElement('div');
        none.className = 'cal-empty';
        none.textContent = '—';
        cell.appendChild(none);
      } else {
        classes.forEach(c => {
          const item = document.createElement('div');
          item.className = 'cal-class';
          item.textContent = `${c.start}-${c.end} · ${c.subject}`;
          item.title = `Docente: ${c.teacher}`;
          cell.appendChild(item);
        });
      }

      $grid.appendChild(cell);
    }

    // completar fila final con vacíos si hace falta (para cuadrar)
    const totalCells = 7 /*headers*/ + startWeekday + daysInMonth;
    const mod = totalCells % 7;
    if (mod !== 0) {
      for (let i = 0; i < (7 - mod); i++) {
        const c = document.createElement('div');
        c.className = 'cal-cell cal-empty';
        $grid.appendChild(c);
      }
    }
  }

  function renderGrilla() {
    if (!WEEKLY) return;
    clear($grillaBody);

    const order = ['lun','mar','mie','jue','vie','sab'];
    const names = { lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado', dom:'Domingo' };

    order.forEach(tk => {
      const diaBox = document.createElement('div');
      diaBox.className = 'dia';
      const title = document.createElement('div');
      title.className = 'dia-title';
      title.textContent = names[tk] || tk;
      diaBox.appendChild(title);

      const items = WEEKLY[tk] || [];
      if (items.length === 0) {
        const p = document.createElement('div');
        p.className = 'cal-empty';
        p.textContent = '—';
        diaBox.appendChild(p);
      } else {
        items.forEach(c => {
          const row = document.createElement('div');
          row.className = 'clase';
          row.textContent = `${c.start}-${c.end} · ${c.subject} · Docente: ${c.teacher}`;
          diaBox.appendChild(row);
        });
      }

      $grillaBody.appendChild(diaBox);
    });
  }

  // navegación
  document.getElementById('calPrev')?.addEventListener('click', () => {
    cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
    renderMonth(cur);
  });
  document.getElementById('calNext')?.addEventListener('click', () => {
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    renderMonth(cur);
  });

  // toggle vistas
  const $btnMes = document.getElementById('btnVistaMes');
  const $btnGrid = document.getElementById('btnVistaGrilla');
  $btnMes?.addEventListener('click', () => {
    $btnMes.classList.add('btn-primary'); $btnMes.classList.remove('btn-outline-primary');
    $btnGrid.classList.remove('btn-primary'); $btnGrid.classList.add('btn-outline-primary');
    $grid.classList.remove('d-none'); $grid.setAttribute('aria-hidden', 'false');
    $grilla.classList.add('d-none');  $grilla.setAttribute('aria-hidden', 'true');
  });
  $btnGrid?.addEventListener('click', () => {
    $btnGrid.classList.add('btn-primary'); $btnGrid.classList.remove('btn-outline-primary');
    $btnMes.classList.remove('btn-primary'); $btnMes.classList.add('btn-outline-primary');
    $grid.classList.add('d-none');   $grid.setAttribute('aria-hidden', 'true');
    $grilla.classList.remove('d-none'); $grilla.setAttribute('aria-hidden', 'false');
  });

  // cuando se abre el modal, cargamos (una sola vez por apertura)
  const modalEl = document.getElementById('calModal');
  modalEl?.addEventListener('show.bs.modal', async () => {
    try {
      await fetchSchedule();
      cur = new Date(); // mes actual
      renderMonth(cur);
      renderGrilla();
      // default vista Mes
      $btnMes.click();
    } catch {
      clear($grid);
      $grid.innerHTML = '<div class="text-danger">No se pudo cargar el calendario.</div>';
    }
  });
})();
