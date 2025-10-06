(function () {
  function dentroDeTurno(date, turno) {
    // hora local del dispositivo
    const h = date.getHours();
    const m = date.getMinutes();
    const minutes = h * 60 + m;

    // ventanas (inicio inclusive, fin exclusivo)
    const M0 = 6*60,  M1 = 12*60;  // mañana 06:00–12:00
    const T0 = 13*60, T1 = 18*60;  // tarde 13:00–18:00
    const N0 = 18*60, N1 = 22*60;  // noche 18:00–22:00

    switch ((turno || '').toLowerCase()) {
      case 'mañana': return minutes >= M0 && minutes < M1;
      case 'tarde':  return minutes >= T0 && minutes < T1;
      case 'noche':  return minutes >= N0 && minutes < N1;
      default:       return false; // sin turno cargado => fuera
    }
  }

  (async () => {
    const p = new URLSearchParams(location.search);
    const token = p.get('token');

    const $status = document.getElementById('status');
    const $meta   = document.getElementById('meta');
    const $hint   = document.getElementById('hint');
    const $turnoS = document.getElementById('turnoState');

    if (!token) {
      $status.innerHTML = '<span class="bad">❌ Token faltante</span>';
      $hint.textContent = 'Mostrá el QR nuevamente para obtener un enlace válido.';
      return;
    }

    try {
      const r = await fetch('/api/qr/verify?token=' + encodeURIComponent(token));
      const data = await r.json();

      if (data.valid) {
        const emitido = data.iat ? new Date(data.iat * 1000) : null;
        const vence   = data.exp ? new Date(data.exp * 1000) : null;
        const escaneo = data.scanned_at ? new Date(data.scanned_at) : null;

        const nom  = data.user.nombre   || '—';
        const ape  = data.user.apellido || '—';
        const user = data.user.username || '—';
        const rol  = data.user.role     || '—';
        const dni  = data.user.dni      || '—';
        const tur  = data.user.turno    || '—';

        const inShift = escaneo ? dentroDeTurno(escaneo, tur) : false;

        $status.innerHTML = '<span class="ok">✅ Pase válido</span>';
        $meta.innerHTML = `
          <div><b>Nombre:</b> ${nom}</div>
          <div><b>Apellido:</b> ${ape}</div>
          <div><b>Usuario:</b> ${user}</div>
          <div><b>Rol:</b> ${rol}</div>
          <div><b>DNI:</b> ${dni}</div>
          <div><b>Turno:</b> ${tur}</div>
          <div><b>Fecha/hora de escaneo:</b> ${escaneo ? escaneo.toLocaleString('es-AR',{hour12:false}) : '—'}</div>
        `;

        $turnoS.innerHTML = inShift
          ? '<div class="ok">Dentro de su turno</div>'
          : '<div class="bad">Fuera de su turno</div>';

        $hint.textContent =
          `Emitido: ${emitido ? emitido.toLocaleString('es-AR',{hour12:false}) : '—'} · ` +
          `Vence: ${vence ? vence.toLocaleString('es-AR',{hour12:false}) : '—'}`;
      } else {
        const reasonMap = {
          invalid_or_expired:'Inválido o expirado',
          reused:'Ya utilizado',
          unknown:'Desconocido',
          missing:'Faltante',
          server_error:'Error del servidor',
          unknown_user:'Usuario desconocido'
        };
        $status.innerHTML = `<span class="bad">❌ ${reasonMap[data.reason] || 'No válido'}</span>`;
        $meta.textContent = '';
        $turnoS.textContent = '';
        $hint.textContent = 'Solicitá al usuario generar un nuevo código.';
      }
    } catch {
      $status.innerHTML = '<span class="bad">❌ Error de validación</span>';
      $hint.textContent = 'Reintentá o contactá a sistemas.';
    }
  })();
})();
