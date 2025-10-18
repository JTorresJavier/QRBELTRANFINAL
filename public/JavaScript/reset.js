// JS embebido mínimo para no crear otro archivo
    const resetForm = document.getElementById('resetForm');
    const resetMsg  = document.getElementById('resetMsg');

    // obtener token de la URL ?token=...
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      resetMsg.textContent = 'Enlace inválido o incompleto.';
    }

    resetForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = document.getElementById('newpass').value;
      const p2 = document.getElementById('newpass2').value;

      if (p1.length < 8) {
        resetMsg.textContent = 'La contraseña debe tener al menos 8 caracteres.';
        return;
      }
      if (p1 !== p2) {
        resetMsg.textContent = 'Las contraseñas no coinciden.';
        return;
      }

      resetMsg.textContent = 'Actualizando...';

      try {
        const r = await fetch('/api/auth/recovery/reset', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ token, password: p1 })
        });
        const data = await r.json();

        if (!r.ok) {
          resetMsg.textContent = data.message || 'No se pudo restablecer.';
          return;
        }
        resetMsg.textContent = 'Listo. Ahora podés iniciar sesión.';
        setTimeout(() => (window.location.href = '/index.html'), 1200);
      } catch {
        resetMsg.textContent = 'No se pudo restablecer.';
      }
    });