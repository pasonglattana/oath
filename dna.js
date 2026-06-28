/* ═══════════════════════════════════════════════════════════════
   OATH · RITUALS & WONDERS — dna.js
   Preloader curtain · Lenis smooth scroll · GSAP/ScrollTrigger
   cinematic reveals · horizontal gallery · vinyl · custom cursor
   ═══════════════════════════════════════════════════════════════ */

document.documentElement.classList.remove('no-js');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH   = window.matchMedia('(hover: none)').matches || window.innerWidth < 900;
const hasGSAP = typeof gsap !== 'undefined';
const hasLenis = typeof Lenis !== 'undefined';
const hasThree = typeof THREE !== 'undefined';

/* ─────────────────────────────────────────────────────────────
   1 · SMOOTH SCROLL
   ───────────────────────────────────────────────────────────── */
let lenis = null;
if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

if (hasLenis && !REDUCED) {
  lenis = new Lenis({ duration: 1.15, lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  window.lenis = lenis;
  if (hasGSAP && window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
  else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
}

/* anchor links → smooth scroll (same-page only) */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    scrollToId(id);
  });
});
document.querySelectorAll('[data-go]').forEach((el) => {
  el.addEventListener('click', () => scrollToId(el.dataset.go));
});

/* ─────────────────────────────────────────────────────────────
   2 · PRELOADER
   ───────────────────────────────────────────────────────────── */
(function preloader() {
  const pl = document.getElementById('preloader');
  if (!pl) return;
  const num = document.getElementById('plNum');
  const bar = document.getElementById('plBar');
  if (lenis) lenis.stop();
  document.body.style.overflow = 'hidden';

  let v = 0;
  const dur = REDUCED ? 200 : 1300;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    v = Math.round(p * 100);
    if (num) num.textContent = v;
    if (bar) bar.style.width = (p * 100) + '%';
    if (p < 1) { requestAnimationFrame(step); }
    else { finish(); }
  }
  requestAnimationFrame(step);

  function finish() {
    pl.classList.add('done');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    if (lenis) lenis.scrollTo(0, { immediate: true });
    setTimeout(() => { pl.remove(); }, 900);
    introHero();
    if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
  }
})();

/* ─────────────────────────────────────────────────────────────
   3 · TEXT SPLITTING (lines already in markup; words for reveals)
   ───────────────────────────────────────────────────────────── */
function splitWords(el) {
  if (el.dataset.split === 'done') return [];
  const walker = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((tok) => {
        if (tok === '') return;
        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
        const mask = document.createElement('span'); mask.className = 'word-mask';
        const w = document.createElement('span'); w.className = 'word'; w.textContent = tok;
        mask.appendChild(w); frag.appendChild(mask); walker.push(w);
      });
      node.replaceWith(frag);
    } else if (node.nodeType === 1) {
      // keep <em>, <img>, <br> intact but treat as one word unit
      if (node.tagName === 'BR') return;
      const w = node; w.classList.add('word');
      const mask = document.createElement('span'); mask.className = 'word-mask';
      node.replaceWith(mask); mask.appendChild(w); walker.push(w);
    }
  });
  el.dataset.split = 'done';
  return walker;
}

/* ─────────────────────────────────────────────────────────────
   4 · HERO INTRO
   ───────────────────────────────────────────────────────────── */
