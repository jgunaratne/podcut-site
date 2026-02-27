import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'podcut.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER UNIQUE NOT NULL,
    collection_name TEXT NOT NULL,
    artist_name TEXT,
    artwork_url TEXT,
    feed_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transcriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id TEXT UNIQUE NOT NULL,
    podcast_id INTEGER,
    episode_title TEXT,
    text TEXT,
    segments TEXT,
    language TEXT,
    duration REAL,
    processing_time REAL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: add summary column if it doesn't exist
try {
  db.prepare("SELECT summary FROM transcriptions LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE transcriptions ADD COLUMN summary TEXT");
}

// Migration: add status and error columns for async transcription
try {
  db.prepare("SELECT status FROM transcriptions LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE transcriptions ADD COLUMN status TEXT DEFAULT 'completed'");
  db.exec("ALTER TABLE transcriptions ADD COLUMN error TEXT");
}

export default db;
