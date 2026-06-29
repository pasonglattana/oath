/* Oath House — live content hydration.
   Pulls editable content from the backend (/api/content) and updates the
   Calendar, Journal and Reservation experiences. If the API isn't reachable
   (e.g. the site is served statically without the backend), the original
   hardcoded HTML is left untouched. */
(async function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let content;
  try {
    const r = await fetch('/api/content', { credentials: 'same-origin' });
    if (!r.ok) return;
    content = await r.json();
  } catch (e) { return; }            // no backend → keep static content
  if (!content) return;

  window.OATH_CONTENT = content;
  if (content.media) hydrateMedia(content.media);
  if (Array.isArray(content.events)) hydrateCalendar(content.events);
  if (Array.isArray(content.stories)) hydrateStories(content.stories);
  if (content.music) setupMusic(content.music);
  // let the booking module pick up live experiences
  window.dispatchEvent(new CustomEvent('oath:content', { detail: content }));
  // new nodes changed the page height — keep scroll animations honest
  if (window.ScrollTrigger) try { window.ScrollTrigger.refresh(); } catch (e) {}

  // ── MUSIC (admin-selected song that plays on the site) ──
  function setupMusic(song) {
    if (!song || !song.src) return;
    const toggle = document.getElementById('soundToggle');
    const audio = document.createElement('audio');
    audio.id = 'oathSong'; audio.src = song.src; audio.loop = true; audio.preload = 'auto';
    document.body.appendChild(audio);

    let pref = null; try { pref = localStorage.getItem('oath_sound'); } catch (e) {}
    let wantsSound = pref !== '0';     // play by default unless the visitor muted before
    let started = false;
    const label = song.title ? ('Now playing — ' + song.title + (song.artist ? ' · ' + song.artist : '')) : 'Now playing';

    function playSong() {
      const p = audio.play();
      if (p && p.then) p.then(markOn).catch(function () {});
      else markOn();
    }
    function markOn() {
      if (toggle) { toggle.classList.add('is-on'); toggle.setAttribute('aria-pressed', 'true'); toggle.title = label; }
    }
    function pauseSong() {
      audio.pause();
      if (toggle) { toggle.classList.remove('is-on'); toggle.setAttribute('aria-pressed', 'false'); }
    }

    // The sound toggle now drives the SONG (capture-phase + stopImmediatePropagation
    // keeps the procedural ambient from also firing, so they never overlap).
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.stopImmediatePropagation();
        if (audio.paused) { wantsSound = true; save('1'); playSong(); }
        else { wantsSound = false; save('0'); pauseSong(); }
      }, true);
    }
    function save(v) { try { localStorage.setItem('oath_sound', v); } catch (e) {} }

    // autoplay policy: browsers need a gesture — start on the first one
    const EVT = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    function firstGesture(e) {
      if (started) return; started = true;
      EVT.forEach(function (ev) { window.removeEventListener(ev, firstGesture, true); });
      const onToggle = toggle && e.target && toggle.contains(e.target);  // toggle handles itself
      if (!onToggle && wantsSound) playSong();
    }
    EVT.forEach(function (ev) { window.addEventListener(ev, firstGesture, { capture: true, passive: true }); });
    if (wantsSound) playSong();     // also try right away (allowed on some browsers)
  }

  // ── MEDIA (site photos) ──
  function hydrateMedia(media) {
    document.querySelectorAll('[data-media]').forEach((node) => {
      const url = media[node.dataset.media];
      if (!url) return;
      if (node.tagName === 'IMG') { node.removeAttribute('srcset'); node.src = url; }
      else { node.style.backgroundImage = `url("${url}")`; }
    });
  }

  // ── CALENDAR ──
  function longDate(iso, day, month) {
    if (iso) { try { return new Date(iso + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {} }
    return [day, month].filter(Boolean).join(' ');
  }
  function hydrateCalendar(events) {
    if (!events.length) return;
    const feature = events.find(e => e.featured) || events[0];
    const rest = events.filter(e => e !== feature);

    // featured card
    const cf = document.querySelector('.cal-feature');
    if (cf && feature) {
      const cap = cf.querySelector('.plate-cap'); if (cap) cap.textContent = feature.title;
      const body = cf.querySelector('.cf-body');
      if (body) body.innerHTML =
        `<p class="cf-tag">Featured · ${esc(feature.room || 'The House')}</p>
         <h3>${esc(feature.title)}</h3>
         <div class="cf-meta"><span>${esc(longDate(feature.date, feature.day, feature.month))}</span><span>${esc(feature.time || '')}</span><span>${esc(feature.room || '')}</span></div>
         <p>${esc(feature.description || '')}</p>`;
    }

    // event list
    const journal = document.querySelector('#calendar .journal');
    if (journal) {
      journal.innerHTML = rest.map(ev => `
        <article>
          <span class="j-hover"></span>
          <div class="j-date"><span class="d">${esc(ev.day || '')}</span><span class="m">${esc(ev.month || '')}</span></div>
          <div class="j-body">
            <p class="j-room">${esc(ev.room || '')}</p>
            <h3>${esc(ev.title || '')}</h3>
            <p>${esc(ev.description || '')}</p>
          </div>
          <div class="j-time">${esc(ev.time || '')}</div>
        </article>`).join('');
    }
  }

  // ── JOURNAL / STORIES ──
  function articleHref(s) { return 'article.html?id=' + encodeURIComponent(s.id); }
  function hydrateStories(stories) {
    if (!stories.length) return;
    const feature = stories.find(s => s.featured) || stories[0];
    const rest = stories.filter(s => s !== feature);

    const sf = document.querySelector('.story-feature');
    if (sf && feature) {
      const href = articleHref(feature);
      const img = sf.querySelector('.sf-media img'); if (img) img.src = feature.image || img.src;
      const cat = sf.querySelector('.st-cat'); if (cat) cat.textContent = feature.category || '';
      const date = sf.querySelector('.st-date'); if (date) date.textContent = feature.date || '';
      const tt = sf.querySelector('.sf-title a'); if (tt) { tt.textContent = feature.title || ''; tt.href = href; }
      const ex = sf.querySelector('.sf-excerpt'); if (ex) ex.textContent = feature.excerpt || '';
      const media = sf.querySelector('.sf-media'); if (media) media.href = href;
      const read = sf.querySelector('.story-read'); if (read) read.href = href;
    }

    const grid = document.querySelector('.stories-grid');
    if (grid) {
      grid.innerHTML = rest.map(s => `
        <article class="story-card">
          <a class="sc-media" href="${esc(articleHref(s))}"><img src="${esc(s.image || '')}" alt="" loading="lazy" /></a>
          <div class="story-meta"><span class="st-cat">${esc(s.category || '')}</span><span class="st-date">${esc(s.date || '')}</span></div>
          <h3 class="sc-title"><a href="${esc(articleHref(s))}">${esc(s.title || '')}</a></h3>
        </article>`).join('');
    }
  }
})();
