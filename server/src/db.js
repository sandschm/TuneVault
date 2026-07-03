import Database from 'better-sqlite3';
import { config, ensureDataDirectories } from './config.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tracks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  artist        TEXT NOT NULL DEFAULT 'Unknown Artist',
  album_artist  TEXT NOT NULL DEFAULT 'Unknown Artist',
  album         TEXT NOT NULL DEFAULT 'Unknown Album',
  genre         TEXT,
  year          INTEGER,
  track_no      INTEGER,
  disc_no       INTEGER,
  duration      REAL,
  rating        INTEGER NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  file_path     TEXT NOT NULL UNIQUE,
  file_size     INTEGER,
  mime_type     TEXT,
  bitrate       INTEGER,
  artwork_file  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  play_count    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS playlists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id    INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_tracks_album  ON tracks(album_artist, album);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_genre  ON tracks(genre);
`;

let db;

export function getDb() {
  if (!db) {
    ensureDataDirectories();
    db = new Database(config.databaseFile);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
  }
  return db;
}
