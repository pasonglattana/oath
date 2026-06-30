/* ═══════════════════════════════════════════════════════════════
   OATH HOUSE — main.js
   Lenis smooth scroll · GSAP / ScrollTrigger storytelling
   Three.js ambient dust · day/night ritual system
   ═══════════════════════════════════════════════════════════════ */

document.documentElement.classList.remove('no-js');

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH   = window.matchMedia('(hover: none)').matches || window.innerWidth < 800;
const hasGSAP = typeof gsap !== 'undefined';
const hasLenis = typeof Lenis !== 'undefined';
const hasThree = typeof THREE !== 'undefined';

/* ─────────────────────────────────────────────────────────────
   1 · SMOOTH SCROLL (Lenis) bound to GSAP ScrollTrigger
   ───────────────────────────────────────────────────────────── */
let lenis = null;
// Smooth scroll on pointer devices only. On touch screens we hand scrolling
// back to the OS so iOS/Android momentum + rubber-band feel completely native.
if (hasLenis && !REDUCED && !TOUCH) {
  lenis = new Lenis({ duration: 1.15, lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  window.lenis = lenis; // exposed for in-page navigation / debugging
  if (hasGSAP && gsap.registerPlugin && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
} else if (hasGSAP && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
  else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
}

/* ─────────────────────────────────────────────────────────────
   2 · DAY / NIGHT RITUAL SYSTEM
   ───────────────────────────────────────────────────────────── */
const PHASES = [
  { key: 'is-morning',   label: 'Morning'   },
  { key: 'is-afternoon', label: 'Afternoon' },
  { key: 'is-evening',   label: 'Evening'   },
  { key: 'is-night',     label: 'Night'     },
];
function phaseFromHour(h) {
  if (h >= 5  && h < 11) return 0;   // morning
  if (h >= 11 && h < 16) return 1;   // afternoon
  if (h >= 16 && h < 19) return 2;   // evening
  return 3;                          // night
}
let manualPhase = null; // null = follow clock

function applyPhase(idx) {
  PHASES.forEach(p => document.body.classList.remove(p.key));
  document.body.classList.add(PHASES[idx].key);
  const phaseEl = document.getElementById('clockPhase');
  if (phaseEl) phaseEl.textContent = PHASES[idx].label;
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.textContent = (idx === 3) ? 'Day' : 'Night';
}
function tickClock() {
  const now = new Date();
  const idx = manualPhase !== null ? manualPhase : phaseFromHour(now.getHours());
  applyPhase(idx);
  const t = document.getElementById('clockTime');
  if (t) t.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' · Vientiane';
}
tickClock();
setInterval(tickClock, 30000);

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = manualPhase !== null ? manualPhase : phaseFromHour(new Date().getHours());
    manualPhase = (current === 3) ? 1 : 3;   // flip day <-> night
    applyPhase(manualPhase);
    const phaseEl = document.getElementById('clockPhase');
    if (phaseEl) phaseEl.textContent = manualPhase === 3 ? 'Night' : 'Afternoon';
  });
}

/* ─────────────────────────────────────────────────────────────
   3 · CUSTOM CURSOR (desktop)
   ───────────────────────────────────────────────────────────── */
if (!TOUCH) {
  const dot  = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (dot && ring) {
    let rx = window.innerWidth / 2, ry = window.innerHeight / 2, mx = rx, my = ry;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    (function ringLoop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(ringLoop);
    })();
    const hoverables = 'a, button, .room-hot, .path, input, select, .journal article';
    document.querySelectorAll(hoverables).forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
    });
  }
}

/* ─────────────────────────────────────────────────────────────
   4 · THREE.JS AMBIENT DUST (subtle, drifting motes)
   ───────────────────────────────────────────────────────────── */
if (hasThree && !REDUCED && !TOUCH) {
  const canvas = document.getElementById('dust');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 14;

  const COUNT = 240;
  const positions = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i*3]   = (Math.random() - 0.5) * 34;
    positions[i*3+1] = (Math.random() - 0.5) * 22;
    positions[i*3+2] = (Math.random() - 0.5) * 14;
    speeds[i] = 0.002 + Math.random() * 0.006;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc89478, size: 0.07, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  let mxn = 0, myn = 0;
  window.addEventListener('mousemove', (e) => {
    mxn = (e.clientX / window.innerWidth - 0.5);
    myn = (e.clientY / window.innerHeight - 0.5);
  });

  function resizeDust() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resizeDust();
  window.addEventListener('resize', resizeDust);

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) animateDust(); });

  function animateDust() {
    if (!running) return;
    const pos = geo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      pos[i*3+1] += speeds[i];                       // drift up like dust in light
      pos[i*3]   += Math.sin(pos[i*3+1] * 0.5 + i) * 0.002;
      if (pos[i*3+1] > 11) pos[i*3+1] = -11;
    }
    geo.attributes.position.needsUpdate = true;
    points.rotation.y += (mxn * 0.4 - points.rotation.y) * 0.02;
    points.rotation.x += (myn * 0.3 - points.rotation.x) * 0.02;
    mat.opacity = document.body.classList.contains('is-night') ? 0.7 : 0.45;
    renderer.render(scene, camera);
    requestAnimationFrame(animateDust);
  }
  animateDust();
}

/* ─────────────────────────────────────────────────────────────
   5 · ARRIVAL INTRO + REVEALS (GSAP) / IO fallback
   ───────────────────────────────────────────────────────────── */
if (hasGSAP) {
  gsap.set(['.arrival-logo', '.arrival-slogan'], { opacity: 1 });
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.arrival-logo', { y: 26, opacity: 0, duration: 1.3 }, 0.35)
    .from('.arrival-slogan', { y: 18, opacity: 0, duration: 1 }, 0.85);

  // Reveals via IntersectionObserver — fires reliably on anchor jumps,
  // programmatic scroll and bfcache restores (ScrollTrigger once:true can miss
  // those, leaving content stuck invisible). GSAP still does the animation.
  gsap.set('#arrival [data-reveal]', { opacity: 1 });
  const revealEls = gsap.utils.toArray('[data-reveal]').filter((el) => !el.closest('#arrival'));
  gsap.set(revealEls, { opacity: 0, y: 40 });
  if ('IntersectionObserver' in window) {
    const revIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          gsap.to(e.target, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' });
          revIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => revIO.observe(el));
  } else {
    gsap.set(revealEls, { opacity: 1, y: 0 });
  }

  if (window.ScrollTrigger) {
    if (!TOUCH) {
      gsap.utils.toArray('[data-parallax]').forEach((el) => {
        const depth = parseFloat(el.dataset.parallax) || 0.1;
        gsap.fromTo(el, { yPercent: depth * 60 }, {
          yPercent: -depth * 60, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    }

    // Image Frame System — slow "archival uncover" (soft scaling, like
    // material being lifted from a folio). O-frames keep their hover aperture.
    gsap.utils.toArray('.frame-img:not(.frame-o) .plate').forEach((img) => {
      gsap.fromTo(img, { scale: 1.1, opacity: 0.35 }, {
        scale: 1, opacity: 1, ease: 'power2.out', duration: 1.6,
        scrollTrigger: { trigger: img, start: 'top 88%', once: true }
      });
    });

    gsap.to('.arrival-inner', {
      opacity: 0, y: -60, ease: 'none',
      scrollTrigger: { trigger: '#arrival', start: 'top top', end: 'bottom top', scrub: true }
    });

    const plPaths = document.querySelectorAll('#floorplan svg .pl');
    plPaths.forEach((p) => {
      let len = 0; try { len = p.getTotalLength(); } catch (e) {}
      if (!len) return;
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(p, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: '#floorplan', start: 'top 80%', end: 'center center', scrub: 0.6 }
      });
    });
    document.querySelectorAll('.room-hot').forEach((h, i) => {
      gsap.from(h, { opacity: 0, scale: 0.8, duration: 0.8, delay: i * 0.1,
        scrollTrigger: { trigger: '#floorplan', start: 'center 70%', once: true } });
    });
  }
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = 1; e.target.style.transform = 'none'; io.unobserve(e.target); } });
  }, { threshold: 0.16 });
  document.querySelectorAll('[data-reveal]').forEach(el => { el.style.transition = 'opacity .9s, transform .9s'; el.style.transform = 'translateY(36px)'; io.observe(el); });
}

