/* Each role: skills with weights (3 = core, 2 = important, 1 = nice to have). */
const ROLES = {
  'Data Analyst': { aliases: ['data analyst', 'business analyst', 'analytics', 'bi analyst'],
    skills: { 'SQL': 3, 'Excel': 3, 'Python': 2, 'Pandas': 2, 'Data Visualization': 2, 'Statistics': 2, 'Power BI': 1, 'Tableau': 1, 'Communication': 1 } },
  'Data Scientist': { aliases: ['data scientist', 'data science'],
    skills: { 'Python': 3, 'Machine Learning': 3, 'Statistics': 3, 'SQL': 2, 'Pandas': 2, 'NumPy': 2, 'Scikit-learn': 2, 'Data Visualization': 1, 'Deep Learning': 1 } },
  'Machine Learning Engineer': { aliases: ['machine learning engineer', 'ml engineer', 'ai engineer', 'ai/ml'],
    skills: { 'Python': 3, 'Machine Learning': 3, 'Deep Learning': 2, 'TensorFlow': 2, 'PyTorch': 2, 'Docker': 2, 'Git': 1, 'NLP': 1, 'AWS': 1 } },
  'Frontend Developer': { aliases: ['frontend', 'front-end', 'front end', 'ui developer', 'web developer'],
    skills: { 'JavaScript': 3, 'HTML/CSS': 3, 'React': 3, 'TypeScript': 2, 'Git': 2, 'REST APIs': 2, 'Tailwind CSS': 1, 'Figma': 1 } },
  'Backend Developer': { aliases: ['backend', 'back-end', 'back end', 'server-side'],
    skills: { 'SQL': 3, 'REST APIs': 3, 'Git': 2, 'Docker': 2, 'Node.js': 2, 'Python': 2, 'Java': 2, 'MongoDB': 1, 'Redis': 1, 'AWS': 1 } },
  'Full Stack Developer': { aliases: ['full stack', 'full-stack', 'fullstack'],
    skills: { 'JavaScript': 3, 'HTML/CSS': 2, 'React': 3, 'Node.js': 3, 'SQL': 2, 'MongoDB': 1, 'Git': 2, 'REST APIs': 2, 'Docker': 1, 'TypeScript': 1 } },
  'Software Engineer': { aliases: ['software engineer', 'software developer', 'sde', 'programmer'],
    skills: { 'Git': 3, 'Python': 2, 'Java': 2, 'C++': 2, 'SQL': 2, 'REST APIs': 2, 'Problem Solving': 2, 'Docker': 1, 'Linux': 1, 'Teamwork': 1 } },
  'DevOps Engineer': { aliases: ['devops', 'site reliability', 'sre', 'cloud engineer'],
    skills: { 'Linux': 3, 'Docker': 3, 'Kubernetes': 2, 'AWS': 3, 'CI/CD': 3, 'Git': 2, 'Python': 1, 'Azure': 1, 'GCP': 1 } },
};

function resolveRole(input) {
  const q = String(input || '').toLowerCase().trim();
  if (q.length < 3) return null;
  for (const [name, r] of Object.entries(ROLES)) {
    if (name.toLowerCase() === q || r.aliases.some(a => q.includes(a) || (q.length >= 4 && a.includes(q)))) return name;
  }
  return null;
}

/* resumeSkills: { group: [skills] }. Returns { role, score, matched, missing } or null if role is unknown. */
function computeMatch(targetRole, resumeSkills) {
  const role = resolveRole(targetRole);
  if (!role) return null;
  const have = new Set(Object.values(resumeSkills || {}).flat());
  let got = 0, total = 0;
  const matched = [], missing = [];
  for (const [skill, w] of Object.entries(ROLES[role].skills)) {
    total += w;
    if (have.has(skill)) { got += w; matched.push(skill); } else missing.push({ skill, weight: w });
  }
  missing.sort((a, b) => b.weight - a.weight);
  return { role, score: Math.round(got / total * 100), matched, missing: missing.map(m => m.skill) };
}

module.exports = { ROLES, resolveRole, computeMatch };
