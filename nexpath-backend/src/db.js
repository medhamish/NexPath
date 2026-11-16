const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH || './nexpath.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    token_hash TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS kv (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, key)
  );
`);

const q = {
  getAll: db.prepare('SELECT key, value FROM kv WHERE user_id = ?'),
  get: db.prepare('SELECT value FROM kv WHERE user_id = ? AND key = ?'),
  set: db.prepare(`INSERT INTO kv (user_id, key, value) VALUES (?, ?, ?)
                   ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`),
  del: db.prepare('DELETE FROM kv WHERE user_id = ? AND key = ?'),
  delAll: db.prepare('DELETE FROM kv WHERE user_id = ?'),
};

module.exports = {
  db,
  state: {
    all(uid) { return Object.fromEntries(q.getAll.all(uid).map(r => [r.key, JSON.parse(r.value)])); },
    get(uid, key, fallback) { const r = q.get.get(uid, key); return r ? JSON.parse(r.value) : fallback; },
    set(uid, key, val) { q.set.run(uid, key, JSON.stringify(val)); },
    del(uid, key) { q.del.run(uid, key); },
    clear(uid) { q.delAll.run(uid); },
  },
};
