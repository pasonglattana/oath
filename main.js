/* ============================================================
   OATH — main.js
   Canvas hero artwork · nav · fade-ins · booking form
   ============================================================ */

(function () {
  'use strict';

  // ── Canvas Hero ──────────────────────────────────────────
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, clock = 0;
  let mouse = { x: 0.5, y: 0.5 }, target = { x: 0.5, y: 0.5 };

  const COLORS = [
    [200, 146, 42],   // ochre
    [160,  82, 45],   // sienna
    [196, 110, 58],   // terracotta
    [244, 237, 228],  // cream
    [ 90, 107, 75],   // moss
    [122,  92, 58],   // mid-earth
  ];

  // ── Particles ─────────────────────────────────────────────
  const NUM_PARTICLES = 70;
  const particles = [];

  function makeParticle(born) {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      x: Math.random() * W,
      y: born ? Math.random() * H : H + 10,
      r: 0.5 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -(0.14 + Math.random() * 0.42),
      a: 0.06 + Math.random() * 0.16,
      col: c,
      wobble: Math.random() * Math.PI * 2,
      wSpeed: 0.005 + Math.random() * 0.014,
      life: born ? Math.floor(Math.random() * 500) : 0,
      maxLife: 220 + Math.random() * 420,
    };
  }

  // ── Sky gradient: dawn → midday → dusk (loop) ─────────────
  function skyAt(t) {
    // colors at key times [top, bottom]
    const keys = [
      { t: 0,    top: [18,12,10],  bot: [140,80,40]  },
      { t: 0.2,  top: [30,22,18],  bot: [165,100,50] },
      { t: 0.42, top: [38,28,20],  bot: [100,68,32]  },
      { t: 0.62, top: [28,18,12],  bot: [175,108,44] },
      { t: 0.78, top: [14,9,7],    bot: [145,70,28]  },
      { t: 0.9,  top: [10,7,5],    bot: [90,45,18]   },
      { t: 1,    top: [18,12,10],  bot: [140,80,40]  },
    ];
    let a = keys[0], b = keys[1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (t >= keys[i].t && t < keys[i+1].t) { a = keys[i]; b = keys[i+1]; break; }
    }
    const f = (t - a.t) / (b.t - a.t);
    function mix(ca, cb) {
      return [
        Math.round(ca[0] + (cb[0]-ca[0])*f),
        Math.round(ca[1] + (cb[1]-ca[1])*f),
        Math.round(ca[2] + (cb[2]-ca[2])*f),
      ];
    }
    return { top: mix(a.top, b.top), bot: mix(a.bot, b.bot) };
  }

  function drawBg(t) {
    const sky = skyAt(t);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${sky.top})`);
    g.addColorStop(1, `rgb(${sky.bot})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawGlow(mx, my) {
    const cx = W * 0.5 + (mx - 0.5) * W * 0.12;
    const cy = H * 0.52 + (my - 0.5) * H * 0.07;
    const pulse = 0.16 + 0.07 * Math.sin(clock * 0.0028);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W,H) * 0.82);
    g.addColorStop(0,   `rgba(200,130,40,${pulse})`);
    g.addColorStop(0.4, `rgba(200,130,40,${pulse*0.28})`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawFog() {
    for (let i = 0; i < 3; i++) {
      const y = H * (0.44 + i * 0.13) + Math.sin(clock * 0.0007 + i * 1.3) * 18;
      const a = 0.035 + 0.015 * Math.sin(clock * 0.001 + i);
      const g = ctx.createLinearGradient(0, y-55, 0, y+55);
      g.addColorStop(0,   'rgba(210,196,185,0)');
      g.addColorStop(0.5, `rgba(210,196,185,${a})`);
      g.addColorStop(1,   'rgba(210,196,185,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y-55, W, 110);
    }
  }

  // Slow cracking earth texture
  const cracks = [];
  function makeCrack() {
    let x = Math.random() * W, y = H * 0.55 + Math.random() * H * 0.45;
    const pts = [{x, y}];
    for (let i = 0; i < 4 + Math.floor(Math.random() * 6); i++) {
      x += (Math.random()-0.5)*80; y += 10 + Math.random()*38;
      pts.push({x, y});
    }
    return { pts, prog: 0, speed: 0.003+Math.random()*0.005, opacity: 0, target: 0.04+Math.random()*0.07 };
  }
  function drawCracks() {
    cracks.forEach(c => {
      c.prog = Math.min(1, c.prog + c.speed);
      c.opacity += (c.target - c.opacity) * 0.018;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(155,115,75,${c.opacity})`;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2,4]);
      const pts = c.pts;
      const total = (pts.length-1) * c.prog;
      const full = Math.floor(total);
      const frac = total - full;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < full && i < pts.length-1; i++) ctx.lineTo(pts[i+1].x, pts[i+1].y);
      if (full < pts.length-1) {
        const p = pts[full], q = pts[full+1];
        ctx.lineTo(p.x+(q.x-p.x)*frac, p.y+(q.y-p.y)*frac);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  function drawParticles() {
    particles.forEach((p, i) => {
      p.life++;
      p.wobble += p.wSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.28;
      p.y += p.vy;
      const lf = p.life / p.maxLife;
      const a = lf < 0.1 ? p.a * (lf/0.1) : lf > 0.8 ? p.a * (1-(lf-0.8)/0.2) : p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${p.col},${a})`;
      ctx.fill();
      if (p.life >= p.maxLife || p.y < -10) particles[i] = makeParticle(false);
    });
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W/2,H/2,H*0.08,W/2,H/2,H*0.85);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,'rgba(0,0,0,0.68)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);
  }

  function frame() {
    clock++;
    const t = (clock * 0.00022) % 1;
    drawBg(t);
    drawGlow(mouse.x, mouse.y);
    drawFog();
    drawCracks();
    drawParticles();
    drawVignette();
    requestAnimationFrame(frame);
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    cracks.length = 0;
    for (let i = 0; i < 14; i++) cracks.push(makeCrack());
    particles.length = 0;
    for (let i = 0; i < NUM_PARTICLES; i++) particles.push(makeParticle(true));
    frame();
  }

  window.addEventListener('resize', () => { resize(); cracks.length=0; for(let i=0;i<14;i++) cracks.push(makeCrack()); });

  // Smooth mouse parallax
  document.addEventListener('mousemove', e => {
    target.x = e.clientX / window.innerWidth;
    target.y = e.clientY / window.innerHeight;
  });
  (function lerpMouse() {
    mouse.x += (target.x - mouse.x) * 0.045;
    mouse.y += (target.y - mouse.y) * 0.045;
    requestAnimationFrame(lerpMouse);
  })();

  init();

  // ── Nav scroll behaviour ─────────────────────────────────
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // ── Hamburger / mobile menu ──────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Intersection Observer fade-ins ───────────────────────
  const fadeEls = document.querySelectorAll('.fade-in');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    fadeEls.forEach(el => io.observe(el));
  } else {
    fadeEls.forEach(el => el.classList.add('visible'));
  }

  // ── Booking form ─────────────────────────────────────────
  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.textContent = "Received — we'll be in touch.";
      btn.disabled = true;
      btn.style.opacity = '0.7';
    });
  }

})();
