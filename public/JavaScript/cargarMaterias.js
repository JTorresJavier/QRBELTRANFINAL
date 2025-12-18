(async function() {
  const token = localStorage.getItem('token');
  const subjectSelect = document.getElementById('inputSubject');
  const anio = window.CURRENT_USER?.anio;

  if (!anio) return;

  try {
    const res = await fetch(`/api/admin/subjects?anio=${anio}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Error al cargar materias');
const subjectSelect = document.getElementById('inputSubject');

subjects.forEach(s => {
  const opt = document.createElement('option');
  opt.value = s.id;  // Ahora el valor es el ID de la materia
  opt.textContent = s.name;
  subjectSelect.appendChild(opt);
});
  } catch(err) {
    console.error(err);
  }
})();