function introHero() {
  if (!hasGSAP) {
    document.querySelectorAll('.hero [data-split]').forEach((e) => (e.style.opacity = 1));
    gsap && gsap.set && gsap.set('.hero-title .ln > span', { y: 0 });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('.hero-title .ln > span', { yPercent: 0, duration: 1.25, stagger: 0.12 }, 0)
    .from('.hero .eyebrow', { y: 18, opacity: 0, duration: 1 }, 0.25)
    .from('.hero-sub', { y: 18, opacity: 0, duration: 1 }, 0.9)
    .from('.hero .dots', { opacity: 0, duration: 1 }, 1.1)
    .from('.scrollcue', { opacity: 0, duration: 1 }, 1.3);
}
if (hasGSAP) {
  gsap.set('.hero-title .ln > span', { yPercent: 115 });
  gsap.set(['.hero .eyebrow', '.hero-sub', '.hero .dots', '.scrollcue'], { opacity: 1 });
}

/* ─────────────────────────────────────────────────────────────
   5 · SCROLL REVEALS
   ───────────────────────────────────────────────────────────── */
if (hasGSAP) {
  // word-by-word reveals
  gsap.utils.toArray('.reveal-words').forEach((el) => {
    const words = splitWords(el);
    if (!words.length) return;
    gsap.set(words, { yPercent: 110 });
    gsap.to(words, {
      yPercent: 0, duration: 1, ease: 'power3.out', stagger: 0.045,
      scrollTrigger: { trigger: el, start: 'top 86%', once: true }
    });
  });

  // simple fade-up reveals
  const revEls = gsap.utils.toArray('.reveal');
  gsap.set(revEls, { opacity: 0, y: 38 });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          gsap.to(e.target, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' });
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
    revEls.forEach((el) => io.observe(el));
  } else {
    gsap.set(revEls, { opacity: 1, y: 0 });
  }

  // hero eyebrow/sub fade on scroll out
  if (window.ScrollTrigger) {
    gsap.fromTo('.hero-inner', { opacity: 1, y: 0 }, {
      opacity: 0, y: -50, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // piece parallax / scale within sticky stage
    if (!TOUCH) {
      gsap.utils.toArray('[data-parallax]').forEach((el) => {
        const depth = parseFloat(el.dataset.parallax) || 0.1;
        gsap.fromTo(el, { yPercent: depth * 50 }, {
          yPercent: -depth * 50, ease: 'none',
          scrollTrigger: { trigger: el.closest('.collection'), start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
      // slow scale-in of each piece as its collection enters
      gsap.utils.toArray('.piece').forEach((p) => {
        gsap.fromTo(p, { scale: 0.86, opacity: 0.4 }, {
          scale: 1, opacity: 1, ease: 'power2.out',
          scrollTrigger: { trigger: p.closest('.collection'), start: 'top 80%', end: 'top 30%', scrub: 0.8 }
        });
      });
    }
  }
} else if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.style.opacity = 1; e.target.style.transform = 'none'; io.unobserve(e.target); } });
  }, { threshold: 0.14 });
  document.querySelectorAll('.reveal, .reveal-words').forEach((el) => {
    el.style.transition = 'opacity .9s, transform .9s'; el.style.transform = 'translateY(34px)'; io.observe(el);
  });
}

/* ─────────────────────────────────────────────────────────────
   6 · HORIZONTAL GALLERY (pinned, scrubbed) + drag fallback
   ───────────────────────────────────────────────────────────── */
(function gallery() {
  const sec = document.getElementById('gallery');
  const track = document.getElementById('galTrack');
  if (!sec || !track) return;

  if (hasGSAP && window.ScrollTrigger && !TOUCH) {
    const getScroll = () => Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: () => -getScroll(),
      ease: 'none',
      scrollTrigger: {
        trigger: sec,
        start: 'top top',
        end: () => '+=' + getScroll(),
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      }
    });
  }
})();

/* ─────────────────────────────────────────────────────────────
   7 · COLLECTIONS INDEX — cursor-follow peek
   ───────────────────────────────────────────────────────────── */
(function indexPeek() {
  const list = document.getElementById('indexList');
  const peek = document.getElementById('indexPeek');
  if (!list || !peek || TOUCH) return;
  const pks = { garden: peek.querySelector('.pk-garden'), paper: peek.querySelector('.pk-paper'), studio: peek.querySelector('.pk-studio') };
  let px = window.innerWidth / 2, py = window.innerHeight / 2, tx = px, ty = py, active = false;

  list.querySelectorAll('.ix-row').forEach((row) => {
    row.addEventListener('mouseenter', () => {
      active = true; peek.classList.add('show');
      Object.values(pks).forEach((p) => p && p.classList.remove('on'));
      const k = row.dataset.img; if (pks[k]) pks[k].classList.add('on');
    });
    row.addEventListener('mouseleave', () => { active = false; peek.classList.remove('show'); });
  });
  window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    px += (tx - px) * 0.12; py += (ty - py) * 0.12;
    if (active) { peek.style.left = px + 'px'; peek.style.top = py + 'px'; }
    requestAnimationFrame(loop);
  })();
})();

/* ─────────────────────────────────────────────────────────────
   8 · CHAPTER PROGRESS RAIL
   ───────────────────────────────────────────────────────────── */
(function chapters() {
  const rail = document.getElementById('chapters');
  const now = document.getElementById('chNow');
  const name = document.getElementById('chName');
  const bar = document.getElementById('chBar');
  const hero = document.getElementById('hero');
  const secs = Array.from(document.querySelectorAll('section[data-chapter]'));
  if (!rail || !secs.length) return;

  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(([e]) => rail.classList.toggle('show', !e.isIntersecting), { threshold: 0.5 }).observe(hero);
  }
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        if (now) now.textContent = e.target.dataset.chapter || '00';
        if (name) name.textContent = e.target.dataset.name || '';
      }
    });
  }, { threshold: 0.5 });
  secs.forEach((s) => spy.observe(s));

  // overall scroll progress bar
  function progress() {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    if (bar) bar.style.height = Math.max(0, Math.min(1, p)) * 100 + '%';
  }
  if (lenis) lenis.on('scroll', progress); else window.addEventListener('scroll', progress, { passive: true });
  progress();
})();

/* ─────────────────────────────────────────────────────────────
   9 · TOP BAR hide on scroll-down / show on scroll-up
   ───────────────────────────────────────────────────────────── */
(function topbar() {
  const bar = document.getElementById('topbar');
  if (!bar) return;
  let last = 0;
  function onScroll(y) {
    y = y || window.scrollY;
    if (y > last && y > 240) bar.classList.add('hide');
    else bar.classList.remove('hide');
    last = y;
  }
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(), { passive: true });
})();