/* ─────────────────────────────────────────────────────────────
   6 · DOT-NAV + ROOM HOTSPOTS (cinematic jumps)
   ───────────────────────────────────────────────────────────── */
document.querySelectorAll('[data-go]').forEach((btn) => {
  btn.addEventListener('click', () => scrollToId(btn.dataset.go));
});

const dotnav = document.getElementById('dotnav');
const dots = dotnav ? Array.from(dotnav.querySelectorAll('button')) : [];
const sections = dots.map(d => document.getElementById(d.dataset.go)).filter(Boolean);

if ('IntersectionObserver' in window) {
  const arrival = document.getElementById('arrival');
  if (arrival) {
    new IntersectionObserver(([e]) => {
      if (dotnav) dotnav.classList.toggle('show', !e.isIntersecting);
      // cream UI controls while the dark hero photo fills the screen
      document.body.classList.toggle('at-arrival', e.isIntersecting);
    }, { threshold: 0.4 }).observe(arrival);
  }
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.id;
        dots.forEach(d => d.classList.toggle('active', d.dataset.go === id));
      }
    });
  }, { threshold: 0.5 });
  sections.forEach(s => spy.observe(s));
}

/* ─────────────────────────────────────────────────────────────
   7 · PAPERSOUND — vinyl spin (scroll + drag + play)
   ───────────────────────────────────────────────────────────── */
(function vinyl() {
  const disc = document.getElementById('vinyl');
  if (!disc) return;
  let angle = 0, spinning = false, dragging = false, lastA = 0, velocity = 0;

  if (hasGSAP && window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: '#papersound', start: 'top bottom', end: 'bottom top', scrub: 1.2,
      onUpdate: (self) => { if (!spinning && !dragging) { angle = self.progress * 360; disc.style.transform = `rotate(${angle}deg)`; } }
    });
  }

  function center() { const r = disc.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; }
  function pointAngle(x, y) { const c = center(); return Math.atan2(y - c.y, x - c.x) * 180 / Math.PI; }

  disc.addEventListener('pointerdown', (e) => {
    dragging = true; spinning = false; lastA = pointAngle(e.clientX, e.clientY);
    try { disc.setPointerCapture(e.pointerId); } catch (err) {}
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const a = pointAngle(e.clientX, e.clientY);
    let delta = a - lastA;
    if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
    angle += delta; velocity = delta; lastA = a;
    disc.style.transform = `rotate(${angle}deg)`;
  });
  window.addEventListener('pointerup', () => { if (dragging) { dragging = false; momentum(); } });

  function momentum() {
    if (Math.abs(velocity) < 0.1 || spinning || dragging) return;
    angle += velocity; velocity *= 0.95;
    disc.style.transform = `rotate(${angle}deg)`;
    requestAnimationFrame(momentum);
  }

  const label = document.getElementById('npLabel');
  const labelDisc = disc.querySelector('.label-disc');
  if (labelDisc) {
    labelDisc.addEventListener('click', (e) => {
      e.stopPropagation();
      spinning = !spinning;
      document.body.classList.toggle('paused', !spinning);
      if (label) label.textContent = spinning ? 'Now playing — Side A' : 'Paused — click to play';
      if (spinning) play();
    });
  }
  function play() {
    if (!spinning) return;
    angle += 0.6; disc.style.transform = `rotate(${angle}deg)`;
    requestAnimationFrame(play);
  }
})();

/* ─────────────────────────────────────────────────────────────
   8 · RESERVATIONS — multi-step booking flow
   ───────────────────────────────────────────────────────────── */
