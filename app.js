/* ==========================================================
   Newbounds FC — animated starfield
   Draws slow-drifting, twinkling background stars plus
   occasional shooting stars across a full-viewport canvas.
   ========================================================== */

(function () {
  "use strict";

  const canvas = document.getElementById("star-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const STAR_COLORS = [
    "224, 240, 255", // white-blue
    "224, 240, 255",
    "224, 240, 255",
    "147, 229, 255", // blue
    "255, 138, 154"  // red (rare accent)
  ];

  const SHOOTING_STAR_COLOR_STOPS = [
    { offset: 0, color: "255, 255, 255" },
    { offset: 0.4, color: "147, 229, 255" },
    { offset: 1, color: "255, 71, 87" }
  ];

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let stars = [];
  let shootingStars = [];
  let lastFrameTime = 0;
  let animationId = null;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildStars();
  }

  function buildStars() {
    // density scales with viewport area, capped for perf on big screens
    const density = 1 / 9000;
    const count = Math.min(Math.floor(width * height * density), 260);

    stars = new Array(count).fill(null).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.4 + 0.4,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      baseOpacity: Math.random() * 0.5 + 0.4,
      twinkleSpeed: Math.random() * 1.4 + 0.4,
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * 0.05,
      driftY: Math.random() * 0.045 + 0.015
    }));
  }

  function maybeSpawnShootingStar(dt) {
    if (shootingStars.length >= 3) return;

    // roughly one every 2.5-6 seconds on average
    const chancePerSecond = 0.28;
    if (Math.random() < chancePerSecond * dt) {
      const startFromTop = Math.random() < 0.6;
      const x = startFromTop ? Math.random() * width : -20;
      const y = startFromTop ? -20 : Math.random() * height * 0.5;

      const angle = (Math.PI / 180) * (135 + Math.random() * 25); // down-left streak
      const speed = Math.random() * 320 + 380; // px per second

      shootingStars.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: Math.random() * 90 + 70,
        opacity: 1,
        fade: Math.random() * 0.4 + 0.5 // opacity lost per second
      });
    }
  }

  function drawStars(time) {
    for (const star of stars) {
      star.x += star.driftX;
      star.y += star.driftY;

      if (star.x < -2) star.x = width + 2;
      if (star.x > width + 2) star.x = -2;
      if (star.y > height + 2) {
        star.y = -2;
        star.x = Math.random() * width;
      }

      const twinkle =
        0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.phase);
      const opacity = star.baseOpacity * (0.55 + 0.45 * twinkle);

      ctx.beginPath();
      ctx.fillStyle = `rgba(${star.color}, ${opacity.toFixed(3)})`;
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawShootingStars(dt) {
    shootingStars = shootingStars.filter((s) => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.opacity -= s.fade * dt;

      if (
        s.opacity <= 0 ||
        s.x < -150 ||
        s.x > width + 150 ||
        s.y > height + 150
      ) {
        return false;
      }

      const mag = Math.hypot(s.vx, s.vy) || 1;
      const tailX = s.x - (s.vx / mag) * s.length;
      const tailY = s.y - (s.vy / mag) * s.length;

      const gradient = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      for (const stop of SHOOTING_STAR_COLOR_STOPS) {
        gradient.addColorStop(
          stop.offset,
          `rgba(${stop.color}, ${(s.opacity * (1 - stop.offset)).toFixed(3)})`
        );
      }

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // bright head of the shooting star
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity.toFixed(3)})`;
      ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
      ctx.fill();

      return true;
    });
  }

  function frame(timestamp) {
    const time = timestamp / 1000;
    const dt = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.1) : 0;
    lastFrameTime = timestamp;

    ctx.clearRect(0, 0, width, height);

    drawStars(time);
    maybeSpawnShootingStar(dt);
    drawShootingStars(dt);

    animationId = window.requestAnimationFrame(frame);
  }

  function drawStaticFrame() {
    // For reduced-motion users: render one calm, non-animated starfield.
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(${star.color}, ${star.baseOpacity.toFixed(3)})`;
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function start() {
    resize();

    if (prefersReducedMotion) {
      drawStaticFrame();
      return;
    }

    if (animationId) window.cancelAnimationFrame(animationId);
    lastFrameTime = 0;
    animationId = window.requestAnimationFrame(frame);
  }

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resize();
      if (prefersReducedMotion) drawStaticFrame();
    }, 150);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && animationId) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
      lastFrameTime = 0;
    } else if (!document.hidden && !prefersReducedMotion && !animationId) {
      animationId = window.requestAnimationFrame(frame);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
