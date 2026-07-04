import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { config } from '../config.js';
import { getDb } from '../db.js';
import { streamTracksAsZip } from '../services/archiveService.js';
import { enrichTrack, overwriteTrack, downloadTrackCover } from '../services/enrichmentService.js';
import { METADATA_PROVIDERS } from '../services/metadataLookupService.js';

function requestedProvider(req) {
  const provider = req.body?.provider;
  return METADATA_PROVIDERS.includes(provider) ? provider : 'auto';
}

export const tracksRouter = Router();

const SORTABLE_COLUMNS = new Set(['title', 'artist', 'album', 'genre', 'year', 'duration', 'rating', 'created_at']);

tracksRouter.get('/', (req, res) => {
  const filters = [];
  const params = {};

  if (req.query.search) {
    filters.push('(title LIKE @search OR artist LIKE @search OR album LIKE @search)');
    params.search = `%${req.query.search}%`;
  }
  for (const field of ['artist', 'album', 'genre']) {
    if (req.query[field]) {
      filters.push(`${field} = @${field}`);
      params[field] = req.query[field];
    }
  }
  if (req.query.albumArtist) {
    filters.push('album_artist = @albumArtist');
    params.albumArtist = req.query.albumArtist;
  }
  if (req.query.favorites === '1') {
    filters.push('rating > 0');
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sort = SORTABLE_COLUMNS.has(req.query.sort) ? req.query.sort : 'artist';
  const direction = req.query.dir === 'desc' ? 'DESC' : 'ASC';
  const tracks = getDb()
    .prepare(`SELECT * FROM tracks ${where} ORDER BY ${sort} ${direction}, album, disc_no, track_no, title`)
    .all(params);
  res.json(tracks);
});

function findTrack(id) {
  return getDb().prepare('SELECT * FROM tracks WHERE id = ?').get(id);
}

function requireTrack(req, res) {
  const track = findTrack(req.params.id);
  if (!track) {
    res.status(404).json({ error: 'Track not found' });
    return null;
  }
  return track;
}

tracksRouter.get('/:id/stream', (req, res) => {
  const track = requireTrack(req, res);
  if (!track) return;
  getDb().prepare('UPDATE tracks SET play_count = play_count + 1 WHERE id = ?').run(track.id);
  res.sendFile(path.join(config.musicDir, track.file_path), {
    headers: { 'Content-Type': track.mime_type, 'Accept-Ranges': 'bytes' },
  });
});

tracksRouter.get('/:id/download', (req, res) => {
  const track = requireTrack(req, res);
  if (!track) return;
  res.download(path.join(config.musicDir, track.file_path), path.basename(track.file_path));
});

tracksRouter.post('/download', (req, res) => {
  const ids = Array.isArray(req.body.trackIds) ? req.body.trackIds : [];
  const placeholders = ids.map(() => '?').join(',');
  const tracks = ids.length
    ? getDb().prepare(`SELECT * FROM tracks WHERE id IN (${placeholders})`).all(...ids)
    : [];
  if (!tracks.length) {
    return res.status(400).json({ error: 'No valid track ids given' });
  }
  streamTracksAsZip(res, req.body.name ?? 'tracks', tracks);
});

tracksRouter.patch('/:id', (req, res) => {
  const track = requireTrack(req, res);
  if (!track) return;

  const editable = ['title', 'artist', 'album_artist', 'album', 'genre', 'year', 'track_no', 'disc_no', 'rating'];
  const updates = editable.filter((field) => field in req.body);
  if (!updates.length) {
    return res.status(400).json({ error: 'No editable fields in request body' });
  }
  if ('rating' in req.body && !(Number.isInteger(req.body.rating) && req.body.rating >= 0 && req.body.rating <= 5)) {
    return res.status(400).json({ error: 'Rating must be an integer between 0 and 5' });
  }

  const assignments = updates.map((field) => `${field} = @${field}`).join(', ');
  const values = Object.fromEntries(updates.map((field) => [field, req.body[field]]));
  getDb().prepare(`UPDATE tracks SET ${assignments} WHERE id = @id`).run({ ...values, id: track.id });
  res.json(findTrack(track.id));
});

tracksRouter.delete('/:id', (req, res) => {
  const track = requireTrack(req, res);
  if (!track) return;
  fs.rmSync(path.join(config.musicDir, track.file_path), { force: true });
  getDb().prepare('DELETE FROM tracks WHERE id = ?').run(track.id);
  res.status(204).end();
});

tracksRouter.post('/:id/enrich', async (req, res, next) => {
  const track = requireTrack(req, res);
  if (!track) return;
  try {
    const result = await enrichTrack(track.id, requestedProvider(req));
    if (!result) {
      return res.status(404).json({ error: 'No metadata match found on iTunes or MusicBrainz' });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

tracksRouter.post('/:id/overwrite', async (req, res, next) => {
  const track = requireTrack(req, res);
  if (!track) return;
  try {
    const result = await overwriteTrack(track.id, requestedProvider(req));
    if (!result) {
      return res.status(404).json({ error: 'No metadata match found on iTunes or MusicBrainz' });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

tracksRouter.post('/:id/cover', async (req, res, next) => {
  const track = requireTrack(req, res);
  if (!track) return;
  try {
    const result = await downloadTrackCover(track.id, requestedProvider(req));
    if (!result) {
      return res.status(404).json({ error: 'No cover found on iTunes or MusicBrainz' });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

tracksRouter.post('/delete-batch', (req, res) => {
  const ids = (Array.isArray(req.body.trackIds) ? req.body.trackIds : []).filter(Number.isInteger);
  if (!ids.length) {
    return res.status(400).json({ error: 'No valid track ids given' });
  }
  const db = getDb();
  const tracks = db
    .prepare(`SELECT * FROM tracks WHERE id IN (${ids.map(() => '?').join(',')})`)
    .all(...ids);
  for (const track of tracks) {
    fs.rmSync(path.join(config.musicDir, track.file_path), { force: true });
  }
  db.prepare(`DELETE FROM tracks WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
  res.json({ deleted: tracks.length });
});
