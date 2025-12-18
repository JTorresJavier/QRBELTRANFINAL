// public/JavaScript/calendario.js
(function () {

  const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const tokenDay = d => ['dom','lun','mar','mie','jue','vie','sab'][d];
  const fullMonth = (y, m) =>
    new Date(y, m, 1).toLocaleString('es-AR', { month:'long', year:'numeric' });

  const token = () => localStorage.getItem('token');
  const isAdmin = () => window.CURRENT_USER?.role === 'admin';

  let WEEKLY = {};
  let meta = { anio:null, turno:null };
  let cur = new Date();
  let currentClass = null; 
  let SUBJECTS = [];

  const $title = document.getElementById('calTitle');
  const $grid = document.getElementById('calMes');
  const $grilla = document.getElementById('calGrilla');
  const $grillaBody = document.getElementById('calGrillaBody');
  const $btnMes = document.getElementById('btnVistaMes');
  const $btnGrid = document.getElementById('btnVistaGrilla');
  const $btnAdd = document.getElementById('btnAgregarClase');

  const $modalClase = new bootstrap.Modal(document.getElementById('modalClase'));
  const $formClase = document.getElementById('formClase');
  const $inputSubject = document.getElementById('inputSubject');
  const $inputTeacher = document.getElementById('inputTeacher');
  const $inputDay = document.getElementById('inputDay');
  const $inputStart = document.getElementById('inputStart');
  const $inputEnd = document.getElementById('inputEnd');

  const clear = el => el.innerHTML = '';
  const findById = id =>
    Object.values(WEEKLY).flat().find(c => String(c.id) === String(id));

  // -----------------------------
  // FETCH
  // -----------------------------
  async function fetchSubjects() {
    try {
      const res = await fetch('/api/admin/subjects', {
        headers: { Authorization: 'Bearer ' + token() }
      });
      if (!res.ok) throw new Error('Error al obtener materias');
      SUBJECTS = await res.json();
      if (isAdmin()) renderSubjects();
    } catch(err) {
      console.warn('No se pudieron cargar las materias', err);
    }
  }

  function renderSubjects() {
    if (!$inputSubject) return;
    clear($inputSubject);
    SUBJECTS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} · Año ${s.anio}`;
      $inputSubject.appendChild(opt);
    });
  }

  async function fetchSchedule() {
    const res = await fetch('/api/student/schedule', {
      headers: { Authorization: 'Bearer ' + token() }
    });
    if (!res.ok) throw new Error('Error al obtener horario');
    const data = await res.json();
    WEEKLY = data.weekly || {};
    meta.anio = data.anio;
    meta.turno = data.turno;
  }

  // -----------------------------
  // RENDER MES
  // -----------------------------
  function renderMonth(date) {
    clear($grid);
    const y = date.getFullYear();
    const m = date.getMonth();
    const todayStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    $title.textContent = `${fullMonth(y,m)} · Año ${meta.anio} · Turno ${meta.turno}`;

    dayNames.forEach(n => {
      const h = document.createElement('div');
      h.className = 'cal-cell cal-head';
      h.textContent = n;
      $grid.appendChild(h);
    });

    const firstDay = new Date(y,m,1).getDay();
    const days = new Date(y,m+1,0).getDate();
    for (let i = 0; i < firstDay; i++) $grid.appendChild(document.createElement('div'));

    for (let d = 1; d <= days; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      const curDate = new Date(y,m,d);
      const wd = tokenDay(curDate.getDay());
      const curDateStr = curDate.toISOString().split('T')[0];
      const items = (WEEKLY[wd] || []).filter(c => !c.date || c.date === curDateStr);
      cell.innerHTML = `<div class="cal-date">${d}</div>`;

      if (!items.length) cell.innerHTML += `<div class="cal-empty">—</div>`;
      else items.forEach(c => {
        cell.innerHTML += `
          <div class="cal-class">
            ${c.start}-${c.end} · ${c.subject}
            ${isAdmin() ? `
              <div class="mt-1 d-flex gap-1">
                <button type="button" class="btn btn-sm btn-outline-primary edit-clase" data-id="${c.id}">✏️</button>
                <button type="button" class="btn btn-sm btn-outline-danger del-clase" data-id="${c.id}">🗑</button>
              </div>` : '' }
          </div>`;
      });

      if (isAdmin()) {
        cell.addEventListener('dblclick', () => openModal({ day: wd, date: curDateStr }));
      }

      $grid.appendChild(cell);
    }
  }

  // -----------------------------
  // RENDER GRILLA
  // -----------------------------
  function renderGrilla() {
    clear($grillaBody);
    const order = ['lun','mar','mie','jue','vie','sab'];
    const names = { lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado' };

    order.forEach(day => {
      const box = document.createElement('div');
      box.className = 'dia';
      box.innerHTML = `<div class="dia-title">${names[day]}</div>`;
      const items = WEEKLY[day] || [];
      if (!items.length) box.innerHTML += `<div class="cal-empty">—</div>`;
      else items.forEach(c => {
        box.innerHTML += `
          <div class="clase">
            ${c.start}-${c.end} · ${c.subject} · ${c.teacher}
            ${isAdmin() ? `
              <div class="mt-1 d-flex gap-1">
                <button type="button" class="btn btn-sm btn-outline-primary edit-clase" data-id="${c.id}">✏️</button>
                <button type="button" class="btn btn-sm btn-outline-danger del-clase" data-id="${c.id}">🗑</button>
              </div>` : '' }
          </div>`;
      });
      $grillaBody.appendChild(box);
    });
  }

  // -----------------------------
  // MODAL AGREGAR / EDITAR
  // -----------------------------
  function openModal(cls = {}) {
    currentClass = cls;
    $inputSubject.value = cls.subject_id || '';
    $inputTeacher.value = cls.teacher || '';
    $inputDay.value = cls.day || 'lun';
    $inputStart.value = cls.start || '';
    $inputEnd.value = cls.end || '';
    $modalClase.show();
  }

  async function saveClass(cls, inputs) {
    const payload = {
      subject_id: inputs.subject.value,
      teacher: inputs.teacher.value,
      day: inputs.day.value,
      start_time: inputs.start.value,
      end_time: inputs.end.value,
      anio: meta.anio,
      turno: meta.turno,
      date: cls.date || null
    };
    const method = cls.id ? 'PUT' : 'POST';
    const url = cls.id ? `/api/admin/schedule/${cls.id}` : '/api/admin/schedule';

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': 'Bearer ' + token(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const msg = (await res.json()).message || 'Error guardando clase';
      throw new Error(msg);
    }

    await fetchSchedule();
    renderMonth(cur);
    renderGrilla();
  }

  // -----------------------------
  // EVENTOS
  // -----------------------------
  document.getElementById('calPrev')?.addEventListener('click', () => {
    cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
    renderMonth(cur);
  });

  document.getElementById('calNext')?.addEventListener('click', () => {
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    renderMonth(cur);
  });

  $btnMes.onclick = () => {
    $grid.classList.remove('d-none');
    $grilla.classList.add('d-none');
  };

  $btnGrid.onclick = () => {
    $grid.classList.add('d-none');
    $grilla.classList.remove('d-none');
  };

  $btnAdd?.addEventListener('click', () => openModal({}));

  document.addEventListener('click', async e => {
    const editBtn = e.target.closest('.edit-clase');
    const delBtn  = e.target.closest('.del-clase');

    if (editBtn) {
      const cls = findById(editBtn.dataset.id);
      if (cls) openModal(cls);
      return;
    }

    if (delBtn) {
      if (!confirm('¿Eliminar clase?')) return;
      await fetch(`/api/admin/schedule/${delBtn.dataset.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token() }
      });
      await fetchSchedule();
      renderMonth(cur);
      renderGrilla();
    }
  });

  $formClase.addEventListener('submit', async e => {
    e.preventDefault();

    const missing = [];
    if (!$inputSubject.value.trim()) missing.push('Materia');
    if (!$inputTeacher.value.trim()) missing.push('Profesor/a');
    if (!$inputDay.value.trim()) missing.push('Día');
    if (!$inputStart.value.trim()) missing.push('Hora de inicio');
    if (!$inputEnd.value.trim()) missing.push('Hora de fin');

    if (missing.length > 0) {
      alert('Faltan los siguientes datos:\n- ' + missing.join('\n- '));
      return;
    }

    try {
      await saveClass(currentClass || {}, {
        subject: $inputSubject,
        teacher: $inputTeacher,
        day: $inputDay,
        start: $inputStart,
        end: $inputEnd
      });
      $modalClase.hide();
    } catch (err) {
      alert('Error guardando clase: ' + err.message);
    }
  });

  document.getElementById('calModal')?.addEventListener('show.bs.modal', async () => {
    await fetchSubjects();
    await fetchSchedule();
    cur = new Date();
    renderMonth(cur);
    renderGrilla();
  });

})();