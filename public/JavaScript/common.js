// public/JavaScript/common.js
(function () {

  const needsAuth = document.querySelector('[data-need-auth="1"]') !== null;
  const roleEl = document.querySelector('[data-need-role]');
  const requiredRole = roleEl
    ? (roleEl.getAttribute('data-need-role') || '').toLowerCase()
    : '';

  const token = localStorage.getItem('token');

  async function ensureAuthAndRole() {
    if (!needsAuth) return;              // página pública
    if (!token) return redirect('/index.html');

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token }
      });

      if (!res.ok) throw new Error('unauth');

      const { user } = await res.json();
      window.CURRENT_USER = user; // disponible globalmente

      // 👉 mostrar contenido protegido solo si el token es válido
      const main = document.querySelector('[data-need-auth="1"]');
      if (main) main.classList.add('show');

      // 👉 aplicar UI según rol
      applyRoleUI(user);

      // 👉 validar rol requerido por la página
if (requiredRole) {
  const role = (user.role || '').toLowerCase();

  // permite: "seguridad,admin"
  const allowedRoles = requiredRole
    .split(',')
    .map(r => r.trim().toLowerCase());

  if (!allowedRoles.includes(role)) {
    return redirect(
      role === 'admin'
        ? '/paginas/admin.html'
        : '/paginas/inicio.html'
    );
  }
}

    } catch (err) {
      localStorage.removeItem('token');
      return redirect('/index.html');
    }
  }

  function applyRoleUI(user) {
    const role = (user.role || '').toLowerCase();

    // Elementos solo admin
    document.querySelectorAll('.nav-admin').forEach(el => {
      if (role === 'admin') {
        el.style.display = 'block';
      } else {
        el.remove(); // opcional, podés dejar solo display:none
      }
    });

    // Elementos solo seguridad
    document.querySelectorAll('.nav-seguridad').forEach(el => {
      if (role === 'seguridad') {
        el.style.display = 'block';
      } else {
        el.remove(); // opcional, podés dejar solo display:none
      }
    });

    // (Preparado para el futuro)
    // document.querySelectorAll('.nav-seguridad').forEach(el => {
    //   if (role !== 'seguridad') el.remove();
    // });
  }

  function redirect(path) {
    if (location.pathname !== path) {
      location.href = path;
    }
  }

  // Logout global
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('logoutBtn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        redirect('/index.html');
      });
    }
  });

  // init
  ensureAuthAndRole();

})();




// IIFE (función autoejecutable)
// Todo el código está dentro de una función que se ejecuta al cargar el archivo. Evita variables globales accidentales.

// Guard de autenticación por página

// Busca si la página tiene el atributo data-need-auth="1".

// Si lo tiene, exige token en localStorage.

// Valida el token llamando a /api/auth/me.

// Si es válido, guarda el usuario en window.CURRENT_USER para usarlo en otras vistas.

// Si falta o es inválido, borra el token y redirige a /index.html.

// Logout centralizado

// Al DOMContentLoaded, si existe #logoutBtn, registra el click.

// Al hacer click: borra el token y redirige a /index.html.

// Así evitás código duplicado de logout en cada página.

// CSP-friendly (sin inline)
// No usa onclick ni estilos inline, por lo que cumple con la Content-Security-Policy.

// Cómo usarlo en una página

// Marca el <main> (o contenedor principal) con data-need-auth="1" si requiere sesión.

// Incluí <script src="/JavaScript/common.js" defer></script> al final del <body>.

// (Opcional) Poné un botón con id="logoutBtn" para habilitar el cierre de sesión.

// Nota: Este archivo es un lugar único para lógica global (auth y logout). Si más adelante necesitás chequeo de roles, podés extender acá para redirigir según CURRENT_USER.role.