/* NexPath core: storage adapter, event bus, toasts, public API for future modules.
   Replace NexPath.storage with an API client later; keep the same get/set signatures. */
window.NexPath = (() => {
  const PREFIX = 'nexpath:';
  const storage = {
    get(key, fallback = null) { try { const v = localStorage.getItem(PREFIX + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {} },
  };
  const listeners = {};
  const on = (e, fn) => (listeners[e] = listeners[e] || []).push(fn);
  const emit = (e, d) => (listeners[e] || []).forEach(fn => fn(d));
  const icons = () => window.lucide && lucide.createIcons();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  /* Hooks for future phases:
     Phase 1: NexPath.setResume({ fileName, analyzedAt, skills: { "Languages": ["Python"] } })
     Phase 2+: NexPath.setCareerMatch({ score: 0-100, role: "Data Analyst" })  (real score from backend) */
  const setResume = r => { storage.set('resume', r); logActivity('resume', `Analyzed resume “${r.fileName}”`); };
  const setCareerMatch = m => { storage.set('match', m); emit('change'); };
  return { storage, on, emit, icons, esc, toast, logActivity, setResume, setCareerMatch };
})();
