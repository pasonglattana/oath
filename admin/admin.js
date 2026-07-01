/* Oath House — Studio (admin) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };

  // ── content schemas drive the lists + editor forms ──
  const ROOMS = ['Oath Garden', 'Oath Studio', 'The House', 'Both rooms'];
  const SCHEMA = {
    events: {
      title: 'Calendar Events', sub: 'What the house is hosting — these appear in the Calendar section of the site.',
      empty: 'No events yet. Add your first one.',
      fields: [
        { k: 'title', t: 'text', label: 'Title', placeholder: 'Listening Session — Lao Modern' },
        { k: 'room', t: 'select', label: 'Room', options: ROOMS },
        { k: 'time', t: 'text', label: 'Time (as shown)', placeholder: '20:00 — Late' },
        { k: 'day', t: 'text', label: 'Day', placeholder: '12', half: true },
        { k: 'month', t: 'text', label: 'Month', placeholder: 'Jun', half: true },
        { k: 'date', t: 'date', label: 'Full date', hint: 'Optional — powers the “Add to calendar” button' },
        { k: 'description', t: 'textarea', label: 'Description' },
        { k: 'featured', t: 'toggle', label: 'Featured — show as the large card at the top' },
        { k: 'published', t: 'toggle', label: 'Published — visible on the live site' },
        { k: 'sort', t: 'number', label: 'Order (lower shows first)' },
      ],
    },
    experiences: {
      title: 'Experiences', sub: 'The bookable experiences shown in the reservation flow.',
      empty: 'No experiences yet.',
      fields: [
        { k: 'label', t: 'text', label: 'Name', placeholder: 'Table · Oath Garden' },
        { k: 'where_txt', t: 'text', label: 'Where', placeholder: 'Oath Garden' },
        { k: 'party_type', t: 'select', label: 'Type', options: [['guests', 'Guests (table / session)'], ['class', 'Class (pick a class)']] },
        { k: 'key', t: 'text', label: 'Internal key', hint: 'Used by the booking logic — change with care' },
        { k: 'slots', t: 'csv', label: 'Time slots', hint: 'Comma-separated, e.g. 18:00, 19:30, 21:00', showIf: r => r.party_type !== 'class' },
        { k: 'full', t: 'csv', label: 'Sold-out slots', hint: 'Comma-separated times to mark as full', showIf: r => r.party_type !== 'class' },
        { k: 'classes', t: 'classes', label: 'Classes', showIf: r => r.party_type === 'class' },
        { k: 'published', t: 'toggle', label: 'Published — bookable on the site' },
        { k: 'sort', t: 'number', label: 'Order' },
      ],
    },
    stories: {
      title: 'Journal', sub: 'Stories & dispatches at the bottom of the site.',
      empty: 'No stories yet.',
      fields: [
        { k: 'title', t: 'text', label: 'Title' },
        { k: 'category', t: 'text', label: 'Category', placeholder: 'Culture', half: true },
        { k: 'date', t: 'text', label: 'Date (as shown)', placeholder: 'June 2026', half: true },
        { k: 'excerpt', t: 'textarea', label: 'Excerpt', hint: 'Short teaser shown on the cards' },
        { k: 'body', t: 'textarea', label: 'Full article', hint: 'The full story — leave a blank line between paragraphs' },
        { k: 'image', t: 'image', label: 'Image' },
        { k: 'link', t: 'text', label: 'External link', hint: 'Optional — only if this story lives on another site' },
        { k: 'featured', t: 'toggle', label: 'Featured — large story' },
        { k: 'published', t: 'toggle', label: 'Published' },
        { k: 'sort', t: 'number', label: 'Order' },
      ],
    },
    instructors: {
      title: 'Instructors', sub: 'The studio team shown on the “Our Instructors” page.',
      empty: 'No instructors yet. Add your first.', thumbs: true,
      fields: [
        { k: 'name', t: 'text', label: 'Name' },
        { k: 'role', t: 'text', label: 'Role', placeholder: 'Breath & Stillness' },
        { k: 'image', t: 'image', label: 'Photo' },
        { k: 'bio', t: 'textarea', label: 'Bio', hint: 'Leave a blank line between paragraphs' },
        { k: 'specialties', t: 'text', label: 'Specialties', hint: 'Comma-separated, e.g. Breathwork, Sound healing' },
        { k: 'published', t: 'toggle', label: 'Published — visible on the site' },
        { k: 'sort', t: 'number', label: 'Order' },
      ],
    },
    hours: {
      title: 'Opening Hours', sub: 'The opening hours shown in the footer of the site. Each row is one line — reorder with the “Order” field.',
      empty: 'No hours yet. Add your first row.',
      fields: [
        { k: 'label', t: 'text', label: 'Days', placeholder: 'Tue – Thu' },
        { k: 'value', t: 'text', label: 'Hours', placeholder: '08:00 – 23:00', hint: 'What shows on the right — e.g. “08:00 – Late” or “Closed”' },
        { k: 'closed', t: 'toggle', label: 'Closed — style this row as a closed day' },
        { k: 'published', t: 'toggle', label: 'Published — visible on the site' },
        { k: 'sort', t: 'number', label: 'Order (lower shows first)' },
      ],
    },
    subscribers: {
      title: 'Newsletter', sub: 'People who signed up for the letter, newest first.', noAdd: true,
      empty: 'No signups yet.',
      fields: [
        { k: 'email', t: 'readonly', label: 'Email' },
        { k: 'created', t: 'readonly', label: 'Signed up' },
      ],
    },
    media: {
      title: 'Photos', sub: 'The main photography on the site. Upload a new image to swap any of these.',
      empty: 'No photo slots.', noAdd: true, noDelete: true, thumbs: true,
      fields: [
        { k: 'label', t: 'readonly', label: 'Where this appears' },
        { k: 'image', t: 'image', label: 'Photo' },
      ],
    },
    reservations: {
      title: 'Bookings', sub: 'Reservation requests sent from the site. Newest first.',
      empty: 'No booking requests yet.', noAdd: true,
      fields: [
        { k: 'name', t: 'readonly', label: 'Guest' },
        { k: 'exp_label', t: 'readonly', label: 'Experience' },
        { k: 'date', t: 'readonly', label: 'Date' },
        { k: 'time', t: 'readonly', label: 'Time' },
        { k: 'party', t: 'readonly', label: 'Party' },
        { k: 'email', t: 'readonly', label: 'Email' },
        { k: 'phone', t: 'readonly', label: 'Phone' },
        { k: 'notes', t: 'readonly', label: 'Note' },
        { k: 'created', t: 'readonly', label: 'Received' },
        { k: 'status', t: 'select', label: 'Status', options: [['new', 'New'], ['confirmed', 'Confirmed'], ['cancelled', 'Cancelled']] },
      ],
    },
    music: {
      title: 'Music', sub: 'Pick a song to play on the site. The visitor hears it as soon as they interact with the page.',
      empty: 'No songs yet. Add one and mark it “Play on the site”.',
      fields: [
        { k: 'title', t: 'text', label: 'Song title', placeholder: 'A Side — Lao Modern' },
        { k: 'artist', t: 'text', label: 'Artist', placeholder: 'Various' },
        { k: 'src', t: 'audio', label: 'Audio file', hint: 'Upload an MP3/M4A/WAV, or paste a direct audio URL (not a Spotify/YouTube page link)' },
        { k: 'active', t: 'toggle', label: 'Play this on the site (only one song plays at a time)' },
        { k: 'sort', t: 'number', label: 'Order' },
      ],
    },
  };

  let view = 'events';
  let items = [];
  let editing = null; // current item being edited (null = none, {} = new)

  // ── API ──
  async function api(method, path, body) {
    const opt = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    const res = await fetch(path, opt);
    if (res.status === 401) { showLogin(); throw new Error('unauthorised'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ── auth ──
  function showLogin() { $('#login').hidden = false; $('#app').hidden = true; }
  function showApp() { $('#login').hidden = true; $('#app').hidden = false; loadView(view); }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#loginMsg'); msg.textContent = '';
    try {
      await api('POST', '/api/login', { password: $('#pw').value });
      $('#pw').value = '';
      showApp();
    } catch (err) { msg.textContent = err.message || 'Could not sign in'; }
  });
  $('#logout').addEventListener('click', async () => { await api('POST', '/api/logout').catch(() => {}); showLogin(); });

  // ── navigation ──
  $('#nav').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#nav button').forEach(x => x.classList.toggle('active', x === b));
    loadView(b.dataset.view);
  });
  function $$(s, r = document) { return Array.from(r.querySelectorAll(s)); }

  async function loadView(v) {
    view = v;
    closeEditor();
    if (v === 'settings') return renderSettings();
    const sc = SCHEMA[v];
    $('#viewTitle').textContent = sc.title;
    $('#viewSub').textContent = sc.sub;
    $('#addBtn').hidden = !!sc.noAdd;
    $('#list').innerHTML = '<p class="list-empty">Loading…</p>';
    try {
      const data = await api('GET', `/api/admin/${v}`);
      items = data.items || [];
      if (v === 'reservations' || v === 'subscribers') items.reverse();   // newest first
      renderList();
    } catch (err) { $('#list').innerHTML = `<p class="list-empty">${err.message}</p>`; }
  }

  // ── list ──
  function renderList() {
    const list = $('#list'); list.innerHTML = '';
    if (!items.length) { list.innerHTML = `<p class="list-empty">${SCHEMA[view].empty}</p>`; return; }
    items.forEach(it => list.appendChild(renderRow(it)));
  }

  function renderRow(it) {
    const row = el('div', 'row' + (it.published ? '' : ' unpub'));
    if (SCHEMA[view].thumbs) {
      const tTitle = it.name || it.label || it.key || '(untitled)';
      const tSub = it.role || it.image || (it.image ? '' : 'No image');
      const tag = SCHEMA[view].noAdd ? '<span class="tag">Change ▸</span>'
                : (!it.published ? '<span class="tag draft">Draft</span>' : '');
      row.className = 'row' + (it.published === 0 ? ' unpub' : '');
      row.innerHTML = `<div class="row-thumb">${it.image ? `<img src="${esc(it.image)}" alt=""/>` : ''}</div>
        <div class="row-main"><h3>${esc(tTitle)}</h3><p>${esc(tSub)}</p></div>
        <div class="row-tags">${tag}</div>`;
      row.addEventListener('click', () => openEditor(it));
      return row;
    }
    let left = '';
    if (view === 'events') left = `<div class="row-date"><span class="d">${it.day || '—'}</span><span class="m">${it.month || ''}</span></div>`;
    const title = it.title || it.label || it.name || it.email || '(untitled)';
    let meta = '';
    if (view === 'events') meta = [it.room, it.time].filter(Boolean).join(' · ');
    else if (view === 'experiences') meta = [it.where_txt, it.party_type === 'class' ? 'Class' : 'Guests'].filter(Boolean).join(' · ');
    else if (view === 'stories') meta = [it.category, it.date].filter(Boolean).join(' · ');
    else if (view === 'music') meta = [it.artist, it.src ? '' : 'no file'].filter(Boolean).join(' · ');
    else if (view === 'reservations') meta = [it.exp_label, it.date, it.time, it.party].filter(Boolean).join(' · ');
    else if (view === 'hours') meta = it.closed ? 'Closed' : (it.value || '');
    else if (view === 'subscribers') meta = 'Signed up ' + (it.created || '');
    const tags = [];
    if (it.featured) tags.push('<span class="tag feat">Featured</span>');
    if (view === 'music' && it.active) tags.push('<span class="tag feat">♪ Playing</span>');
    if (view === 'reservations') {
      const cls = it.status === 'confirmed' ? 'feat' : it.status === 'cancelled' ? 'draft' : 'feat';
      tags.push(`<span class="tag ${it.status === 'new' ? 'feat' : cls}">${esc((it.status || 'new').replace(/^./, c => c.toUpperCase()))}</span>`);
    }
    if (['events', 'stories', 'hours'].includes(view) && !it.published) tags.push('<span class="tag draft">Draft</span>');
    row.innerHTML = `${left}
      <div class="row-main"><h3>${esc(title)}</h3><p>${esc(meta)}</p></div>
      <div class="row-tags">${tags.join('')}</div>`;
    row.addEventListener('click', () => openEditor(it));
    return row;
  }

  // ── editor ──
  $('#addBtn').addEventListener('click', () => openEditor({}));
  $('#editorClose').addEventListener('click', closeEditor);
  $('#cancelBtn').addEventListener('click', closeEditor);
  $('#drawerVeil').addEventListener('click', closeEditor);
  $('#saveBtn').addEventListener('click', save);
  $('#deleteBtn').addEventListener('click', remove);

  function openEditor(it) {
    editing = it;
    const isNew = !it.id;
    $('#editorTitle').textContent = (isNew ? 'New ' : 'Edit ') + SCHEMA[view].title.replace(/s$/, '').toLowerCase();
    $('#deleteBtn').hidden = isNew || !!SCHEMA[view].noDelete;
    buildForm(it);
    $('#drawerVeil').hidden = false;
    $('#editor').hidden = false;
    requestAnimationFrame(() => $('#editor').classList.add('open'));
  }
  function closeEditor() {
    $('#editor').classList.remove('open');
    $('#drawerVeil').hidden = true;
    setTimeout(() => { $('#editor').hidden = true; }, 350);
    editing = null;
  }

  function buildForm(it) {
    const form = $('#editorForm'); form.innerHTML = '';
    const sc = SCHEMA[view];
    sc.fields.forEach(f => {
      const wrap = el('div', 'field');
      wrap.dataset.k = f.k;
      if (f.showIf && !f.showIf(it)) wrap.style.display = 'none';
      if (f.t === 'toggle') {
        const def = it.id ? !!it[f.k] : (f.k === 'published');
        wrap.innerHTML = `<label class="toggle"><input type="checkbox" data-f="${f.k}" ${def ? 'checked' : ''}/> <span>${f.label}</span></label>`;
      } else {
        let input = '';
        const val = it[f.k] != null ? it[f.k] : '';
        if (f.t === 'textarea') input = `<textarea data-f="${f.k}" placeholder="${f.placeholder || ''}">${esc(val)}</textarea>`;
        else if (f.t === 'select') input = `<select data-f="${f.k}">${f.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
        else if (f.t === 'number') input = `<input type="number" data-f="${f.k}" value="${esc(val)}"/>`;
        else if (f.t === 'date') input = `<input type="date" data-f="${f.k}" value="${esc(val)}"/>`;
        else if (f.t === 'csv') input = `<input type="text" data-f="${f.k}" data-csv="1" value="${esc(Array.isArray(val) ? val.join(', ') : (val || ''))}" placeholder="${f.placeholder || ''}"/>`;
        else if (f.t === 'classes') input = classesEditor(Array.isArray(val) ? val : []);
        else if (f.t === 'readonly') input = `<input type="hidden" data-readonly value="${esc(val)}"/><p style="font-family:var(--serif);font-size:1.05rem">${esc(val)}</p>`;
        else if (f.t === 'image') input = uploadField(f.k, val, 'image');
        else if (f.t === 'audio') input = uploadField(f.k, val, 'audio');
        else input = `<input type="text" data-f="${f.k}" value="${esc(val)}" placeholder="${f.placeholder || ''}"/>`;
        wrap.innerHTML = `<label>${f.label}</label>${input}${f.hint ? `<span class="hint">${f.hint}</span>` : ''}`;
      }
      form.appendChild(wrap);
    });
    // live toggle of conditional fields (party_type → slots/classes)
    const pt = form.querySelector('[data-f="party_type"]');
    if (pt) pt.addEventListener('change', () => {
      const cur = collectForm();
      sc.fields.forEach(f => {
        if (!f.showIf) return;
        const w = form.querySelector(`.field[data-k="${f.k}"]`);
        if (w) w.style.display = f.showIf(cur) ? '' : 'none';
      });
    });
    bindClassEditor(form);
    bindUploadFields(form);
  }

  // ── image / audio upload field ──
  function uploadField(k, val, kind) {
    const accept = kind === 'audio' ? 'audio/*' : 'image/*';
    const word = kind === 'audio' ? 'audio' : 'image';
    const placeholder = kind === 'audio' ? 'uploads/… or https://…/track.mp3' : 'photos/… or uploads/…';
    return `<div class="uploadfield" data-uploadfield="${k}" data-kind="${kind}">
        <div class="upload-preview ${kind}-preview">${previewHTML(val, kind)}</div>
        <div class="img-actions">
          <label class="img-upload">Upload ${word}<input type="file" accept="${accept}" hidden/></label>
          <span class="img-busy" hidden>Uploading…</span>
        </div>
        <input type="text" data-f="${k}" value="${esc(val)}" placeholder="${placeholder}" class="img-path"/>
      </div>`;
  }
  function previewHTML(val, kind) {
    if (!val) return `<span>No ${kind === 'audio' ? 'audio' : 'image'} yet</span>`;
    return kind === 'audio' ? `<audio controls src="${esc(val)}" style="width:100%"></audio>` : `<img src="${esc(val)}" alt=""/>`;
  }
  function bindUploadFields(form) {
    form.querySelectorAll('[data-uploadfield]').forEach((box) => {
      const kind = box.dataset.kind;
      const file = box.querySelector('input[type=file]');
      const pathInput = box.querySelector('.img-path');
      const preview = box.querySelector('.upload-preview');
      const busy = box.querySelector('.img-busy');
      pathInput.addEventListener('input', () => { preview.innerHTML = previewHTML(pathInput.value, kind); });
      file.addEventListener('change', async () => {
        const f = file.files[0]; if (!f) return;
        busy.hidden = false;
        try {
          const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
          const out = await api('POST', '/api/admin/upload', { name: f.name, data: dataUrl });
          pathInput.value = out.url;
          preview.innerHTML = previewHTML(out.url, kind);
          toast((kind === 'audio' ? 'Audio' : 'Image') + ' uploaded');
        } catch (err) { toast(err.message || 'Upload failed'); }
        finally { busy.hidden = true; file.value = ''; }
      });
    });
  }

  function classesEditor(classes) {
    const rows = classes.map(c => classRow(c.name, (c.slots || []).join(', '))).join('');
    return `<div class="classes" data-classes>${rows}<button type="button" class="add-class">+ Add class</button></div>`;
  }
  function classRow(name = '', slots = '') {
    return `<div class="class-item"><input class="cl-name" placeholder="Class name" value="${esc(name)}"/><input class="cl-slots" placeholder="07:30, 09:00" value="${esc(slots)}"/><button type="button" class="cl-del" title="Remove">✕</button></div>`;
  }
  function bindClassEditor(form) {
    const box = form.querySelector('[data-classes]'); if (!box) return;
    box.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-class')) { e.target.insertAdjacentHTML('beforebegin', classRow()); }
      if (e.target.classList.contains('cl-del')) { e.target.closest('.class-item').remove(); }
    });
  }

  function collectForm() {
    const form = $('#editorForm'); const out = {};
    form.querySelectorAll('[data-f]').forEach(inp => {
      const k = inp.dataset.f;
      if (inp.type === 'checkbox') out[k] = inp.checked ? 1 : 0;
      else if (inp.dataset.csv) out[k] = inp.value.split(',').map(s => s.trim()).filter(Boolean);
      else out[k] = inp.value;
    });
    const box = form.querySelector('[data-classes]');
    if (box) {
      out.classes = Array.from(box.querySelectorAll('.class-item')).map(ci => ({
        name: ci.querySelector('.cl-name').value.trim(),
        slots: ci.querySelector('.cl-slots').value.split(',').map(s => s.trim()).filter(Boolean),
      })).filter(c => c.name);
    }
    return out;
  }

  async function save() {
    const body = collectForm();
    const btn = $('#saveBtn'); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (editing && editing.id) await api('PUT', `/api/admin/${view}/${editing.id}`, body);
      else await api('POST', `/api/admin/${view}`, body);
      toast('Saved');
      closeEditor();
      await loadView(view);
    } catch (err) { toast(err.message || 'Could not save'); }
    finally { btn.disabled = false; btn.textContent = 'Save'; }
  }

  async function remove() {
    if (!editing || !editing.id) return;
    if (!confirm('Delete this for good?')) return;
    try { await api('DELETE', `/api/admin/${view}/${editing.id}`); toast('Deleted'); closeEditor(); await loadView(view); }
    catch (err) { toast(err.message || 'Could not delete'); }
  }

  // ── settings ──
  function renderSettings() {
    $('#viewTitle').textContent = 'Settings';
    $('#viewSub').textContent = 'Manage your studio access.';
    $('#addBtn').hidden = true;
    $('#list').innerHTML = `
      <form class="row" id="pwForm" style="cursor:default;flex-direction:column;align-items:stretch;gap:1rem;max-width:460px;padding:1.6rem">
        <h3 style="font-size:1.3rem">Change password</h3>
        <div class="field"><label>Current password</label><input type="password" id="cur" autocomplete="current-password"/></div>
        <div class="field"><label>New password</label><input type="password" id="new" autocomplete="new-password"/></div>
        <button type="submit" class="btn-primary" style="align-self:flex-start">Update password</button>
        <p class="hint" id="pwMsg" style="min-height:1em"></p>
      </form>`;
    $('#pwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#pwMsg'); msg.textContent = '';
      try {
        await api('POST', '/api/admin/password', { current: $('#cur').value, new: $('#new').value });
        msg.textContent = '✓ Password updated.'; msg.style.color = 'var(--ok)';
        $('#cur').value = ''; $('#new').value = '';
      } catch (err) { msg.textContent = err.message; msg.style.color = 'var(--danger)'; }
    });
  }

  // ── utils ──
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  let toastT;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2400); }

  // ── boot ──
  (async () => {
    try { const s = await api('GET', '/api/session'); s.authed ? showApp() : showLogin(); }
    catch { showLogin(); }
  })();
})();
