/* Dashboard shell: navigation, routing, rendering. Reads everything from NexPath.storage,
   so future modules only need to call NexPath.setResume / setCareerMatch. */
(() => {
  const { storage, esc, toast, icons } = NexPath;
  const P = NexPath.profile;
  const $ = (s, r = document) => r.querySelector(s);

  const NAV = {
    workspace: [
      { id: 'overview', label: 'Overview', icon: 'layout-grid' },
      { id: 'profile', label: 'My Profile', icon: 'user-round' },
      { id: 'resume', label: 'Resume Analyzer', icon: 'file-search', soon: 'Resume Analyzer arrives in Phase 1.' },
      { id: 'skills', label: 'Skill Analysis', icon: 'radar', soon: 'Skill Analysis arrives in Phase 2.' },
      { id: 'roadmap', label: 'Career Roadmap', icon: 'route', soon: 'Career Roadmap arrives in Phase 3.' },
      { id: 'mentor', label: 'AI Career Mentor', icon: 'sparkles', soon: 'AI Career Mentor arrives in Phase 5.' },
    ],
    prefs: [
      { id: 'settings', label: 'Settings', icon: 'settings', soon: 'Settings are on the way.' },
      { id: 'help', label: 'Help & Support', icon: 'life-buoy', soon: 'Help & Support is on the way.' },
    ],
  };
  const ALL = [...NAV.workspace, ...NAV.prefs];
  const ACT_ICON = { resume: 'file-up', analysis: 'file-check', profile: 'user-round-pen', goal: 'target' };

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  const firstName = () => (P.get().name || '').trim().split(/\s+/)[0];
  const initials = () => { const n = (P.get().name || '').trim().split(/\s+/); return n[0] ? (n[0][0] + (n[1]?.[0] || '')).toUpperCase() : 'N'; };
  const ago = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} hr ago` : new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };

  /* ---------- Sidebar ---------- */
  function renderNav(active) {
    const html = items => items.map(n => `<button class="nav-item${n.id === active ? ' active' : ''}" data-go="${n.id}" ${n.id === active ? 'aria-current="page"' : ''}><i data-lucide="${n.icon}" class="i"></i>${n.label}${n.soon ? '<span class="soon">Soon</span>' : ''}</button>`).join('');
    $('#nav-workspace').innerHTML = html(NAV.workspace);
    $('#nav-prefs').innerHTML = html(NAV.prefs);
  }
  function renderIdentity() {
    const p = P.get();
    $('#me-avatar').textContent = $('#top-avatar').textContent = initials();
    $('#me-name').textContent = p.name || 'Student';
    $('#me-sub').textContent = p.college || 'Complete your profile';
  }
  const openDrawer = o => { $('#sidebar').classList.toggle('open', o); $('#scrim').hidden = !o; document.body.classList.toggle('lock', o); };

  /* ---------- Reusable components ---------- */
  const statCard = ({ icon, label, value, text, ok }) => `<article class="card stat"><div class="stat-ico${ok ? ' ok' : ''}"><i data-lucide="${icon}" class="i"></i></div><div><small>${label}</small><div class="val">${esc(value)}</div><p>${esc(text)}</p></div></article>`;

  function resumeCard() {
    const r = storage.get('resume');
    return r ? statCard({ icon: 'file-check', label: 'Resume status', value: 'Analyzed', text: `${r.fileName} · ${ago(r.analyzedAt || new Date().toISOString())}`, ok: true })
             : statCard({ icon: 'file-check', label: 'Resume status', value: 'Not uploaded', text: 'Upload your resume to get started.' });
  }
  function matchCard() {
    const m = storage.get('match');
    return m && m.score != null ? statCard({ icon: 'target', label: 'Career match', value: m.score + '%', text: m.role ? `Compatibility with ${m.role}.` : 'Your career compatibility.', ok: true })
      : statCard({ icon: 'target', label: 'Career match', value: '—', text: 'Complete your first analysis to see your career compatibility.' });
  }
  function profileSection() {
    const p = P.get(), c = P.completion(p);
    const item = (ico, label, v) => `<div class="check${v ? ' done' : ''}"><b><i data-lucide="${v ? 'check-circle-2' : 'circle-dashed'}" class="i"></i>${label}</b><span>${v ? esc(v) : 'Not added'}</span></div>`;
    const edu = [p.degree, p.branch].filter(Boolean).join(', ');
    const skills = Object.values((storage.get('resume') || {}).skills || {}).flat().length;
    return `<section class="card panel"><div class="panel-head"><div><h2>Your career profile</h2><p class="sec-sub">Complete your profile to receive more personalized recommendations.</p></div><button class="btn${c.pct < 100 ? ' btn-primary' : ''}" data-act="edit-profile"><i data-lucide="pencil-line" class="i"></i>${c.pct < 100 ? 'Complete profile' : 'Edit profile'}</button></div>
      <div class="pct"><strong>${c.pct}%</strong><div class="bar" role="progressbar" aria-valuenow="${c.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${c.pct}%"></i></div></div>
      <div class="checks">${item('', 'Education', edu)}${item('', 'Career interests', p.interests)}${item('', 'Target role', p.role)}${item('', 'Skills', skills ? skills + ' extracted' : '')}</div></section>`;
  }
  function skillsSection() {
    const groups = (storage.get('resume') || {}).skills || {};
    const names = Object.keys(groups).filter(k => groups[k]?.length);
    const body = names.length ? names.map(g => `<div class="skillgroup"><h3>${esc(g)}</h3><div class="chips">${groups[g].map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>`).join('')
      : `<div class="empty"><div class="stat-ico"><i data-lucide="layers" class="i"></i></div><p>Your skills will appear here once your resume has been analyzed.</p><button class="btn btn-primary" data-go="resume"><i data-lucide="file-up" class="i"></i>Analyze resume</button></div>`;
    return `<section class="card panel"><div class="panel-head"><div><h2>Your skills</h2><p class="sec-sub">An overview of your technical and professional skills.</p></div></div>${body}</section>`;
  }
  function activitySection() {
    const list = storage.get('activity', []);
    const body = list.length ? `<ul class="activity">${list.slice(0, 6).map(a => `<li><i data-lucide="${ACT_ICON[a.type] || 'circle'}" class="i"></i><span>${esc(a.text)}</span><time>${ago(a.at)}</time></li>`).join('')}</ul>`
      : `<div class="empty"><div class="stat-ico"><i data-lucide="history" class="i"></i></div><p>Resume uploads, analyses, profile updates and goal changes will show up here as you use NexPath.</p><button class="btn" data-act="edit-profile">Start with your profile</button></div>`;
    return `<section class="card panel"><div class="panel-head"><div><h2>Recent activity</h2></div></div>${body}</section>`;
  }
  const ACTIONS = [
    { icon: 'file-up', t: 'Upload resume', d: 'Start your first analysis', go: 'resume' },
    { icon: 'user-round-pen', t: 'Edit profile', d: 'Keep your details current', act: 'edit-profile' },
    { icon: 'compass', t: 'Explore career paths', d: 'See roles that fit you', go: 'roadmap' },
    { icon: 'radar', t: 'View skill analysis', d: 'Find your skill gaps', go: 'skills' },
  ];
  const quickActions = () => `<section><h2 style="margin-bottom:14px">Quick actions</h2><div class="actions">${ACTIONS.map(a => `<button class="card action" ${a.go ? `data-go="${a.go}"` : `data-act="${a.act}"`}><div class="stat-ico"><i data-lucide="${a.icon}" class="i"></i></div><b>${a.t}</b><small>${a.d}</small></button>`).join('')}</div></section>`;

  /* ---------- Views ---------- */
  const heroArt = `<svg viewBox="0 0 360 170" aria-hidden="true"><path class="path-line" d="M20 130 C90 130 90 50 170 50 S260 120 340 40"/><circle cx="20" cy="130" r="9" fill="#fff" stroke="#4F46E5" stroke-width="3"/><circle cx="170" cy="50" r="9" fill="#fff" stroke="#B9BEF5" stroke-width="3"/><circle cx="340" cy="40" r="12" fill="#4F46E5"/><circle cx="340" cy="40" r="22" fill="none" stroke="#4F46E5" stroke-opacity=".25"/></svg>`;
  const views = {
    overview: () => `<div><h1>${greeting()}${firstName() ? ', ' + esc(firstName()) : ''}</h1><p class="sub">Here's your career development overview.</p></div>
      <section class="card hero"><div><h2>Your career journey starts here.</h2><p>Understand your skills, discover your gaps, and build a career path aligned with industry expectations.</p><div class="cta"><button class="btn btn-primary" data-go="resume"><i data-lucide="file-search" class="i"></i>Analyze My Resume</button><small>Upload your resume to discover your professional strengths.</small></div></div>${heroArt}</section>
      <div class="grid2" id="stat-cards">${resumeCard()}${matchCard()}</div>${profileSection()}${skillsSection()}${activitySection()}${quickActions()}`,
    profile: () => {
      const p = P.get(), c = P.completion(p);
      return `<div><h1>My profile</h1><p class="sub">The details NexPath uses to personalize your recommendations.</p></div>
      <section class="card panel"><div class="panel-head"><div><h2>${c.pct}% complete</h2><p class="sec-sub">${c.done} of ${c.total} fields filled in.</p></div><button class="btn btn-primary" data-act="edit-profile"><i data-lucide="pencil-line" class="i"></i>Edit profile</button></div>
      <dl class="plist">${P.FIELDS.map(f => `<div><dt>${f.label}</dt><dd>${p[f.key] ? esc(p[f.key]) : '<span style="color:var(--ink3)">Not added</span>'}</dd></div>`).join('')}</dl></section>`;
    },
  };
  function comingSoon(n) {
    return `<div class="card cs"><div class="stat-ico"><i data-lucide="${n.icon}" class="i"></i></div><h1 style="font-size:24px">${n.label}</h1><p>${n.soon} Your profile and activity are saved, so you can pick up right where you left off.</p><button class="btn btn-primary" data-go="overview"><i data-lucide="arrow-left" class="i"></i>Back to overview</button></div>`;
  }

  /* ---------- Router ---------- */
  let current = 'overview';
  function render(first) {
    const id = ALL.some(n => n.id === current) ? current : 'overview';
    const nav = ALL.find(n => n.id === id);
    const view = $('#view');
    renderNav(id); renderIdentity();
    view.innerHTML = views[id] ? views[id]() : comingSoon(nav);
    icons();
    if (!first) { view.focus({ preventScroll: true }); }
  }
  function go(id) {
    const n = ALL.find(x => x.id === id); if (!n) return;
    current = id; history.replaceState(null, '', '#' + id);
    openDrawer(false); render();
    window.scrollTo({ top: 0 });
    if (n.soon) toast(n.soon, 'info');
  }

  /* ---------- Notifications & popovers ---------- */
  function renderNotifs() {
    const read = storage.get('notifsRead', false);
    $('#bell-dot').hidden = read;
    $('#notif-list').innerHTML = `<div class="notif"><i data-lucide="sparkles" class="i"></i><div><strong>Welcome to NexPath</strong><p>Complete your profile, then analyze your resume to unlock your career insights.</p></div></div>`;
    icons();
  }
  function togglePop(btn, pop, force) {
    const open = force ?? pop.hidden;
    document.querySelectorAll('.pop').forEach(p => p.hidden = true);
    document.querySelectorAll('[aria-expanded]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    $('#today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    P.init();
    current = location.hash.slice(1) || 'overview';
    $('#view').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    const boot = () => { render(true); renderNotifs(); };
    const start = () => NexPath.ready.then(boot);
    window.lucide ? setTimeout(start, 250) : window.addEventListener('load', () => setTimeout(start, 250));

    document.addEventListener('click', e => {
      const goBtn = e.target.closest('[data-go]'), act = e.target.closest('[data-act]');
      if (goBtn) { togglePop($('#bell'), $('#bell-pop'), false); return go(goBtn.dataset.go); }
      if (act) {
        togglePop($('#bell'), $('#bell-pop'), false);
        if (act.dataset.act === 'edit-profile') P.open();
        if (act.dataset.act === 'reset' && confirm('Remove your saved profile and activity from this browser?')) {
          Object.keys(localStorage).filter(k => k.startsWith('nexpath:')).forEach(k => localStorage.removeItem(k));
          NexPath.resetRemote();
          render(); renderNotifs(); toast('Saved data cleared.', 'success');
        }
        return;
      }
      if (e.target.closest('#bell')) return togglePop($('#bell'), $('#bell-pop'));
      if (e.target.closest('#profile-btn')) return togglePop($('#profile-btn'), $('#profile-pop'));
      if (e.target.closest('#me-card')) return go('profile');
      if (e.target.closest('#menu-btn')) return openDrawer(true);
      if (e.target.closest('#scrim')) return openDrawer(false);
      if (e.target.closest('#mark-read')) { storage.set('notifsRead', true); renderNotifs(); return toast('All notifications marked as read.', 'success'); }
      if (!e.target.closest('.pop')) document.querySelectorAll('.pop').forEach(p => p.hidden = true);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.querySelectorAll('.pop').forEach(p => p.hidden = true); openDrawer(false); } });
    window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== current) { current = id; render(); } });
    NexPath.on('change', () => render());
  });
  window.addEventListener('storage', () => render());
})();
