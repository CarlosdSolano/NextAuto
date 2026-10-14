/* Música global: un solo reproductor en la página principal. El iframe del vehículo
   no carga este archivo, por lo que abrir/cerrar detalles no duplica el audio. */
(() => {
  function iniciarMusica() {
    const audio = document.getElementById('musicaPremium');
    if (!audio || window.self !== window.top) return;
    if (audio.dataset.inicializada === '1') return;
    audio.dataset.inicializada = '1';
    audio.loop = true;
    audio.volume = 0.22;
    audio.preload = 'auto';

    const CLAVE_TIEMPO = 'nextauto-musica-tiempo';
    try {
      const guardado = Number(sessionStorage.getItem(CLAVE_TIEMPO));
      if (Number.isFinite(guardado) && guardado > 0) {
        audio.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = Math.min(guardado, Math.max(0, audio.duration - 0.25));
          }
        }, { once: true });
      }
    } catch (_) {}

    let reintentoRegistrado = false;
    const quitarReintentos = () => {
      ['pointerdown', 'keydown', 'touchstart'].forEach(tipo => window.removeEventListener(tipo, activarConInteraccion, true));
      reintentoRegistrado = false;
    };
    function activarConInteraccion() {
      audio.muted = false;
      audio.play().then(quitarReintentos).catch(() => {
        // Si el navegador sigue bloqueando el audio, no se insiste en bucle.
      });
    }
    function registrarReintentos() {
      if (reintentoRegistrado) return;
      reintentoRegistrado = true;
      ['pointerdown', 'keydown', 'touchstart'].forEach(tipo => window.addEventListener(tipo, activarConInteraccion, { capture: true, passive: true }));
    }

    // Primero intenta sonido normal. Si el navegador lo bloquea, inicia en silencio
    // (cuando se permite) y activa el sonido en el primer gesto real del usuario.
    audio.muted = false;
    const intento = audio.play();
    if (intento && typeof intento.then === 'function') {
      intento.then(() => quitarReintentos()).catch(() => {
        audio.muted = true;
        audio.play().catch(() => {});
        registrarReintentos();
      });
    } else {
      registrarReintentos();
    }

    const guardarTiempo = () => {
      if (!Number.isFinite(audio.currentTime)) return;
      try { sessionStorage.setItem(CLAVE_TIEMPO, String(audio.currentTime)); } catch (_) {}
    };
    window.setInterval(guardarTiempo, 2000);
    window.addEventListener('pagehide', guardarTiempo, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarMusica, { once: true });
  else iniciarMusica();
})();
