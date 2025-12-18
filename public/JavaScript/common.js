// public/JavaScript/common.js
(function () {

  /* ==============================
     Config por página
     ============================== */

  const needsAuth =
    document.querySelector('[data-need-auth="1"]') !== null;

  const roleEl = document.querySelector('[data-need-role]');
  const requiredRole = roleEl
    ? (roleEl.getAttribute('data-need-role') || '').toLowerCase()
    : '';

  const token = localStorage.getItem('token');

  /* ==============================
     Init
     ============================== */

  ensureAuthAndRole();

  document.addEventListener('DOMContentLoaded', () => {
    setupLogout();
  });

  /* ==============================
     Auth + Role guard
     ============================== */

  async function ensureAuthAndRole() {
    if (!needsAuth) return; // página pública
    if (!token) return redirect('/index.html');

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token }
      });

      if (!res.ok) throw new Error('unauthorized');

      const { user } = await res.json();
      window.CURRENT_USER = user;

      // Mostrar contenido protegido
      const main = document.querySelector('[data-need-auth="1"]');
      if (main) main.classList.add('show');

      // Aplicar UI por rol (CLASES EN BODY)
      applyRoleUI(user);

      // Validar rol requerido por la página
      if (requiredRole) {
        validatePageRole(user.role, requiredRole);
      }

    } catch (err) {
      localStorage.removeItem('token');
      redirect('/index.html');
    }
  }

  function applyRoleUI(user) {
    const role = (user.role || '').toLowerCase();

    // limpiar
    document.body.classList.remove(
      'role-admin',
      'role-seguridad'
    );

    if (role === 'admin') {
      document.body.classList.add('role-admin');
    }

    if (role === 'seguridad') {
      document.body.classList.add('role-seguridad');
    }
  }

  function validatePageRole(userRole, requiredRole) {
    const role = (userRole || '').toLowerCase();

    // permite: data-need-role="seguridad,admin"
    const allowedRoles = requiredRole
      .split(',')
      .map(r => r.trim().toLowerCase());

    if (!allowedRoles.includes(role)) {
      redirect(
        role === 'admin'
          ? '/paginas/admin.html'
          : '/paginas/inicio.html'
      );
    }
  }

  /* ==============================
     Logout centralizado
     ============================== */

  function setupLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;

    btn.addEventListener('click', e => {
      e.preventDefault();
      localStorage.removeItem('token');
      redirect('/index.html');
    });
  }

  /* ==============================
     Utils
     ============================== */

  function redirect(path) {
    if (location.pathname !== path) {
      location.href = path;
    }
  }

})();

