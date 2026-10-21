/* =========================================================
   TecnoVision.vzla - Fondo animado de partículas
   Estilo particles.js (puntos + conexiones), liviano y a medida.
   Se adapta a la paleta del sitio y respeta "reducir movimiento".
   ========================================================= */

(function () {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Paleta combinada con el tema (teal, índigo, rosa suave)
  const COLORS = ["45,212,191", "129,140,248", "244,114,182"];
  const LINK_COLOR = "125,211,252";
  const LINK_DIST = 130; // distancia máxima de conexión

  let particles = [];
  let w = 0, h = 0, raf = null, running = false;

  function resize() {
    // En pantallas pequeñas se limita el DPR para ahorrar batería
    const isSmall = window.innerWidth < 700;
    const dpr = isSmall ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  function initParticles() {
    // Cantidad proporcional al área de la pantalla
    // (menos partículas y enlaces en móvil para un scroll fluido)
    const isSmall = w < 700;
    const density = isSmall ? 30000 : 22000;
    const maxCount = isSmall ? 42 : 85;
    const count = Math.max(18, Math.min(maxCount, Math.round((w * h) / density)));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        a: Math.random() * 0.45 + 0.3,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Conexiones entre partículas cercanas
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.13;
          ctx.strokeStyle = "rgba(" + LINK_COLOR + "," + alpha.toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    // Puntos con brillo suave
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + p.c + "," + p.a.toFixed(3) + ")";
      ctx.shadowColor = "rgba(" + p.c + ",0.7)";
      ctx.shadowBlur = 7;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function step() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      // Reciclado suave al salir de los bordes
      if (p.x < -12) p.x = w + 12;
      else if (p.x > w + 12) p.x = -12;
      if (p.y < -12) p.y = h + 12;
      else if (p.y > h + 12) p.y = -12;
    }
    draw();
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (!running && !reduced) {
      running = true;
      raf = requestAnimationFrame(step);
    }
  }

  function stop() {
    if (running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // Pausar cuando la pestaña no está visible (ahorra CPU/batería)
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  resize();
  if (reduced) draw(); // versión estática
  else start();
})();
