document.addEventListener('DOMContentLoaded', async () => {
  try {
    const token = localStorage.getItem('token'); 
    if (!token) throw new Error('No hay token JWT, iniciá sesión');

    const res = await fetch('/api/perfil', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Error al obtener perfil: ${res.status}`);
    const user = await res.json();

    document.getElementById('nombre').value = user.nombre || '';
    document.getElementById('apellido').value = user.apellido || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('dni').value = user.dni || '';
    document.getElementById('turno').value = user.turno || '';
    document.getElementById('anio').value = user.anio || '';

    document.querySelector('.perfil-info h2').textContent = `${user.nombre} ${user.apellido}`;
    document.querySelector('.perfil-email').textContent = user.email;
    document.querySelector('.perfil-rol').textContent = user.role || 'Sin rol';
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

document.getElementById('perfilForm').addEventListener('submit', async e => {
  e.preventDefault();

  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay token JWT');

    const body = {
      nombre: document.getElementById('nombre').value,
      apellido: document.getElementById('apellido').value,
      email: document.getElementById('email').value,
      dni: document.getElementById('dni').value,
      turno: document.getElementById('turno').value,
      anio: document.getElementById('anio').value
    };

    const res = await fetch('/api/perfil', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Error al actualizar perfil: ${res.status}`);
    const data = await res.json();
    alert(data.message);
  } catch (err) {
    console.error(err);
    alert('Error al actualizar perfil ');
  }
});