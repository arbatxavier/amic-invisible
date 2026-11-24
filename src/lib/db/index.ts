import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

const DDL = `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  eventDate INTEGER,
  location TEXT,
  budget TEXT,
  rules TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  avoidTwoCycles INTEGER NOT NULL DEFAULT 0,
  messageTemplate TEXT,
  messageTemplateEs TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'ca',
  token TEXT NOT NULL,
  assignedToId TEXT,
  whatsappStatus TEXT NOT NULL DEFAULT 'PENDING',
  whatsappSentAt INTEGER,
  viewedAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS participants_token_unique ON participants (token);
CREATE INDEX IF NOT EXISTS participants_event_idx ON participants (eventId);

CREATE TABLE IF NOT EXISTS exclusions (
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  giverId TEXT NOT NULL,
  receiverId TEXT NOT NULL,
  reason TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS exclusions_event_idx ON exclusions (eventId);
CREATE UNIQUE INDEX IF NOT EXISTS exclusions_unique ON exclusions (eventId, giverId, receiverId);
`;

type SqliteDatabase = InstanceType<typeof Database>;

function ensureSchema(sqlite: SqliteDatabase) {
  sqlite.exec(DDL);
}

// Lightweight migration for databases created before new columns were added.
function ensureColumns(sqlite: SqliteDatabase) {
  const eventCols = sqlite
    .prepare('PRAGMA table_info(events)')
    .all()
    .map((c) => (c as { name: string }).name);
  if (!eventCols.includes('messageTemplateEs')) {
    sqlite.exec('ALTER TABLE events ADD COLUMN messageTemplateEs TEXT');
  }

  const partCols = sqlite
    .prepare('PRAGMA table_info(participants)')
    .all()
    .map((c) => (c as { name: string }).name);
  if (!partCols.includes('language')) {
    sqlite.exec("ALTER TABLE participants ADD COLUMN language TEXT NOT NULL DEFAULT 'ca'");
  }
}

function createConnection(): SqliteDatabase {
  const dbPath = process.env.DATABASE_URL || './data/amic.db';
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  ensureSchema(sqlite);
  ensureColumns(sqlite);
  return sqlite;
}

const globalForDb = globalThis as unknown as {
  __amicSqlite?: SqliteDatabase;
};

const sqlite = globalForDb.__amicSqlite ?? createConnection();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__amicSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
