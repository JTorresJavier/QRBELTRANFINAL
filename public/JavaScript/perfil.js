document.addEventListener('DOMContentLoaded', async () => {
  try {
    const token = localStorage.getItem('token'); 
    if (!token) throw new Error('No hay token JWT, iniciá sesión');

    const res = await fetch('/api/perfil', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Error al obtener perfil: ${res.status}`);
    const user = await res.json();

    const campos = ['nombre','apellido','email','dni','turno','anio'];
    campos.forEach(id => {
      const input = document.getElementById(id);
      input.value = user[id] || '';
      input.disabled = true; 
    });

    document.querySelector('.perfil-info h2').textContent = `${user.nombre} ${user.apellido}`;
    document.querySelector('.perfil-email').textContent = user.email;
    document.querySelector('.perfil-rol').textContent = user.role || 'Sin rol';
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});