(function booking() {
  const root = document.getElementById('booking');
  if (!root) return;

  const DEFAULT_EXP = {
    table:   { label: 'Table · Oath Garden',     where: 'Oath Garden',  partyType: 'guests',
               slots: ['08:00','09:30','11:00','12:30','14:00','18:00','19:30','21:00'], full: ['12:30'] },
    session: { label: 'Listening Session · Papersound', where: 'Papersound', partyType: 'guests',
               slots: ['20:00','21:30'], full: [] },
    class:   { label: 'Class · Oath Studio',      where: 'Oath Studio',  partyType: 'class',
               classes: [
                 { name: 'Sunrise Breathwork', slots: ['07:30'] },
                 { name: 'Slow Flow Yoga',      slots: ['09:00'] },
                 { name: 'Movement & Mobility', slots: ['18:00'] },
                 { name: 'Sound Bath & Stillness', slots: ['19:30'] },
                 { name: 'Restorative & Recovery', slots: ['17:00'] },
               ] }
  };
  // EXP can be overridden by the backend (admin-managed reservations). The step-1
  // choices map to keys table/session/class; live data refreshes their details.
  let EXP = DEFAULT_EXP;
  function applyLiveExp(list) {
    if (!Array.isArray(list) || !list.length) return;
    const map = {};
    list.forEach((e) => {
      if (!e.key) return;
      map[e.key] = { label: e.label, where: e.where_txt, partyType: e.party_type,
                     slots: Array.isArray(e.slots) ? e.slots : [],
                     full:  Array.isArray(e.full)  ? e.full  : [],
                     classes: Array.isArray(e.classes) ? e.classes : undefined };
    });
    EXP = Object.assign({}, DEFAULT_EXP, map);
  }
  if (window.OATH_CONTENT && window.OATH_CONTENT.experiences) applyLiveExp(window.OATH_CONTENT.experiences);
  window.addEventListener('oath:content', (e) => { if (e.detail) applyLiveExp(e.detail.experiences); });

  const state = { step: 1, exp: null, date: null, guests: null, klass: null, time: null, name: '', email: '', phone: '', notes: '' };
  const panels = Array.from(root.querySelectorAll('.bk-panel'));
  const steps  = Array.from(root.querySelectorAll('.bk-steps li'));
  const back   = document.getElementById('bkBack');
  const next   = document.getElementById('bkNext');
  const summary= document.getElementById('bkSummary');
  const foot   = document.getElementById('bkFoot');

  function fmtDate(d) {
    try { return new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }); }
    catch (e) { return d; }
  }
  function isoOffset(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

  function showPanel(key) {
    panels.forEach(p => { const m = p.dataset.step === String(key); p.hidden = !m; p.classList.toggle('is-active', m); });
  }

  // ── render dynamic step content ──
  function renderQuick() {
    const q = document.getElementById('bkQuick');
    const opts = [ ['Today', isoOffset(0)], ['Tomorrow', isoOffset(1)],
                   [new Date(isoOffset(2)+'T00:00').toLocaleDateString('en-GB',{weekday:'long'}), isoOffset(2)] ];
    q.innerHTML = opts.map(([l, v]) => `<button type="button" class="bk-chip${state.date===v?' on':''}" data-date="${v}">${l}</button>`).join('');
    q.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      state.date = b.dataset.date; document.getElementById('bkDate').value = state.date;
      renderQuick(); validate();
    }));
  }
  function renderDetails() {
    const host = document.getElementById('bkDetails');
    const e = EXP[state.exp];
    if (e.partyType === 'guests') {
      host.innerHTML = `<h3 class="bk-q">How many?</h3><div class="bk-chips" id="bkGuests">` +
        [1,2,3,4,5,6,'7 +'].map(n => `<button type="button" class="bk-chip${String(state.guests)===String(n)?' on':''}" data-g="${n}">${n}</button>`).join('') + `</div>`;
      host.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { state.guests = b.dataset.g; renderDetails(); validate(); }));
    } else {
      host.innerHTML = `<h3 class="bk-q">Choose a class</h3><div class="bk-classlist" id="bkClasses">` +
        e.classes.map((c,i) => `<button type="button" class="bk-class${state.klass===i?' on':''}" data-c="${i}"><span>${c.name}</span><em>${c.slots.join(' · ')}</em></button>`).join('') + `</div>`;
      host.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { state.klass = +b.dataset.c; state.time = null; renderSlots(); renderDetails(); validate(); }));
    }
  }
  function renderSlots() {
    const host = document.getElementById('bkSlots');
    const e = EXP[state.exp];
    let slots = [], full = e.full || [];
    if (e.partyType === 'class') slots = state.klass != null ? e.classes[state.klass].slots : [];
    else slots = e.slots;
    if (!slots.length) { host.innerHTML = '<p class="bk-hint">Choose a class to see times.</p>'; return; }
    host.innerHTML = slots.map(s => {
      const isFull = full.includes(s);
      return `<button type="button" class="bk-chip${state.time===s?' on':''}${isFull?' is-full':''}" data-t="${s}" ${isFull?'disabled':''}>${s}${isFull?'<small>full</small>':''}</button>`;
    }).join('');
    host.querySelectorAll('[data-t]:not([disabled])').forEach(b => b.addEventListener('click', () => { state.time = b.dataset.t; renderSlots(); validate(); }));
  }

  // ── validation per step ──
  function stepValid() {
    switch (state.step) {
      case 1: return !!state.exp;
      case 2: return !!state.date;
      case 3: {
        const e = EXP[state.exp];
        const partyOk = e.partyType === 'guests' ? !!state.guests : state.klass != null;
        return partyOk && !!state.time;
      }
      case 4: return state.name.trim().length > 1 && /\S+@\S+\.\S+/.test(state.email);
      default: return false;
    }
  }
  function validate() { next.disabled = !stepValid(); renderSummary(); }

  function renderSummary() {
    if (!state.exp) { summary.textContent = 'Select an experience to begin.'; return; }
    const e = EXP[state.exp];
    const bits = [e.where];
    if (state.exp === 'class' && state.klass != null) bits.push(EXP.class.classes[state.klass].name);
    if (state.date) bits.push(fmtDate(state.date));
    if (state.time) bits.push(state.time);
    if (state.exp !== 'class' && state.guests) bits.push(state.guests + (state.guests === '1' ? ' guest' : ' guests'));
    summary.innerHTML = bits.join(' &nbsp;·&nbsp; ');
  }

  function goTo(step) {
    state.step = step;
    showPanel(step);
    steps.forEach(s => { const n = +s.dataset.step; s.classList.toggle('active', n === step); s.classList.toggle('done', n < step); });
    back.hidden = step === 1;
    next.textContent = step === 4 ? 'Confirm request' : 'Continue';
    if (step === 2) renderQuick();
    if (step === 3) { renderDetails(); renderSlots(); }
    validate();
    // gentle scroll to keep the panel in view
    if (lenis) lenis.scrollTo(root, { offset: -110, duration: 0.8 });
    else { const y = root.getBoundingClientRect().top + window.pageYOffset - 110; window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' }); }
  }

  // step 1 path selection
  root.querySelectorAll('.path').forEach(p => p.addEventListener('click', () => {
    root.querySelectorAll('.path').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    state.exp = p.dataset.path; state.time = null; state.guests = null; state.klass = null;
    validate(); goTo(2);
  }));

  document.getElementById('bkDate').addEventListener('change', (e) => { state.date = e.target.value; renderQuick(); validate(); });
  ['bkName','bkEmail','bkPhone','bkNotes'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { state[id.replace('bk','').toLowerCase()] = el.value; validate(); });
  });

  back.addEventListener('click', () => { if (state.step > 1) goTo(state.step - 1); });
  next.addEventListener('click', () => {
    if (!stepValid()) return;
    if (state.step < 4) { goTo(state.step + 1); return; }
    // submit
    const e = EXP[state.exp];
    const party = state.exp === 'class' && state.klass != null ? EXP.class.classes[state.klass].name
                  : (state.guests ? state.guests + (state.guests === '1' ? ' guest' : ' guests') : '');
    const sum = [e.label, state.exp === 'class' && state.klass != null ? EXP.class.classes[state.klass].name : null,
                 fmtDate(state.date), state.time, state.exp !== 'class' && state.guests ? state.guests + ' guests' : null]
                 .filter(Boolean).join(' · ');
    // send the request to the house (saved in the backend + emailed if configured)
    fetch('/api/reserve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exp: state.exp, exp_label: e.label, date: state.date, time: state.time,
        party: party, name: state.name, email: state.email, phone: state.phone, notes: state.notes })
    }).catch(() => {});   // optimistic: backend may be absent on a static preview
    document.getElementById('bkSuccessSum').textContent = sum;
    showPanel('done'); foot.hidden = true;
    steps.forEach(s => s.classList.add('done'));
    if (lenis) lenis.scrollTo(root, { offset: -110, duration: 0.8 });
    else { const y = root.getBoundingClientRect().top + window.pageYOffset - 110; window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' }); }
  });

  document.getElementById('bkRestart').addEventListener('click', () => {
    Object.assign(state, { step: 1, exp: null, date: null, guests: null, klass: null, time: null, name: '', email: '', phone: '', notes: '' });
    ['bkName','bkEmail','bkPhone','bkNotes','bkDate'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    root.querySelectorAll('.path').forEach(x => x.classList.remove('active'));
    foot.hidden = false; goTo(1);
  });

  // context-aware Reserve button in the header → preselect & open
  document.querySelectorAll('[data-reserve-exp]').forEach(btn => btn.addEventListener('click', () => {
    const exp = btn.dataset.reserveExp;
    const p = root.querySelector(`.path[data-path="${exp}"]`);
    if (p) setTimeout(() => p.click(), 900);
  }));

  validate();
})();