/* ─────────────────────────────────────────────────────────────
   10 · VINYL (drag · spin · play) — Papersound
   ───────────────────────────────────────────────────────────── */
(function vinyl() {
  const disc = document.getElementById('vinyl');
  if (!disc) return;
  let angle = 0, spinning = false, dragging = false, lastA = 0, velocity = 0;

  if (hasGSAP && window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: '#papersound', start: 'top bottom', end: 'bottom top', scrub: 1.2,
      onUpdate: (self) => { if (!spinning && !dragging) { angle = self.progress * 540; disc.style.transform = `rotate(${angle}deg)`; } }
    });
  }
  function center() { const r = disc.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function pointAngle(x, y) { const c = center(); return Math.atan2(y - c.y, x - c.x) * 180 / Math.PI; }

  disc.addEventListener('pointerdown', (e) => {
    dragging = true; spinning = false; lastA = pointAngle(e.clientX, e.clientY);
    try { disc.setPointerCapture(e.pointerId); } catch (err) {}
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const a = pointAngle(e.clientX, e.clientY);
    let d = a - lastA; if (d > 180) d -= 360; if (d < -180) d += 360;
    angle += d; velocity = d; lastA = a; disc.style.transform = `rotate(${angle}deg)`;
  });
  window.addEventListener('pointerup', () => { if (dragging) { dragging = false; momentum(); } });
  function momentum() {
    if (Math.abs(velocity) < 0.1 || spinning || dragging) return;
    angle += velocity; velocity *= 0.95; disc.style.transform = `rotate(${angle}deg)`;
    requestAnimationFrame(momentum);
  }

  const label = document.getElementById('npLabel');
  const labelDisc = disc.querySelector('.label-disc');
  if (labelDisc) {
    labelDisc.addEventListener('click', (e) => {
      e.stopPropagation();
      spinning = !spinning;
      document.body.classList.toggle('paused', !spinning);
      if (label) label.textContent = spinning ? 'Now playing — Side A' : 'Paused — click the label to play';
      if (spinning) play();
    });
  }
  function play() { if (!spinning) return; angle += 0.55; disc.style.transform = `rotate(${angle}deg)`; requestAnimationFrame(play); }
})();

/* ─────────────────────────────────────────────────────────────
   11 · CUSTOM CURSOR + magnetic buttons
   ───────────────────────────────────────────────────────────── */
if (!TOUCH) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  const lbl = document.querySelector('.cursor-label');
  if (dot && ring) {
    let rx = innerWidth / 2, ry = innerHeight / 2, mx = rx, my = ry;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    (function ringLoop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(ringLoop);
    })();
    document.querySelectorAll('a, button, .ix-row, .discover, .btn-reserve, .scrollcue, .label-disc')
      .forEach((el) => {
        el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
      });
    // drag affordances
    [['#vinyl', 'Drag'], ['#galTrack', 'Drag']].forEach(([sel, text]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.addEventListener('mouseenter', () => { ring.classList.add('is-drag'); if (lbl) lbl.textContent = text; });
      el.addEventListener('mouseleave', () => { ring.classList.remove('is-drag'); if (lbl) lbl.textContent = ''; });
    });
  }

  // magnetic CTAs
  if (hasGSAP) {
    document.querySelectorAll('.magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - (r.left + r.width / 2)) * 0.28, y: (e.clientY - (r.top + r.height / 2)) * 0.34, duration: 0.5, ease: 'power3.out' });
      });
      btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' }));
    });
  }
}

/* ─────────────────────────────────────────────────────────────
   12 · AMBIENT DUST (three.js)
   ───────────────────────────────────────────────────────────── */
if (hasThree && !REDUCED && !TOUCH) {
  const canvas = document.getElementById('dust');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100); camera.position.z = 14;

  const COUNT = 220;
  const positions = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 34;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
    speeds[i] = 0.002 + Math.random() * 0.006;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xc89478, size: 0.07, transparent: true, opacity: 0.45,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat); scene.add(points);

  let mxn = 0, myn = 0;
  window.addEventListener('mousemove', (e) => { mxn = e.clientX / innerWidth - 0.5; myn = e.clientY / innerHeight - 0.5; });
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  resize(); window.addEventListener('resize', resize);

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) tick(); });
  function tick() {
    if (!running) return;
    const pos = geo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] += speeds[i];
      pos[i * 3] += Math.sin(pos[i * 3 + 1] * 0.5 + i) * 0.002;
      if (pos[i * 3 + 1] > 11) pos[i * 3 + 1] = -11;
    }
    geo.attributes.position.needsUpdate = true;
    points.rotation.y += (mxn * 0.4 - points.rotation.y) * 0.02;
    points.rotation.x += (myn * 0.3 - points.rotation.x) * 0.02;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* refresh ScrollTrigger after fonts load (layout shift safety) */
if (hasGSAP && window.ScrollTrigger && document.fonts) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
window.addEventListener('load', () => { if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh(); });
