const express = require('express');
const multer = require('multer');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse/lib/pdf-parse.js'); // avoids the package's debug-mode side effect
const rateLimit = require('express-rate-limit');
const { state } = require('./db');
const { createSession, requireUser } = require('./auth');
const { extractSkills } = require('./skills');
const { computeMatch } = require('./roles');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

/* ---------- Profile validation (mirrors js/profile.js) ---------- */
const PROFILE_FIELDS = ['name', 'college', 'degree', 'branch', 'year', 'gradYear', 'interests', 'role'];
const YEARS = ['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate'];

function bad(msg, status = 400) { return Object.assign(new Error(msg), { status }); }

function cleanProfile(v) {
  if (!v || typeof v !== 'object') throw bad('Profile must be an object.');
  const out = {}, errors = {};
  for (const k of PROFILE_FIELDS) {
    const s = String(v[k] ?? '').trim().slice(0, 200);
    if (!s) errors[k] = 'This field is required.';
    out[k] = s;
  }
  if (out.year && !YEARS.includes(out.year)) errors.year = 'Invalid year of study.';
  const y = +out.gradYear, now = new Date().getFullYear();
  if (out.gradYear && (!Number.isInteger(y) || y < now - 1 || y > now + 8)) errors.gradYear = `Enter a year between ${now - 1} and ${now + 8}.`;
  if (Object.keys(errors).length) throw Object.assign(bad('Invalid profile.'), { details: errors });
  return out;
}

function pushActivity(uid, type, text) {
  const list = state.get(uid, 'activity', []);
  list.unshift({ type, text, at: new Date().toISOString() });
  const trimmed = list.slice(0, 20);
  state.set(uid, 'activity', trimmed);
  return trimmed;
}

function recomputeMatch(uid) {
  const resume = state.get(uid, 'resume', null);
  const profile = state.get(uid, 'profile', null);
  if (!resume || !profile) return null;
  const m = computeMatch(profile.role, resume.skills);
  if (m) state.set(uid, 'match', m); else state.del(uid, 'match');
  return m;
}

/* ---------- Routes ---------- */
router.post('/session', rateLimit({ windowMs: 3600e3, limit: 30 }), (req, res) => {
  res.status(201).json({ token: createSession() });
});

router.use(requireUser);

router.get('/state', (req, res) => res.json(state.all(req.userId)));

/* Client-writable keys: profile, activity, notifsRead. resume & match are server-owned. */
router.put('/state/:key', (req, res, next) => {
  try {
    const { key } = req.params, uid = req.userId, { value } = req.body || {};
    if (key === 'profile') {
      const clean = cleanProfile(value);
      const old = state.get(uid, 'profile', null);
      state.set(uid, 'profile', clean);
      const match = recomputeMatch(uid);
      return res.json({ ok: true, value: clean, match: match || null, matchChanged: !!old && old.role !== clean.role });
    }
    if (key === 'activity') {
      if (!Array.isArray(value)) throw bad('Activity must be an array.');
      const clean = value.slice(0, 20).map(a => ({
        type: String(a.type || '').slice(0, 20), text: String(a.text || '').slice(0, 200),
        at: new Date(a.at).toString() === 'Invalid Date' ? new Date().toISOString() : new Date(a.at).toISOString(),
      }));
      state.set(uid, 'activity', clean);
      return res.json({ ok: true });
    }
    if (key === 'notifsRead') { state.set(uid, 'notifsRead', value === true); return res.json({ ok: true }); }
    throw bad('Unknown or read-only key.', 403);
  } catch (e) { next(e); }
});

router.delete('/state', (req, res) => { state.clear(req.userId); res.json({ ok: true }); });

/* ---------- Resume analysis ---------- */
async function extractText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const b = file.buffer;
  if (ext === '.pdf') {
    if (b.slice(0, 5).toString() !== '%PDF-') throw bad('This file is not a valid PDF.');
    return (await pdfParse(b)).text;
  }
  if (ext === '.docx') {
    if (b[0] !== 0x50 || b[1] !== 0x4b) throw bad('This file is not a valid DOCX.');
    return (await mammoth.extractRawText({ buffer: b })).value;
  }
  if (ext === '.txt') return b.toString('utf8');
  throw bad('Upload a PDF, DOCX or TXT file.', 415);
}

router.post('/resume', rateLimit({ windowMs: 3600e3, limit: 20 }), upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) throw bad('No file uploaded (field name: "resume").');
    const uid = req.userId;
    const fileName = path.basename(req.file.originalname).slice(0, 120);
    let text;
    try { text = (await extractText(req.file)).slice(0, 200000); }
    catch (e) { if (e.status) throw e; throw bad('We could not read that file. Try another PDF or DOCX.', 422); }
    if (text.trim().length < 50) throw bad('No readable text found. Scanned PDFs are not supported yet.', 422);

    const skills = extractSkills(text);
    const resume = { fileName, analyzedAt: new Date().toISOString(), skills };
    state.set(uid, 'resume', resume);
    pushActivity(uid, 'resume', `Uploaded resume “${fileName}”`);
    const activity = pushActivity(uid, 'analysis', `Analyzed resume — ${Object.values(skills).flat().length} skills found`);
    const match = recomputeMatch(uid);
    res.json({ resume, match, activity });
  } catch (e) { next(e); }
});

router.get('/match', (req, res) => {
  const m = state.get(req.userId, 'match', null);
  if (!m) return res.status(404).json({ error: 'Add a target role and analyze your resume first.' });
  res.json(m);
});

module.exports = router;
