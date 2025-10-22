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




// Arranque seguro (DOMContentLoaded)
// Espera a que el HTML esté cargado para buscar elementos y registrar eventos. Evita errores de “elemento nulo”.

// Referencias a elementos
// Obtiene el formulario (#loginForm), el contenedor de errores (#loginError) y los inputs de usuario/contraseña.
// Usa optional chaining (?.) para no romper si algún selector no existe.

// Manejo de errores sin estilos inline (compatible con CSP)
// Define showError(msg) y hideError() que muestran/ocultan el mensaje aplicando/removiendo la clase .is-visible (en lugar de style.display). Así cumple con la Content-Security-Policy que bloquea estilos inline.

// Submit del formulario (login)

// Previene el envío por defecto (e.preventDefault()), limpia errores (hideError()), y toma valores (trim() al usuario).

// Valida que haya usuario y contraseña; si faltan, muestra un error y corta.

// Deshabilita el botón Iniciar sesión para evitar dobles envíos.

// Petición a la API
// Envía un fetch POST a /api/auth/login con JSON { username, password }.
// Intenta parsear la respuesta como JSON; si el status no es OK, muestra el mensaje de error devuelto (o uno genérico).

// Éxito
// Si el login es correcto, guarda el token JWT en localStorage y redirige a /paginas/inicio.html.

// Errores de red
// Si la petición falla (no hay conexión/servidor caído), muestra un error genérico.

// Limpieza
// En el finally, vuelve a habilitar el botón de submit, ocurra lo que ocurra.

// Notas:

// Este enfoque evita JS y CSS inline, cumpliendo la CSP del sitio.

// El token se guarda en localStorage; para apps más sensibles, evaluar cookies HttpOnly + Secure.