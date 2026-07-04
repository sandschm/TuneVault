import { Router } from 'express';
import { getDb } from '../db.js';
import { streamTracksAsZip } from '../services/archiveService.js';

export const playlistsRouter = Router();

playlistsRouter.get('/', (req, res) => {
  const playlists = getDb()
    .prepare(
      `SELECT p.id, p.name, p.created_at,
              COUNT(pt.track_id) AS trackCount,
              COALESCE(SUM(t.duration), 0) AS totalDuration
       FROM playlists p
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       LEFT JOIN tracks t ON t.id = pt.track_id
       GROUP BY p.id
       ORDER BY p.name`,
    )
    .all();
  res.json(playlists);
});

function findPlaylist(id) {
  return getDb().prepare('SELECT * FROM playlists WHERE id = ?').get(id);
}

function requirePlaylist(req, res) {
  const playlist = findPlaylist(req.params.id);
  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return null;
  }
  return playlist;
}

function playlistTracks(playlistId) {
  return getDb()
    .prepare(
      `SELECT t.* FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       WHERE pt.playlist_id = ?
       ORDER BY pt.position`,
    )
    .all(playlistId);
}

playlistsRouter.post('/delete-batch', (req, res) => {
  const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).filter(Number.isInteger);
  if (!ids.length) {
    return res.status(400).json({ error: 'No valid playlist ids given' });
  }
  const result = getDb()
    .prepare(`DELETE FROM playlists WHERE id IN (${ids.map(() => '?').join(',')})`)
    .run(...ids);
  res.json({ deleted: result.changes });
});

playlistsRouter.post('/', (req, res) => {
  const name = (req.body.name ?? '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }
  const result = getDb().prepare('INSERT INTO playlists (name) VALUES (?)').run(name);
  res.status(201).json(findPlaylist(result.lastInsertRowid));
});

playlistsRouter.get('/:id/tracks', (req, res) => {
  const playlist = requirePlaylist(req, res);
  if (!playlist) return;
  res.json(playlistTracks(playlist.id));
});

playlistsRouter.patch('/:id', (req, res) => {
  const playlist = requirePlaylist(req, res);
  if (!playlist) return;
  const name = (req.body.name ?? '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }
  getDb().prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name, playlist.id);
  res.json(findPlaylist(playlist.id));
});

playlistsRouter.delete('/:id', (req, res) => {
  const playlist = requirePlaylist(req, res);
  if (!playlist) return;
  getDb().prepare('DELETE FROM playlists WHERE id = ?').run(playlist.id);
  res.status(204).end();
});

playlistsRouter.post('/:id/tracks', (req, res) => {
  const playlist = requirePlaylist(req, res);
  if (!playlist) return;
  const trackIds = Array.isArray(req.body.trackIds) ? req.body.trackIds : [req.body.trackId];
  const db = getDb();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position)
     VALUES (?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_tracks WHERE playlist_id = ?))`,
  );
  const insertAll = db.transaction((ids) => {
    for (const trackId of ids) {
      insert.run(playlist.id, trackId, playlist.id);
    }
  });
  insertAll(trackIds.filter((id) => Number.isInteger(id)));
  res.json(playlistTracks(playlist.id));
});

playlistsRouter.delete('/:id/tracks/:trackId', (req, res) => {
  const playlist = requirePlaylist(req, res);
  if (!playlist) return;
  getDb()
    .prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?')
    .run(playlist.id, req.params.trackId);
  res.json(playlistTracks(playlist.id));
});

playlistsRouter.put('/:id/order', (req, res) => {
  const playlist = requirePlaylist(req, res);
  if (!playlist) return;
  const trackIds = Array.isArray(req.body.trackIds) ? req.body.trackIds : [];
  const db = getDb();
  const update = db.prepare('UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?');
  db.transaction(() => {
    trackIds.forEach((trackId, index) => update.run(index + 1, playlist.id, trackId));
  })();
  res.json(playlistTracks(playlist.id));
});

playlistsRouter.get('/:id/download', (req, res) => {
  const playlist = requirePlaylist(req, res);
  if (!playlist) return;
  const tracks = playlistTracks(playlist.id);
  if (!tracks.length) {
    return res.status(400).json({ error: 'Playlist is empty' });
  }
  streamTracksAsZip(res, playlist.name, tracks);
});
