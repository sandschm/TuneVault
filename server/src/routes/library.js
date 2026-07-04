import { Router } from 'express';
import { getDb } from '../db.js';
import { streamTracksAsZip } from '../services/archiveService.js';
import { enrichAlbum, overwriteAlbum, downloadAlbumCover } from '../services/enrichmentService.js';
import { METADATA_PROVIDERS } from '../services/metadataLookupService.js';
import { writeTags } from '../services/tagWriterService.js';
import { normalizeGenre } from '../services/genreNormalizationService.js';

function requestedProvider(req) {
  const provider = req.body?.provider;
  return METADATA_PROVIDERS.includes(provider) ? provider : 'auto';
}

export const libraryRouter = Router();

libraryRouter.get('/albums', (req, res) => {
  const filters = [];
  const params = {};
  if (req.query.albumArtist) {
    filters.push('album_artist = @albumArtist');
    params.albumArtist = req.query.albumArtist;
  }
  if (req.query.genre) {
    filters.push('genre = @genre');
    params.genre = req.query.genre;
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const albums = getDb()
    .prepare(
      `SELECT album, album_artist AS albumArtist,
              COUNT(*) AS trackCount,
              SUM(duration) AS totalDuration,
              MAX(year) AS year,
              MAX(genre) AS genre,
              MAX(artwork_file) AS artworkFile,
              MIN(id) AS coverTrackId
       FROM tracks ${where}
       GROUP BY album_artist, album
       ORDER BY album_artist, album`,
    )
    .all(params);
  res.json(albums);
});

function albumTracks(albumArtist, album) {
  return getDb()
    .prepare(
      `SELECT * FROM tracks WHERE album_artist = ? AND album = ?
       ORDER BY disc_no, track_no, title`,
    )
    .all(albumArtist, album);
}

libraryRouter.get('/albums/tracks', (req, res) => {
  res.json(albumTracks(req.query.albumArtist ?? '', req.query.album ?? ''));
});

libraryRouter.get('/albums/download', (req, res) => {
  const tracks = albumTracks(req.query.albumArtist ?? '', req.query.album ?? '');
  if (!tracks.length) {
    return res.status(404).json({ error: 'Album not found' });
  }
  streamTracksAsZip(res, `${req.query.albumArtist} - ${req.query.album}`, tracks);
});

libraryRouter.get('/artists', (req, res) => {
  const artists = getDb()
    .prepare(
      `SELECT artist AS name,
              COUNT(DISTINCT album) AS albumCount,
              COUNT(*) AS trackCount,
              MAX(artwork_file) AS artworkFile
       FROM tracks
       GROUP BY artist
       ORDER BY artist`,
    )
    .all();
  res.json(artists);
});

libraryRouter.get('/search', (req, res) => {
  const query = (req.query.q ?? '').trim();
  if (!query) {
    return res.json({ artists: [], albums: [], tracks: [] });
  }
  const like = `%${query}%`;
  const db = getDb();
  res.json({
    artists: db
      .prepare(
        `SELECT artist AS name, COUNT(*) AS trackCount, MAX(artwork_file) AS artworkFile
         FROM tracks WHERE artist LIKE ? GROUP BY artist ORDER BY artist LIMIT 20`,
      )
      .all(like),
    albums: db
      .prepare(
        `SELECT album, album_artist AS albumArtist, COUNT(*) AS trackCount,
                MAX(year) AS year, MAX(artwork_file) AS artworkFile
         FROM tracks WHERE album LIKE ? GROUP BY album_artist, album ORDER BY album LIMIT 20`,
      )
      .all(like),
    tracks: db
      .prepare(
        `SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
         ORDER BY title LIMIT 100`,
      )
      .all(like, like, like),
  });
});

libraryRouter.patch('/albums', (req, res) => {
  const tracks = albumTracks(req.body.albumArtist ?? '', req.body.album ?? '');
  if (!tracks.length) {
    return res.status(404).json({ error: 'Album not found' });
  }

  const fields = req.body.fields ?? {};
  const updates = {};
  if (typeof fields.album === 'string' && fields.album.trim()) {
    updates.album = fields.album.trim();
  }
  if (typeof fields.albumArtist === 'string' && fields.albumArtist.trim()) {
    updates.album_artist = fields.albumArtist.trim();
  }
  if ('genre' in fields) {
    updates.genre = typeof fields.genre === 'string' ? normalizeGenre(fields.genre) : null;
  }
  if ('year' in fields) {
    const year = Number(fields.year);
    if (fields.year != null && fields.year !== '' && !Number.isInteger(year)) {
      return res.status(400).json({ error: 'Year must be an integer' });
    }
    updates.year = Number.isInteger(year) && fields.year !== '' && fields.year != null ? year : null;
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No editable fields in request body' });
  }

  const db = getDb();
  const assignments = Object.keys(updates).map((field) => `${field} = @${field}`).join(', ');
  const updateStatement = db.prepare(`UPDATE tracks SET ${assignments} WHERE id = @id`);
  for (const track of tracks) {
    updateStatement.run({ ...updates, id: track.id });
    const updated = db.prepare('SELECT * FROM tracks WHERE id = ?').get(track.id);
    writeTags(updated.file_path, {
      title: updated.title,
      artist: updated.artist,
      albumArtist: updated.album_artist,
      album: updated.album,
      genre: updated.genre,
      year: updated.year,
      trackNo: updated.track_no,
    });
  }
  res.json({
    updatedTracks: tracks.length,
    album: updates.album ?? req.body.album,
    albumArtist: updates.album_artist ?? req.body.albumArtist,
  });
});

libraryRouter.post('/albums/enrich', async (req, res, next) => {
  try {
    const result = await enrichAlbum(req.body.albumArtist ?? '', req.body.album ?? '', requestedProvider(req));
    if (!result) {
      return res.status(404).json({ error: 'Album not found or no metadata match on iTunes/MusicBrainz' });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

libraryRouter.post('/albums/overwrite', async (req, res, next) => {
  try {
    const result = await overwriteAlbum(req.body.albumArtist ?? '', req.body.album ?? '', requestedProvider(req));
    if (!result) {
      return res.status(404).json({ error: 'Album not found or no metadata match on iTunes/MusicBrainz' });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

libraryRouter.post('/albums/cover', async (req, res, next) => {
  try {
    const result = await downloadAlbumCover(req.body.albumArtist ?? '', req.body.album ?? '', requestedProvider(req));
    if (!result) {
      return res.status(404).json({ error: 'Album not found or no cover on iTunes/MusicBrainz' });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

libraryRouter.get('/genres', (req, res) => {
  const genres = getDb()
    .prepare(
      `SELECT genre AS name,
              COUNT(*) AS trackCount,
              COUNT(DISTINCT album_artist || '|' || album) AS albumCount,
              MAX(artwork_file) AS artworkFile
       FROM tracks
       WHERE genre IS NOT NULL
       GROUP BY genre
       ORDER BY genre`,
    )
    .all();
  res.json(genres);
});

const HOME_SECTION_LIMIT = 12;

/**
 * Aggregated data for the start page: recently played, recently added,
 * recommendations from the own library and the newest playlists.
 * Recommendations are a local heuristic: unplayed tracks by the artists and
 * genres the user plays and rates the most; if the library is (almost) fully
 * played, the least-played tracks fill the list.
 */
libraryRouter.get('/home', (req, res) => {
  const db = getDb();

  const recentlyPlayed = db
    .prepare('SELECT * FROM tracks WHERE last_played_at IS NOT NULL ORDER BY last_played_at DESC LIMIT ?')
    .all(HOME_SECTION_LIMIT);

  const recentlyAdded = db
    .prepare('SELECT * FROM tracks ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(HOME_SECTION_LIMIT);

  let recommendations = db
    .prepare(
      `WITH artist_affinity AS (
         SELECT artist, SUM(play_count) + SUM(rating) * 2 AS weight
         FROM tracks GROUP BY artist HAVING weight > 0
       ),
       genre_affinity AS (
         SELECT genre, SUM(play_count) + SUM(rating) * 2 AS weight
         FROM tracks WHERE genre IS NOT NULL GROUP BY genre HAVING weight > 0
       )
       SELECT t.*, COALESCE(aa.weight, 0) * 2 + COALESCE(ga.weight, 0) AS affinity
       FROM tracks t
       LEFT JOIN artist_affinity aa ON aa.artist = t.artist
       LEFT JOIN genre_affinity ga ON ga.genre = t.genre
       WHERE t.play_count = 0 AND (COALESCE(aa.weight, 0) + COALESCE(ga.weight, 0)) > 0
       ORDER BY affinity DESC, t.rating DESC, RANDOM()
       LIMIT ?`,
    )
    .all(HOME_SECTION_LIMIT);

  if (recommendations.length < HOME_SECTION_LIMIT) {
    const excludedIds = recommendations.map((track) => track.id);
    const placeholders = excludedIds.length ? excludedIds.map(() => '?').join(',') : '-1';
    const fill = db
      .prepare(
        `SELECT * FROM tracks WHERE id NOT IN (${placeholders})
         ORDER BY play_count ASC, rating DESC, RANDOM() LIMIT ?`,
      )
      .all(...excludedIds, HOME_SECTION_LIMIT - recommendations.length);
    recommendations = recommendations.concat(fill);
  }

  const newestPlaylists = db
    .prepare(
      `SELECT p.id, p.name, p.created_at AS createdAt,
              COUNT(pt.track_id) AS trackCount,
              MAX(t.artwork_file) AS artworkFile
       FROM playlists p
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       LEFT JOIN tracks t ON t.id = pt.track_id
       GROUP BY p.id
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
    )
    .all(HOME_SECTION_LIMIT);

  res.json({ recentlyPlayed, recentlyAdded, recommendations, newestPlaylists });
});

libraryRouter.get('/stats', (req, res) => {
  const stats = getDb()
    .prepare(
      `SELECT COUNT(*) AS tracks,
              COUNT(DISTINCT album_artist || '|' || album) AS albums,
              COUNT(DISTINCT album_artist) AS artists,
              COALESCE(SUM(duration), 0) AS totalDuration,
              COALESCE(SUM(file_size), 0) AS totalSize
       FROM tracks`,
    )
    .get();
  res.json(stats);
});
