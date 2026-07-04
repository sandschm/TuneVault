import { Router } from 'express';
import { getDb } from '../db.js';
import { streamTracksAsZip } from '../services/archiveService.js';
import { enrichAlbum, overwriteAlbum, downloadAlbumCover } from '../services/enrichmentService.js';
import { METADATA_PROVIDERS } from '../services/metadataLookupService.js';

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
