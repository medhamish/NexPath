/* Profile model, completion calculation, validation and the editable form. */
NexPath.profile = (() => {
  const FIELDS = [
    { key: 'name', label: 'Full name', type: 'text', ph: 'Aarav Sharma' },
    { key: 'college', label: 'College / university', type: 'text', ph: 'Your institution' },
    { key: 'degree', label: 'Degree', type: 'text', ph: 'B.Tech' },
    { key: 'branch', label: 'Branch', type: 'text', ph: 'Computer Science' },
    { key: 'year', label: 'Current year of study', type: 'select', options: ['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate'] },
    { key: 'gradYear', label: 'Graduation year', type: 'number', ph: '2027' },
    { key: 'interests', label: 'Career interests', type: 'text', ph: 'AI, product design, fintech', hint: 'Separate with commas', wide: 1 },
    { key: 'role', label: 'Target job role', type: 'text', ph: 'Data Analyst', wide: 1 },
  ];
  const get = () => NexPath.storage.get('profile', {});
  const completion = (p = get()) => {
    const done = FIELDS.filter(f => String(p[f.key] ?? '').trim()).length;
    return { done, total: FIELDS.length, pct: Math.round(done / FIELDS.length * 100) };
  };
  function validate(v) {
    const e = {};
    FIELDS.forEach(f => { if (!String(v[f.key] ?? '').trim()) e[f.key] = 'This field is required.'; });
    const y = +v.gradYear, now = new Date().getFullYear();
    if (v.gradYear && (y < now - 1 || y > now + 8)) e.gradYear = `Enter a year between ${now - 1} and ${now + 8}.`;
    return e;
  }
  function save(v) {
    const old = get();
    NexPath.storage.set('profile', v);
    NexPath.logActivity('profile', Object.keys(old).length ? 'Updated your profile' : 'Created your career profile');
    if (old.role && old.role !== v.role) NexPath.logActivity('goal', `Changed target role to ${v.role}`);
  }
  function open() {
    const p = get(), m = document.getElementById('modal'), form = document.getElementById('profile-form');
    form.innerHTML = FIELDS.map(f => {
      const input = f.type === 'select'
        ? `<select id="f-${f.key}" name="${f.key}"><option value="">Select…</option>${f.options.map(o => `<option ${p[f.key] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`
        : `<input id="f-${f.key}" name="${f.key}" type="${f.type}" value="${NexPath.esc(p[f.key] ?? '')}" placeholder="${f.ph}" autocomplete="off">`;
      return `<div class="field${f.wide ? ' wide' : ''}"><label for="f-${f.key}">${f.label}</label>${input}${f.hint ? `<small>${f.hint}</small>` : ''}<span class="err" id="e-${f.key}"></span></div>`;
    }).join('');
    m.hidden = false; document.body.classList.add('lock');
    form.querySelector('input').focus();
  }
  const close = () => { document.getElementById('modal').hidden = true; document.body.classList.remove('lock'); };
  function init() {
    const form = document.getElementById('profile-form');
    document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', close));
    document.addEventListener('keydown', e => e.key === 'Escape' && close());
    document.getElementById('profile-save').addEventListener('click', () => {
      const v = Object.fromEntries(new FormData(form));
      Object.keys(v).forEach(k => v[k] = v[k].trim());
      const errs = validate(v);
      FIELDS.forEach(f => {
        document.getElementById('e-' + f.key).textContent = errs[f.key] || '';
        document.getElementById('f-' + f.key).classList.toggle('invalid', !!errs[f.key]);
      });
      const first = Object.keys(errs)[0];
      if (first) { document.getElementById('f-' + first).focus(); return NexPath.toast('Fix the highlighted fields to save.', 'error'); }
      save(v); close(); NexPath.toast('Profile saved.', 'success');
    });
  }
  return { FIELDS, get, completion, open, close, init };
})();
