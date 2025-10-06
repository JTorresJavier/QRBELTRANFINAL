// public/JavaScript/recovery.js
console.log('[recovery] script cargado');

const recupForm = document.getElementById('recupForm');
const recupMsg  = document.getElementById('recupMsg');

// Detectar si estoy servido por el backend (3000) o por Live Server (5500)
const isBackendOrigin = location.origin.includes(':3000');
const API_BASE = isBackendOrigin ? '' : 'http://localhost:3000';

recupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  recupMsg.textContent = 'Procesando...';

  const identifier = document.getElementById('identifier')?.value.trim();
  console.log('[recovery] submit', { identifier, API_BASE, origin: location.origin });

  try {
    const r = await fetch(`${API_BASE}/api/auth/recovery/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });

    const txt = await r.text(); // para ver respuesta cruda si hay HTML por error
    console.log('[recovery] status', r.status, 'body', txt);

    // Mensaje neutro (no revelar existencia)
    recupMsg.textContent = 'Si existe la cuenta, te enviamos un correo con instrucciones.';
  } catch (err) {
    console.error('[recovery] error', err);
    recupMsg.textContent = 'Si existe la cuenta, te enviamos un correo con instrucciones.';
  }
});
