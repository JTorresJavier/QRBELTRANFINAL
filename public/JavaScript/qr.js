// public/JavaScript/qr.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/index.html';

let me = null;
let countdown = 60;
let tHandle = null;

async function fetchMe() {
  const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('unauth');
  const data = await res.json();
  me = data.user;
  document.getElementById('qrUser').textContent = 'Usuario: ' + (me?.username || '—');
}

async function issueQrUrl() {
  const res = await fetch('/api/qr/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  });
  if (!res.ok) throw new Error('issue_failed');
  return res.json(); // { url, exp }
}

async function drawQR() {
  const el = document.getElementById('qrcode');
  el.innerHTML = '';
  const { url, exp } = await issueQrUrl();
  new QRCode(el, { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });

  countdown = Math.max(0, Math.floor(exp - Date.now() / 1000));
  updateCountdown();

  if (tHandle) clearInterval(tHandle);
  tHandle = setInterval(() => {
    countdown--;
    updateCountdown();
    if (countdown <= 0) drawQR(); // regen
  }, 1000);
}

function updateCountdown() {
  document.getElementById('qrExpire').textContent = 'Vence en: ' + countdown + 's';
}

// eventos
document.getElementById('btnRefresh')?.addEventListener('click', (e) => {
  e.preventDefault();
  drawQR();
});
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  window.location.href = '/index.html';
});

// init
(async () => {
  try {
    await fetchMe();
    await drawQR();
  } catch {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
  }
})();


// Qué hace (resumen)

// Exige sesión (token en localStorage), si no hay → redirige a index.html.

// Pide tu usuario a /api/auth/me para mostrar el nombre en pantalla.

// Solicita al backend un QR firmado con /api/qr/issue → recibe { url, exp }.

// Renderiza el QR (con qrcodejs) usando esa URL firmada.

// Muestra y actualiza un contador hasta exp y regenera automáticamente cuando vence.

// Botón “Regenerar” fuerza una nueva emisión; “Cerrar sesión” borra el token.

// Explicación por bloques
// 1) Guard de sesión
// const token = localStorage.getItem('token');
// if (!token) window.location.href = '/index.html';


// Revisa si hay token. Si falta, el usuario no está logueado → lo manda al login.

// 2) Estado y timers
// let me = null;
// let countdown = 60;
// let tHandle = null;


// me: guardará el usuario actual.

// countdown: segundos restantes hasta que expire el QR.

// tHandle: referencia del setInterval para poder reiniciarlo/limpiarlo.

// 3) Carga del usuario (para mostrar en UI)
// async function fetchMe() {
//   const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
//   if (!res.ok) throw new Error('unauth');
//   const data = await res.json();
//   me = data.user;
//   document.getElementById('qrUser').textContent = 'Usuario: ' + (me?.username || '—');
// }


// Llama a tu API con el token en Authorization: Bearer.

// Si responde OK, guarda el usuario y lo pinta en #qrUser.

// Si falla, lanza error (lo captura el init y te redirige a login).

// 4) Emisión de URL firmada
// async function issueQrUrl() {
//   const res = await fetch('/api/qr/issue', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
//   });
//   if (!res.ok) throw new Error('issue_failed');
//   return res.json(); // { url, exp }
// }


// Pide al backend un QR nuevo (token de un solo uso, con TTL).

// El backend devuelve:

// url: link firmado tipo /paginas/validar.html?token=...

// exp: timestamp UNIX (segundos) en que expira.

// 5) Dibujo del QR + contador
// async function drawQR() {
//   const el = document.getElementById('qrcode');
//   el.innerHTML = '';
//   const { url, exp } = await issueQrUrl();
//   new QRCode(el, { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });

//   countdown = Math.max(0, Math.floor(exp - Date.now() / 1000));
//   updateCountdown();

//   if (tHandle) clearInterval(tHandle);
//   tHandle = setInterval(() => {
//     countdown--;
//     updateCountdown();
//     if (countdown <= 0) drawQR(); // regen automático cuando vence
//   }, 1000);
// }


// Limpia el contenedor #qrcode, emite una URL nueva y la dibuja con qrcodejs.

// Calcula los segundos restantes hasta exp comparado con el reloj del cliente.

// Arranca un intervalo que resta 1 cada segundo, actualiza la UI y regenera al llegar a 0.

// 6) Pintar el contador en UI
// function updateCountdown() {
//   document.getElementById('qrExpire').textContent = 'Vence en: ' + countdown + 's';
// }


// Actualiza el texto en #qrExpire con los segundos restantes.

// 7) Eventos de UI
// document.getElementById('btnRefresh')?.addEventListener('click', (e) => {
//   e.preventDefault();
//   drawQR();
// });
// document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
//   e.preventDefault();
//   localStorage.removeItem('token');
//   window.location.href = '/index.html';
// });


// Regenerar: fuerza una nueva emisión (útil si cambiaste algo o se dañó el QR).

// Logout: borra token y va al login.

// 8) Inicialización
// (async () => {
//   try {
//     await fetchMe();
//     await drawQR();
//   } catch {
//     localStorage.removeItem('token');
//     window.location.href = '/index.html';
//   }
// })();


// Intenta cargar usuario y generar el primer QR.

// Si algo falla (token inválido / red), limpia y redirige a login.

// Dependencias del DOM (importante para no romper)

// Este script asume que existen:

// #qrUser (texto con “Usuario: …”)

// #qrcode (contenedor donde se renderiza el QR)

// #qrExpire (label del contador)

// #btnRefresh (botón para regenerar)

// #logoutBtn (en el navbar)

// Y que cargaste qrcodejs antes:

// <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" defer></script>
// <script src="/JavaScript/qr.js" defer></script>