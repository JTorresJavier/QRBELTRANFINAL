// public/JavaScript/inicio.js
document.addEventListener('DOMContentLoaded', async () => {
  const box = document.getElementById('hoyClases');
  if (!box) return;

  const token = localStorage.getItem('token');
  if (!token) return; // common.js ya redirige si falta

  box.innerHTML = '<p class="muted">Cargando clases de hoy…</p>';

  try {
    const res = await fetch('/api/student/today-classes', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();

    const dayMap = { lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado', dom:'Domingo' };
    const titulo = `Hoy (${dayMap[data.day] || '—'}) · Año ${data.anio} · Turno ${data.turno}`;

    if (!res.ok) throw new Error(data.message || 'Error');

    if (!data.classes || data.classes.length === 0) {
      box.innerHTML = `
        <h5>${titulo}</h5>
        <p class="muted">No hay clases programadas para hoy.</p>
      `;
      return;
    }

    const items = data.classes.map(c => `
      <div class="clase-item">
        <div class="clase-materia">${c.subject}</div>
        <div class="clase-prof">Docente: ${c.teacher}</div>
        <div class="clase-hora">${c.start} – ${c.end}</div>
      </div>
    `).join('');

    box.innerHTML = `
      <h5>${titulo}</h5>
      <div class="clase-lista">${items}</div>
    `;
  } catch {
    box.innerHTML = '<p class="bad">No se pudieron cargar las clases de hoy.</p>';
  }
});
