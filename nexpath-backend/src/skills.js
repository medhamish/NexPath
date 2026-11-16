/* Skill taxonomy. Add skills/aliases freely; matching is case-insensitive on word boundaries. */
const TAXONOMY = {
  'Languages': {
    'Python': ['python'], 'Java': ['java'], 'JavaScript': ['javascript', 'ecmascript'],
    'TypeScript': ['typescript'], 'C++': ['c++'], 'C#': ['c#'], 'Go': ['golang'],
    'SQL': ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'pl/sql'], 'R': [], 'Kotlin': ['kotlin'],
    'PHP': ['php'], 'Swift': ['swift'], 'HTML/CSS': ['html', 'css', 'html5', 'css3'],
  },
  'Frameworks & Libraries': {
    'React': ['react', 'react.js', 'reactjs'], 'Angular': ['angular'], 'Vue': ['vue', 'vue.js'],
    'Node.js': ['node.js', 'nodejs'], 'Express': ['express.js', 'expressjs'], 'Django': ['django'],
    'Flask': ['flask'], 'FastAPI': ['fastapi'], 'Spring Boot': ['spring boot', 'spring'],
    'Tailwind CSS': ['tailwind', 'tailwindcss'], 'Bootstrap': ['bootstrap'],
  },
  'Data & AI': {
    'Pandas': ['pandas'], 'NumPy': ['numpy'], 'Scikit-learn': ['scikit-learn', 'sklearn'],
    'TensorFlow': ['tensorflow'], 'PyTorch': ['pytorch'], 'Machine Learning': ['machine learning'],
    'Deep Learning': ['deep learning'], 'NLP': ['nlp', 'natural language processing'],
    'Data Visualization': ['data visualization', 'data visualisation', 'matplotlib', 'seaborn'],
    'Statistics': ['statistics', 'statistical analysis'], 'Excel': ['excel', 'ms excel'],
    'Power BI': ['power bi', 'powerbi'], 'Tableau': ['tableau'],
  },
  'Databases': {
    'MongoDB': ['mongodb', 'mongo'], 'Redis': ['redis'], 'Firebase': ['firebase'],
  },
  'Tools & Cloud': {
    'Git': ['git', 'github', 'gitlab'], 'Docker': ['docker'], 'Kubernetes': ['kubernetes', 'k8s'],
    'AWS': ['aws', 'amazon web services'], 'Azure': ['azure'], 'GCP': ['gcp', 'google cloud'],
    'Linux': ['linux'], 'CI/CD': ['ci/cd', 'jenkins', 'github actions'], 'REST APIs': ['rest api', 'rest apis', 'restful'],
    'Figma': ['figma'], 'Jira': ['jira'],
  },
  'Professional': {
    'Communication': ['communication'], 'Leadership': ['leadership', 'led a team'],
    'Teamwork': ['teamwork', 'collaboration'], 'Problem Solving': ['problem solving', 'problem-solving'],
  },
};

const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
const compiled = [];
for (const [group, skills] of Object.entries(TAXONOMY)) {
  for (const [skill, aliases] of Object.entries(skills)) {
    const terms = [skill, ...aliases].map(t => esc(t.toLowerCase()));
    compiled.push({ group, skill, re: new RegExp(`(?<![a-z0-9+#])(?:${terms.join('|')})(?![a-z0-9+#])`, 'i') });
  }
}

/* Returns { "Languages": ["Python", ...], ... } with only non-empty groups. */
function extractSkills(text) {
  const out = {};
  for (const { group, skill, re } of compiled) {
    if (skill === 'R') { if (/(?:^|[\s,;:(•|])R(?:[\s,;:)•|]|$)/m.test(text) && /\b(ggplot|tidyverse|r programming|rstudio|\bR,)/i.test(text)) (out[group] ||= []).push(skill); continue; }
    if (re.test(text)) (out[group] ||= []).push(skill);
  }
  return out;
}

module.exports = { extractSkills, TAXONOMY };
