window.NexPath = (() => {
  const PREFIX = 'nexpath:', TOKEN_KEY = 'nexpath_token', API = window.NEXPATH_API || 'http://localhost:3000/api';
  const SYNC_KEYS = ['profile', 'activity', 'notifsRead'];   // client-writable
  const SERVER_KEYS = ['resume', 'match'];                   // server-owned
  const ls = {
    get(k, f = null) { try { const v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch {} },
    remove(k) { try { localStorage.removeItem(PREFIX + k); } catch {} },
  };
  const listeners = {};
  const on = (e, fn) => (listeners[e] = listeners[e] || []).push(fn);
  const emit = (e, d) => (listeners[e] || []).forEach(fn => fn(d));
  const icons = () => window.lucide && lucide.createIcons();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- API client ---------- */
  async function ensureSession() {
    if (localStorage.getItem(TOKEN_KEY)) return;
    const r = await fetch(API + '/session', { method: 'POST' });
    if (!r.ok) throw new Error('Could not start session');
    localStorage.setItem(TOKEN_KEY, (await r.json()).token);
  }
  async function api(path, opt = {}, retry = true) {
    await ensureSession();
    const headers = { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) };
    if (opt.body && !(opt.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const r = await fetch(API + path, { ...opt, headers });
    if (r.status === 401 && retry) { localStorage.removeItem(TOKEN_KEY); return api(path, opt, false); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: r.status, details: data.details });
    return data;
  }

  /* ---------- Storage: local cache + write-through ---------- */
  const timers = {};
  function push(key, value) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(async () => {
      try {
        const res = await api('/state/' + key, { method: 'PUT', body: JSON.stringify({ value }) });
        if (key === 'profile') {               // server recomputes career match when profile changes
          if (res.match) ls.set('match', res.match); else ls.remove('match');
          emit('change');
        }
      } catch (e) { console.warn('NexPath sync failed for', key, e.message); }
    }, 150);
  }
  const storage = {
    get: ls.get,
    set(key, value) { ls.set(key, value); if (SYNC_KEYS.includes(key)) push(key, value); },
  };

  /* ---------- Hydrate from server before the dashboard renders ---------- */
  const ready = (async () => {
    try {
      const server = await api('/state');
      SYNC_KEYS.forEach(k => {
        if (server[k] !== undefined) ls.set(k, server[k]);
        else if (ls.get(k) != null) push(k, ls.get(k));   // migrate existing local-only data up
      });
      SERVER_KEYS.forEach(k => server[k] !== undefined ? ls.set(k, server[k]) : ls.remove(k));
    } catch (e) { console.warn('NexPath offline mode:', e.message); }
  })();

  async function uploadResume(file) {
    const fd = new FormData(); fd.append('resume', file);
    const res = await api('/resume', { method: 'POST', body: fd });
    ls.set('resume', res.resume);
    res.match ? ls.set('match', res.match) : ls.remove('match');
    ls.set('activity', res.activity);
    emit('change');
    return res;
  }
  async function resetRemote() { try { await api('/state', { method: 'DELETE' }); } catch {} }

  function toast(msg, type = 'info') {
    const host = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + type; el.setAttribute('role', 'status');
    el.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle-2' : type === 'error' ? 'alert-circle' : 'info'}" class="i"></i><span>${esc(msg)}</span>`;
    host.appendChild(el); icons();
    setTimeout(() => el.remove(), 3500);
  }
  function logActivity(type, text) {
    const list = storage.get('activity', []);
    list.unshift({ type, text, at: new Date().toISOString() });
    storage.set('activity', list.slice(0, 20));
    emit('change');
  }
  /* Deprecated: resume + match are now produced by the server via uploadResume(). */
  const setResume = r => { ls.set('resume', r); emit('change'); };
  const setCareerMatch = m => { ls.set('match', m); emit('change'); };
  return { storage, ready, uploadResume, resetRemote, on, emit, icons, esc, toast, logActivity, setResume, setCareerMatch };
})();