/* ─────────────────────────────────────────────────────────────
   9 · MANIFESTO — word-by-word reveal on scroll
   ───────────────────────────────────────────────────────────── */
(function manifesto() {
  const el = document.getElementById('manifestoText');
  if (!el) return;
  const out = [];
  el.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      child.textContent.split(/(\s+)/).forEach((tok) => {
        if (tok.trim() === '') { out.push(document.createTextNode(tok)); return; }
        const s = document.createElement('span'); s.className = 'mf-word'; s.textContent = tok; out.push(s);
      });
    } else if (child.nodeType === 1) {
      child.classList.add('mf-word');
      out.push(child);
    }
  });
  el.innerHTML = '';
  out.forEach(n => el.appendChild(n));
  const words = el.querySelectorAll('.mf-word');

  if (hasGSAP && window.ScrollTrigger && !REDUCED) {
    gsap.to(words, {
      opacity: 1, stagger: 0.08, ease: 'none',
      scrollTrigger: { trigger: '#manifesto', start: 'top 70%', end: 'center center', scrub: 1 }
    });
  } else {
    words.forEach(w => w.style.opacity = 1);
  }
})();

/* refresh ScrollTrigger after fonts load (layout shift safety) */
if (hasGSAP && window.ScrollTrigger && document.fonts) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

/* Safety net: only if the scroll-reveal system never initialised
   (GSAP present but ScrollTrigger missing) — otherwise trust the
   choreography. Without this guard it would blanket-reveal everything. */
if (hasGSAP && !window.ScrollTrigger) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
          el.style.transition = 'opacity .8s ease';
          el.style.opacity = 1;
        }
      });
    }, 1500);
  });
}

/* ─────────────────────────────────────────────────────────────
   10 · THE LIVING HOUSE — today's rhythm + discoverable objects
   ───────────────────────────────────────────────────────────── */
