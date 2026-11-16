const crypto = require('crypto');
const { db } = require('./db');

const hash = t => crypto.createHash('sha256').update(t).digest('hex');
const insert = db.prepare('INSERT INTO users (token_hash) VALUES (?)');
const find = db.prepare('SELECT id FROM users WHERE token_hash = ?');

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  insert.run(hash(token));
  return token;
}

function requireUser(req, res, next) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.get('authorization') || '');
  const user = m && find.get(hash(m[1]));
  if (!user) return res.status(401).json({ error: 'Invalid or missing session.' });
  req.userId = user.id;
  next();
}

module.exports = { createSession, requireUser };
