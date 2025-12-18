// public/JavaScript/qr.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/index.html';

let me = null;
let countdown = 60;
let tHandle = null;
let qrInstance = null; 

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
  const box = document.getElementById('qrcode');

  // emitir nueva URL
  const { url, exp } = await issueQrUrl();

  // crear instancia una vez y luego reutilizar
  if (!qrInstance) {
    // limpiar por las dudas si había algo renderizado
    box.innerHTML = '';
    qrInstance = new QRCode(box, {
      text: url,                    // se reemplaza abajo igual
      width: 240,
      height: 240,
      correctLevel: QRCode.CorrectLevel.M,
    });
  }
  
  // reemplazar el código (evita apilar nodos)
  if (qrInstance.clear) qrInstance.clear();
  if (qrInstance.makeCode) qrInstance.makeCode(url);

  // manejar cuenta regresiva y único intervalo
  countdown = Math.max(0, Math.floor(exp - Date.now() / 1000));
  updateCountdown();
console.log(url);
  if (tHandle) clearInterval(tHandle);
  tHandle = setInterval(() => {
    countdown--;
    updateCountdown();
    if (countdown <= 0) {
      clearInterval(tHandle);
      tHandle = null;
      // reemitir y redibujar
      drawQR().catch(console.error);
    }
  }, 1000);
}

function updateCountdown() {
  const el = document.getElementById('qrExpire');
  if (el) el.textContent = 'Vence en: ' + countdown + 's';
}

// eventos
document.getElementById('btnRefresh')?.addEventListener('click', (e) => {
  e.preventDefault();
  // forzar regeneración inmediata sin duplicar nada
  if (tHandle) { clearInterval(tHandle); tHandle = null; }
  drawQR().catch(console.error);
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