(function livingHouse() {
  const rhythmEl = document.getElementById('rhythm');
  const sceneEl  = document.getElementById('scene');
  if (!rhythmEl || !sceneEl) return;

  const S = 'stroke="currentColor" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const GLYPHS = {
    cup:    `<svg viewBox="0 0 48 48" ${S}><path d="M13 19h20v8c0 6-5 10-10 10s-10-4-10-10z"/><path d="M33 21c5 0 7 3 7 6s-3 6-7 6"/><path d="M11 42h26"/><path d="M19 9c-1 2 1 3 0 5M27 9c-1 2 1 3 0 5"/></svg>`,
    bread:  `<svg viewBox="0 0 48 48" ${S}><path d="M8 30c0-8 6-14 16-14s16 6 16 14c0 3-2 4-4 4H12c-2 0-4-1-4-4z"/><path d="M18 20l-2 12M24 19l0 13M30 20l2 12"/></svg>`,
    plant:  `<svg viewBox="0 0 48 48" ${S}><path d="M24 40V20"/><path d="M24 24c-7 0-11-4-11-10 6 0 11 3 11 10z"/><path d="M24 20c6 0 10-3 10-9-5 0-10 3-10 9z"/><path d="M16 40h16"/></svg>`,
    chair:  `<svg viewBox="0 0 48 48" ${S}><path d="M16 8v20M16 20h14M30 8v20"/><path d="M14 28h20l-2 12M16 40l2-12"/><path d="M16 36h16"/></svg>`,
    basket: `<svg viewBox="0 0 48 48" ${S}><path d="M10 22h28l-3 16H13z"/><path d="M16 22c0-7 4-11 8-11s8 4 8 11"/><path d="M10 22h28"/></svg>`,
    bottle: `<svg viewBox="0 0 48 48" ${S}><path d="M21 7h6v8c0 2 4 4 4 9v18c0 1-1 2-2 2H19c-1 0-2-1-2-2V24c0-5 4-7 4-9z"/><path d="M17 28h14"/></svg>`,
    ceramic:`<svg viewBox="0 0 48 48" ${S}><path d="M15 18c2-1 16-1 18 0l-2 18c-4 2-10 2-14 0z"/><path d="M16 22c5 1 11 1 16 0"/></svg>`,
    candle: `<svg viewBox="0 0 48 48" ${S}><path d="M18 20h12v18H18z"/><path d="M24 20v-4"/><path d="M24 8c3 3 3 6 0 8-3-2-3-5 0-8z"/><path d="M15 38h18"/></svg>`,
    vinyl:  `<svg viewBox="0 0 48 48" ${S}><circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="5"/><circle cx="24" cy="24" r="0.6" fill="currentColor"/></svg>`,
    speaker:`<svg viewBox="0 0 48 48" ${S}><rect x="14" y="7" width="20" height="34" rx="2"/><circle cx="24" cy="16" r="3.4"/><circle cx="24" cy="30" r="5.4"/></svg>`,
    cocktail:`<svg viewBox="0 0 48 48" ${S}><path d="M12 14h24L24 28z"/><path d="M24 28v10M18 40h12"/></svg>`,
    o:      `<svg viewBox="0 0 48 48" ${S}><circle cx="24" cy="21" r="12"/><circle cx="20" cy="40" r="1.4" fill="currentColor" stroke="none"/><circle cx="28" cy="40" r="1.4" fill="currentColor" stroke="none"/></svg>`,
    moon:   `<svg viewBox="0 0 48 48" ${S}><circle cx="24" cy="24" r="14"/><path d="M19 14a13 13 0 0 0 0 20" opacity=".5"/></svg>`
  };

  const PHASE_KEYS = ['morning','afternoon','evening','night'];
  function realHour(){ return new Date().getHours(); }
  function effectivePhaseKey(){
    const idx = (typeof manualPhase !== 'undefined' && manualPhase !== null)
      ? manualPhase : (typeof phaseFromHour === 'function' ? phaseFromHour(realHour()) : 1);
    return PHASE_KEYS[idx] || 'afternoon';
  }
  function toMin(t){ const [h,m] = t.split(':').map(Number); return h*60+m; }
  function nowMin(){ const d=new Date(); return d.getHours()*60+d.getMinutes(); }
  // crude moon illumination (Conway) → is it ~full tonight?
  function isFullMoon(){
    const d=new Date(), y=d.getFullYear(), mo=d.getMonth()+1, day=d.getDate();
    let r=y%100; r%=19; if(r>9)r-=19; r=((r*11)%30)+mo+day; if(mo<3)r+=2; r-= (y<2000?4:8.3); r=Math.floor(r+0.5)%30; const age=r<0?r+30:r;
    return Math.abs(age-15) <= 1.2; // within ~1 day of full
  }

  const FALLBACK = { soundtrack:'Japanese Jazz · 1978 – 1985', conditions:{rain:false,eventToday:false,eventName:''},
    rituals:[{time:'08:00',phase:'morning',title:'The Garden Awakens',lines:['Coffee.','Morning light.','Fresh bread.']},
      {time:'12:00',phase:'afternoon',title:'Gather & Share',lines:['Lunch service begins.','The house becomes fuller.']},
      {time:'17:30',phase:'evening',title:'Golden Hour',lines:['Natural wine.','Long shadows.']},
      {time:'20:00',phase:'night',title:'Listening Session',lines:['Papersound opens.','Tonight — {soundtrack}']},
      {time:'21:30',phase:'night',title:'After Dark',lines:['Cocktails.','Records.','Conversation.']}],
    objects:[{id:'o',glyph:'o',name:'The O',windows:['any'],rare:true,kicker:'A House of Rituals',title:'Rooted in the Real',body:['You found the mark.'],meta:'Oath House'}] };

  const SLOTS = [ {x:24,y:66,s:96},{x:53,y:74,s:84},{x:75,y:60,s:104},{x:40,y:50,s:72},{x:86,y:80,s:60} ];
  const RARE_SLOT = {x:63,y:28,s:56};

  const STORE_KEY = 'oath_living_found';
  function loadFound(){ try{ return new Set(JSON.parse(localStorage.getItem(STORE_KEY)||'[]')); }catch(e){ return new Set(); } }
  function saveFound(set){ try{ localStorage.setItem(STORE_KEY, JSON.stringify([...set])); }catch(e){} }
  const found = loadFound();

  function fillTokens(str, data){ return String(str).replace(/\{soundtrack\}/g, data.soundtrack || ''); }

  let DATA = FALLBACK;

  function renderRhythm(){
    const r = DATA.rituals || [];
    const manual = (typeof manualPhase !== 'undefined' && manualPhase !== null);
    let nowIdx;
    if (manual) {
      const pk = effectivePhaseKey();
      nowIdx = r.map((x,i)=>x.phase===pk?i:-1).filter(i=>i>=0).pop();
      if (nowIdx == null) nowIdx = r.length-1;
    } else {
      const nm = nowMin(); nowIdx = -1;
      r.forEach((x,i)=>{ if (toMin(x.time) <= nm) nowIdx = i; });
      if (nowIdx < 0) nowIdx = r.length-1; // before first ritual → still last night's
    }
    rhythmEl.innerHTML = r.map((x,i)=>{
      const cls = i<nowIdx?'past':(i===nowIdx?'now':'');
      const lines = x.lines.map(l=>fillTokens(l,DATA)).join('<br/>');
      const badge = i===nowIdx
        ? `<span class="now-badge"><span class="nb-dot"></span>Now · <span class="nb-clock" id="nbClock"></span></span>` : '';
      return `<li class="${cls}">${badge}<div class="r-time">${x.time}</div>
        <div class="r-title">${x.title}</div><div class="r-lines">${lines}</div></li>`;
    }).join('');
    tickNowClock();
  }
  function tickNowClock(){
    const c = document.getElementById('nbClock');
    if (c) c.textContent = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  }

  function visibleObjects(){
    const pk = effectivePhaseKey();
    const all = DATA.objects || [];
    const normal = all.filter(o => !o.rare && !o.special && (o.windows||[]).some(w=>w===pk||w==='any'));
    const out = [];
    // specials first (event-like) so they always surface when active
    all.forEach(o=>{
      if (o.special==='fullmoon' && isFullMoon() && (o.windows||[]).some(w=>w===pk||w==='any')) out.push(o);
      if (o.special==='rain' && DATA.conditions && DATA.conditions.rain) out.push(o);
      if (o.special==='event' && DATA.conditions && DATA.conditions.eventToday) out.push(o);
    });
    normal.forEach(o=>out.push(o));
    const picked = out.slice(0, SLOTS.length);
    // the rare O — appears unpredictably (and always once discovered, as a faint memory)
    const rare = all.find(o=>o.rare);
    const showRare = rare && (found.has(rare.id) ? true : Math.random() < 0.6);
    return { picked, rare: showRare ? rare : null };
  }

  function placeObjects(){
    sceneEl.querySelectorAll('.obj').forEach(n=>n.remove());
    const { picked, rare } = visibleObjects();
    picked.forEach((o,i)=>{ const sl = SLOTS[i]; sceneEl.appendChild(makeObj(o, sl)); });
    if (rare) sceneEl.appendChild(makeObj(rare, RARE_SLOT, true));
  }

  function makeObj(o, slot, isRare){
    const b = document.createElement('button');
    b.className = 'obj' + (REDUCED?'':' breathe') + (isRare?' is-rare':'') + (found.has(o.id)?' found':'');
    b.style.left = slot.x+'%'; b.style.top = slot.y+'%';
    b.style.width = slot.s+'px'; b.style.height = slot.s+'px';
    if (!REDUCED) b.style.animationDelay = (Math.round(slot.x)%6 * 0.4) + 's';
    b.setAttribute('aria-label', o.name);
    b.innerHTML = (GLYPHS[o.glyph]||GLYPHS.o) + `<span class="obj-cap">${o.name}</span>`;
    b.addEventListener('click', ()=>openArtifact(o));
    return b;
  }

  /* — Artifact panel — */
  const veil = document.getElementById('artifactVeil');
  const panel = document.getElementById('artifact');
  const elGlyph = document.getElementById('artifactGlyph');
  const elKicker = document.getElementById('artifactKicker');
  const elTitle = document.getElementById('artifactTitle');
  const elBody = document.getElementById('artifactBody');
  const elMeta = document.getElementById('artifactMeta');
  let lastFocus = null;

  function openArtifact(o){
    elGlyph.innerHTML = GLYPHS[o.glyph] || GLYPHS.o;
    elKicker.textContent = fillTokens(o.kicker||'', DATA);
    elTitle.textContent = fillTokens(o.title||o.name, DATA);
    elBody.innerHTML = (o.body||[]).map(p=>`<p>${fillTokens(p,DATA)}</p>`).join('');
    elMeta.textContent = fillTokens(o.meta||'', DATA);
    lastFocus = document.activeElement;
    veil.hidden = false; panel.hidden = false;
    document.body.classList.add('artifact-open');
    if (lenis) lenis.stop();
    requestAnimationFrame(()=>{ veil.classList.add('show'); panel.classList.add('show'); });
    const closeBtn = document.getElementById('artifactClose'); if (closeBtn) closeBtn.focus();
    // collect
    if (!found.has(o.id)) { found.add(o.id); saveFound(found); updateCollector(); }
    document.querySelectorAll('.obj').forEach(n=>{ if (n.getAttribute('aria-label')===o.name) n.classList.add('found'); });
  }
  function closeArtifact(){
    veil.classList.remove('show'); panel.classList.remove('show');
    document.body.classList.remove('artifact-open');
    if (lenis) lenis.start();
    setTimeout(()=>{ veil.hidden = true; panel.hidden = true; }, 800);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.getElementById('artifactClose').addEventListener('click', closeArtifact);
  veil.addEventListener('click', closeArtifact);
  document.addEventListener('keydown', e=>{ if (e.key==='Escape' && !panel.hidden) closeArtifact(); });

  /* — Collector — */
  function updateCollector(){
    const el = document.getElementById('collector');
    const cnt = document.getElementById('collectorCount');
    const tot = document.getElementById('collectorTotal');
    if (!el) return;
    const total = (DATA.objects||[]).length;
    tot.textContent = total;
    cnt.textContent = [...found].filter(id=>(DATA.objects||[]).some(o=>o.id===id)).length;
    el.hidden = (found.size === 0);
  }

  function renderAll(){ renderRhythm(); placeObjects(); updateCollector(); }

  // mark scene touched (fades the hint) on first interaction
  sceneEl.addEventListener('pointerenter', ()=>sceneEl.classList.add('touched'), { once:true });

  // keep the NOW clock ticking, and re-render objects when the user time-travels via the theme toggle
  setInterval(()=>{ tickNowClock(); }, 20000);
  const tt = document.getElementById('themeToggle');
  if (tt) tt.addEventListener('click', ()=> setTimeout(renderAll, 60));

  // load content (the no-code CMS) then render
  fetch('living-house.json', { cache:'no-store' })
    .then(r=>r.ok?r.json():Promise.reject())
    .then(json=>{ DATA = json; renderAll(); })
    .catch(()=>{ DATA = FALLBACK; renderAll(); });
})();

