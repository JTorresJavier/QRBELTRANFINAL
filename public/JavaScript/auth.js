// public/JavaScript/auth.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('loginError');
  const usernameEl = document.getElementById('username');
  const passwordEl = document.getElementById('password');

  const showError = (msg) => {
    errorBox.textContent = msg;
    errorBox.classList.add('is-visible');   // usa clase, no inline
  };
  const hideError = () => {
    errorBox.textContent = '';
    errorBox.classList.remove('is-visible');
  };

  hideError(); // al cargar

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const username = usernameEl?.value.trim();
    const password = passwordEl?.value;

    if (!username || !password) {
      showError('Completá usuario y contraseña.');
      return;
    }

    const submitBtn = form.querySelector('.signin-btn');
    submitBtn?.setAttribute('disabled', 'true');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data.message || 'Usuario o contraseña incorrectos.');
        return;
      }

      localStorage.setItem('token', data.token);

      // ✅ REDIRECCIÓN SEGÚN ROL
      const role = (data.user?.role || '').toUpperCase();

        if (role === 'SEGURIDAD') {
          window.location.href = '/paginas/seguridad.html';
        } else if (role === 'ADMIN') {
            window.location.href = '/paginas/admin.html';
        } else {
          window.location.href = '/paginas/inicio.html';
        }
    } catch {
      showError('No se pudo conectar con el servidor.');
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });
});