/* ─────────────────────────────────────────────────────────────
   11 · MENU DRAWER (top-left icon → full navigation)
   ───────────────────────────────────────────────────────────── */
(function menuDrawer() {
  const btn = document.getElementById('menuBtn');
  const drawer = document.getElementById('drawer');
  const veil = document.getElementById('drawerVeil');
  const closeBtn = document.getElementById('drawerClose');
  if (!btn || !drawer || !veil) return;
  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    veil.hidden = false;
    document.body.classList.add('menu-open');
    drawer.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { veil.classList.add('show'); drawer.classList.add('show'); });
    if (closeBtn) closeBtn.focus();
  }
  function close() {
    veil.classList.remove('show'); drawer.classList.remove('show');
    document.body.classList.remove('menu-open');
    drawer.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { veil.hidden = true; }, 750);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  btn.addEventListener('click', () => document.body.classList.contains('menu-open') ? close() : open());
  if (closeBtn) closeBtn.addEventListener('click', close);
  veil.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) close(); });
  // links scroll (via the global [data-go] handler) then the drawer closes
  drawer.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', () => setTimeout(close, 160)));
})();

/* ─────────────────────────────────────────────────────────────
   12 · THE BUILDING — interactive vertical 3-floor house
   ───────────────────────────────────────────────────────────── */
(function tower() {
  const stage = document.getElementById('towerStage');
  const towerEl = document.getElementById('tower');
  if (!stage || !towerEl) return;
  const floors = Array.from(stage.querySelectorAll('.floor'));
  const idxBtns = Array.from(document.querySelectorAll('.tower-index button'));
  const N = floors.length;
  let active = 0; // ground floor (Oath Garden) first

  function layout() {
    floors.forEach((f) => {
      const idx = +f.dataset.floor;          // 0 ground … 2 top
      const o = idx - active;                 // offset from active
      const h = f.offsetHeight || 200;
      const y = -o * h * 0.64;                // higher floors sit higher
      let z, rx, sc, op, zi;
      if (o === 0) { z = 90; rx = 0; sc = 1; op = 1; zi = 20; }
      else {
        const a = Math.abs(o);
        z = -150 - (a - 1) * 130;
        rx = o > 0 ? 46 : -46;               // above leans back-up, below leans back-down
        sc = 0.84 - (a - 1) * 0.08;
        op = a === 1 ? 0.46 : 0.16;
        zi = 20 - a;
      }
      f.style.transform = `translate3d(-50%, calc(-50% + ${y}px), ${z}px) rotateX(${rx}deg) scale(${sc})`;
      f.style.opacity = op;
      f.style.zIndex = zi;
      f.classList.toggle('is-active', o === 0);
      f.setAttribute('aria-hidden', o !== 0 ? 'true' : 'false');
    });
    idxBtns.forEach((b) => b.classList.toggle('active', +b.dataset.floor === active));
  }
  function setActive(i) { active = Math.max(0, Math.min(N - 1, i)); layout(); }

  idxBtns.forEach((b) => b.addEventListener('click', () => setActive(+b.dataset.floor)));

  // a real swipe/drag sets `moved`, so the tap-handlers below know to stand down
  let moved = false;
  const STEP = 44;                                   // px of finger travel = one floor

  // tap a floor: if not active → bring it forward; if active → enter that room
  floors.forEach((f) => f.addEventListener('click', () => {
    if (moved) { moved = false; return; }            // that was a swipe, not a tap
    const idx = +f.dataset.floor;
    if (idx !== active) setActive(idx);
    else if (f.dataset.go) scrollToId(f.dataset.go);
  }));

  const up = document.getElementById('towerUp');
  const down = document.getElementById('towerDown');
  if (up) up.addEventListener('click', () => setActive(active + 1));
  if (down) down.addEventListener('click', () => setActive(active - 1));

  towerEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active - 1); }
  });

  /* ── move between floors by finger-swipe (touch) and mouse-drag (desktop) ──
     swipe / drag UP   → rise to the floor above
     swipe / drag DOWN → sink to the floor below                              */

  // desktop mouse / stylus drag (touch is handled by the touch listeners below)
  let dragY = null;
  towerEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    dragY = e.clientY; moved = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (dragY !== null && Math.abs(e.clientY - dragY) > 6) moved = true;
  });
  window.addEventListener('pointerup', (e) => {
    if (dragY === null) return;
    const dy = e.clientY - dragY; dragY = null;
    if (Math.abs(dy) > STEP) setActive(active + (dy < 0 ? 1 : -1)); // drag up → ascend
  });

  // touch finger-swipe — we claim clearly-vertical gestures inside the tower and
  // turn them into floor changes; at the top/bottom floor the swipe is released
  // so the page can still scroll past the building (no finger-trap).
  let tY = null, tX = null;
  towerEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { tY = null; return; }
    tY = e.touches[0].clientY; tX = e.touches[0].clientX; moved = false;
  }, { passive: true });
  towerEl.addEventListener('touchmove', (e) => {
    if (tY === null || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - tY;
    const dx = e.touches[0].clientX - tX;
    if (Math.abs(dy) < 8 || Math.abs(dx) > Math.abs(dy)) return;    // ignore taps / sideways
    const dir = dy < 0 ? 1 : -1;                                    // swipe up → ascend
    const atEnd = (dir > 0 && active >= N - 1) || (dir < 0 && active <= 0);
    if (atEnd) return;                                             // edge → let the page scroll
    if (e.cancelable) e.preventDefault();                          // claim this vertical gesture
    moved = true;
    if (Math.abs(dy) > STEP) {
      setActive(active + dir);
      tY = e.touches[0].clientY; tX = e.touches[0].clientX;         // re-anchor for the next floor
    }
  }, { passive: false });
  towerEl.addEventListener('touchend', () => { tY = null; }, { passive: true });

  layout();
  window.addEventListener('resize', layout);
  if (window.ScrollTrigger) ScrollTrigger.create({ trigger: '#map', start: 'top 70%', once: true, onEnter: layout });
})();

/* ─────────────────────────────────────────────────────────────
   13 · PRELOADER — the O draws itself, then the house opens
   ───────────────────────────────────────────────────────────── */
(function preloader() {
  const pl = document.getElementById('preloader');
  const draw = document.querySelector('.pl-draw');
  const countEl = document.getElementById('plCount');
  if (!pl || REDUCED) { document.body.classList.remove('is-loading'); if (pl) pl.remove(); return; }
  const LEN = 251.3;
  let p = 0;
  if (lenis) lenis.stop();
  const tick = setInterval(() => {
    p = Math.min(100, p + (2 + Math.random() * 5));
    if (draw) draw.style.strokeDashoffset = String(LEN * (1 - p / 100));
    if (countEl) countEl.textContent = String(Math.round(p));
    if (p >= 100) {
      clearInterval(tick);
      document.body.classList.add('pl-done');
      setTimeout(() => {
        document.body.classList.remove('is-loading');
        if (lenis) lenis.start();
        if (window.ScrollTrigger) ScrollTrigger.refresh();
        setTimeout(() => pl && pl.remove(), 1000);
      }, 420);
    }
  }, 90);
})();

/* ─────────────────────────────────────────────────────────────
   14 · MAGNETIC ELEMENTS (desktop)
   ───────────────────────────────────────────────────────────── */
if (!TOUCH && !REDUCED) {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic) || 0.3;
    let raf = null, tx = 0, ty = 0, cx = 0, cy = 0;
    function loop() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      el.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) raf = requestAnimationFrame(loop);
      else raf = null;
    }
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    el.addEventListener('pointerleave', () => {
      tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop);
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   15 · AMBIENT SOUND — a procedural room tone per section
   ───────────────────────────────────────────────────────────── */
(function ambient() {
  const toggle = document.getElementById('soundToggle');
  if (!toggle) return;
  let ctx = null, master = null, pad = [], filt = null, lfo = null, crackleTimer = null, on = false;

  // soundscape per section: root freq, filter cutoff, crackle (vinyl)
  const SCENES = {
    arrival:    { root: 110.0, cutoff: 600,  crackle: false, chord: [1, 1.5, 2] },
    map:        { root: 110.0, cutoff: 650,  crackle: false, chord: [1, 1.5, 2] },
    garden:     { root: 130.8, cutoff: 900,  crackle: false, chord: [1, 1.25, 2] },   // brighter, open
    papersound: { root: 98.0,  cutoff: 420,  crackle: true,  chord: [1, 1.5, 1.875] }, // warm, vinyl
    studio:     { root: 116.5, cutoff: 520,  crackle: false, chord: [1, 1.5, 3] },     // airy, calm
    program:    { root: 116.5, cutoff: 540,  crackle: false, chord: [1, 1.5, 3] },
    calendar:   { root: 103.8, cutoff: 480,  crackle: false, chord: [1, 1.2, 1.8] },
    reserve:    { root: 110.0, cutoff: 620,  crackle: false, chord: [1, 1.5, 2] },
    stories:    { root: 123.5, cutoff: 760,  crackle: false, chord: [1, 1.5, 2] }
  };
  let scene = SCENES.arrival;

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = scene.cutoff; filt.Q.value = 0.6; filt.connect(master);
    // gentle drifting cutoff
    lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05; lfoGain.gain.value = 120; lfo.connect(lfoGain); lfoGain.connect(filt.frequency); lfo.start();
    // three soft detuned oscillators (a pad)
    pad = scene.chord.map((mult, i) => {
      const o = ctx.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = scene.root * mult; o.detune.value = (i - 1) * 4;
      const g = ctx.createGain(); g.gain.value = i === 0 ? 0.5 : 0.22;
      o.connect(g); g.connect(filt); o.start();
      return { o, g, mult };
    });
    master.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2.5);
  }

  function noiseBuffer() {
    const b = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    return b;
  }
  function crackle() {
    if (!on || !scene.crackle || !ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 1200; bp.Q.value = 6;
    const g = ctx.createGain(); g.gain.value = 0.0; g.gain.setValueAtTime(0.06 + Math.random() * 0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(); src.stop(ctx.currentTime + 0.1);
    crackleTimer = setTimeout(crackle, 120 + Math.random() * 520);
  }

  function applyScene(s) {
    scene = s; if (!ctx || !on) return;
    const t = ctx.currentTime;
    filt.frequency.cancelScheduledValues(t); filt.frequency.setValueAtTime(filt.frequency.value, t);
    filt.frequency.linearRampToValueAtTime(s.cutoff, t + 1.6);
    pad.forEach((p, i) => { p.o.frequency.linearRampToValueAtTime(s.root * (s.chord[i] || 1), t + 1.6); });
    clearTimeout(crackleTimer); if (s.crackle) crackle();
  }

  function start() {
    if (!ctx) build(); else { ctx.resume(); master.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.5); }
    on = true; toggle.classList.add('is-on'); toggle.setAttribute('aria-pressed', 'true');
    applyScene(scene);
    try { localStorage.setItem('oath_sound', '1'); } catch (e) {}
  }
  function stop() {
    on = false; toggle.classList.remove('is-on'); toggle.setAttribute('aria-pressed', 'false');
    clearTimeout(crackleTimer);
    if (ctx) master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    try { localStorage.setItem('oath_sound', '0'); } catch (e) {}
  }
  toggle.addEventListener('click', () => (on ? stop() : start()));

  // follow the section in view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting && SCENES[e.target.id]) applyScene(SCENES[e.target.id]); });
    }, { threshold: 0.5 });
    Object.keys(SCENES).forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }
})();

/* ─────────────────────────────────────────────────────────────
   16 · TIME-OF-DAY PAGE TITLE
   ───────────────────────────────────────────────────────────── */
(function todTitle() {
  const phases = ['Morning', 'Afternoon', 'Golden Hour', 'After Dark'];
  function set() {
    const idx = phaseFromHour(new Date().getHours());
    document.title = `Oath House · ${phases[idx]} — A House of Rituals`;
  }
  set(); setInterval(set, 60000);
})();

/* ─────────────────────────────────────────────────────────────
   17 · SCROLL PROGRESS + CONTEXT-AWARE RESERVE LABEL
   ───────────────────────────────────────────────────────────── */
(function orientation() {
  const bar = document.getElementById('scrollProgress');
  function updateBar() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (window.scrollY || h.scrollTop) / max : 0;
    if (bar) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
  }
  if (lenis) lenis.on('scroll', updateBar); else window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();

  // Reserve button adapts its wording to the room you're in
  const reserve = document.querySelector('.reserve-btn');
  if (reserve && 'IntersectionObserver' in window) {
    const MAP = { garden: { t: 'Reserve a table', e: 'table' }, papersound: { t: 'Reserve a seat', e: 'session' },
                  studio: { t: 'Reserve a class', e: 'class' }, program: { t: 'Reserve a class', e: 'class' } };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && MAP[e.target.id]) {
          reserve.textContent = MAP[e.target.id].t;
          reserve.dataset.reserveExp = MAP[e.target.id].e;
        } else if (e.isIntersecting && e.target.id === 'arrival') {
          reserve.textContent = 'Reserve'; delete reserve.dataset.reserveExp;
        }
      });
    }, { threshold: 0.55 });
    ['arrival','garden','papersound','studio','program'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // drawer reflects the current section
  const drawer = document.getElementById('drawer');
  if (drawer && 'IntersectionObserver' in window) {
    const links = Array.from(drawer.querySelectorAll('[data-go]'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('here', l.dataset.go === e.target.id)); });
    }, { threshold: 0.5 });
    links.forEach(l => { const s = document.getElementById(l.dataset.go); if (s) io.observe(s); });
  }
})();

/* ─────────────────────────────────────────────────────────────
   18 · NEWSLETTER — saved to the backend (Newsletter tab in admin)
   ───────────────────────────────────────────────────────────── */
(function newsletter() {
  const form = document.getElementById('newsForm');
  if (!form) return;
  const input = document.getElementById('newsEmail');
  const msg = document.getElementById('newsMsg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (input.value || '').trim();
    if (!/\S+@\S+\.\S+/.test(v)) { msg.textContent = 'Please enter a valid email.'; msg.style.color = '#c8896a'; return; }
    try { localStorage.setItem('oath_news', v); } catch (err) {}
    try { await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v }) }); } catch (err) {}
    form.classList.add('is-done');
    msg.style.color = '#8f9a82';
    msg.textContent = 'Your oath is sealed — we will write to you soon.';
    input.value = ''; input.disabled = true;
  });
})();

/* ─────────────────────────────────────────────────────────────
   19 · ADD-TO-CALENDAR (.ics) on each event
   ───────────────────────────────────────────────────────────── */
(function calendarInvites() {
  const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
  const YEAR = 2026;
  function pad(n) { return String(n).padStart(2, '0'); }
  function stamp(d) { return d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function ics(title, desc, loc, start, end, allDay) {
    const dt = allDay
      ? `DTSTART;VALUE=DATE:${start.getFullYear()}${pad(start.getMonth()+1)}${pad(start.getDate())}`
      : `DTSTART:${stamp(start)}\r\nDTEND:${stamp(end)}`;
    return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Oath House//EN','BEGIN:VEVENT',
      'UID:' + Math.abs((title+start).split('').reduce((a,c)=>a*31+c.charCodeAt(0)|0,7)) + '@oathhouse.la',
      dt, 'SUMMARY:' + title, 'DESCRIPTION:' + (desc||''), 'LOCATION:' + (loc||'Oath House, Vientiane'),
      'END:VEVENT','END:VCALENDAR'].join('\r\n');
  }
  document.querySelectorAll('#calendar .journal article').forEach((art) => {
    const d = art.querySelector('.j-date .d'), m = art.querySelector('.j-date .m');
    const h3 = art.querySelector('.j-body h3'), room = art.querySelector('.j-room');
    const timeEl = art.querySelector('.j-time');
    if (!d || !m || !h3) return;
    const day = parseInt(d.textContent, 10);
    const mon = MONTHS[(m.textContent || '').trim().toLowerCase().slice(0,3)];
    const times = (timeEl ? timeEl.textContent : '').match(/(\d{1,2}):(\d{2})/g) || [];
    let start, end, allDay = false;
    if (times.length) {
      const [sh, sm] = times[0].split(':').map(Number);
      start = new Date(YEAR, mon, day, sh, sm);
      if (times[1]) { const [eh, em] = times[1].split(':').map(Number); end = new Date(YEAR, mon, day, eh, em); }
      else end = new Date(YEAR, mon, day, sh + 2, sm);
    } else { start = new Date(YEAR, mon, day); end = start; allDay = true; }
    const link = document.createElement('button');
    link.type = 'button'; link.className = 'j-cal';
    link.innerHTML = '<span>+</span> Add to calendar';
    link.addEventListener('click', () => {
      const blob = new Blob([ics(h3.textContent.trim(), (room?room.textContent+' · ':'') + 'Oath House', 'Oath House, Vientiane', start, end, allDay)], { type: 'text/calendar' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'oath-' + h3.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40) + '.ics';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    });
    (art.querySelector('.j-body') || art).appendChild(link);
  });
})();

/* ═══════════════════════════════════════════════════════════
   20 · MUSEUM MODE — the hidden archive
   Open via: the footer ✦ key, or type "ARCHIVE" anywhere.
   Closes on ✕, ESC, or the in-archive exit link.
   ═══════════════════════════════════════════════════════════ */
(function museumMode(){
  const museum = document.getElementById('museum');
  if (!museum) return;
  const scroll  = document.getElementById('muScroll');
  const keyBtn  = document.getElementById('archiveKey');
  const closeB  = document.getElementById('muClose');
  const exitB   = document.getElementById('muExit');
  let lastFocus = null;
  let isOpen = false;

  function open(){
    if (isOpen) return; isOpen = true;
    lastFocus = document.activeElement;
    museum.hidden = false;
    museum.setAttribute('aria-hidden', 'false');
    // force reflow so the opacity transition fires
    void museum.offsetWidth;
    requestAnimationFrame(() => museum.classList.add('is-open'));
    document.body.classList.add('museum-open');
    try { if (window.lenis) window.lenis.stop(); } catch(e){}
    if (scroll) scroll.scrollTop = 0;
    setTimeout(() => { try { (scroll || closeB).focus({ preventScroll: true }); } catch(e){} }, 60);
  }

  function close(){
    if (!isOpen) return; isOpen = false;
    museum.classList.remove('is-open');
    museum.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('museum-open');
    try { if (window.lenis) window.lenis.start(); } catch(e){}
    const done = () => { museum.hidden = true; museum.removeEventListener('transitionend', onEnd); };
    let ended = false;
    const onEnd = (e) => { if (e.target === museum && !ended){ ended = true; done(); } };
    museum.addEventListener('transitionend', onEnd);
    setTimeout(() => { if (!ended){ ended = true; done(); } }, 850); // fallback
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch(e){}
  }

  if (keyBtn) keyBtn.addEventListener('click', open);
  if (closeB) closeB.addEventListener('click', close);
  if (exitB)  exitB.addEventListener('click', (e) => { e.preventDefault(); close(); });

  // ESC to close; simple focus trap while open
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape'){ e.preventDefault(); close(); return; }
    if (e.key === 'Tab'){
      const f = museum.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  // keyboard easter egg — type the word "archive" (or "museum") anywhere
  let buf = '';
  const SECRETS = ['archive', 'museum', 'oath2017'];
  document.addEventListener('keydown', (e) => {
    if (isOpen) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.key && e.key.length === 1 && /[a-z0-9]/i.test(e.key)){
      buf = (buf + e.key.toLowerCase()).slice(-9);
      if (SECRETS.some(s => buf.endsWith(s))){ buf = ''; open(); }
    }
  });
})();
