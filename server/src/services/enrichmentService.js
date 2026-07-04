import { getDb } from '../db.js';
import { lookupTrackMetadata, lookupAlbumMetadata } from './metadataLookupService.js';
import { fetchArtwork, storeArtwork } from './artworkService.js';
import { writeTags, writeCover } from './tagWriterService.js';

function findTrack(id) {
  return getDb().prepare('SELECT * FROM tracks WHERE id = ?').get(id);
}

function albumTracks(albumArtist, album) {
  return getDb()
    .prepare('SELECT * FROM tracks WHERE album_artist = ? AND album = ? ORDER BY disc_no, track_no, title')
    .all(albumArtist, album);
}

/**
 * Persists the track's current metadata from the database into the audio
 * file's tags, so file and library never drift apart.
 */
function persistTrackTags(track) {
  writeTags(track.file_path, {
    title: track.title,
    artist: track.artist,
    albumArtist: track.album_artist,
    album: track.album,
    genre: track.genre,
    year: track.year,
    trackNo: track.track_no,
  });
}

function applyCover(track, buffer, contentType) {
  const artworkFile = storeArtwork(buffer, contentType);
  writeCover(track.file_path, buffer);
  getDb().prepare('UPDATE tracks SET artwork_file = ? WHERE id = ?').run(artworkFile, track.id);
}

/**
 * Fills the track's missing metadata from open APIs, writes the result to
 * the database and into the audio file. Existing values are never replaced.
 */
export async function enrichTrack(trackId, provider = 'auto') {
  const track = findTrack(trackId);
  const match = await lookupTrackMetadata(track, provider);
  if (!match) {
    return null;
  }

  getDb()
    .prepare(
      `UPDATE tracks SET
         genre = COALESCE(genre, @genre),
         year = COALESCE(year, @year),
         track_no = COALESCE(track_no, @trackNo),
         artist = CASE WHEN artist = 'Unknown Artist' AND @artist IS NOT NULL THEN @artist ELSE artist END,
         album_artist = CASE WHEN album_artist = 'Unknown Artist' AND @albumArtist IS NOT NULL THEN @albumArtist ELSE album_artist END,
         album = CASE WHEN album = 'Unknown Album' AND @album IS NOT NULL THEN @album ELSE album END
       WHERE id = @id`,
    )
    .run({ ...match, id: track.id });

  const updated = findTrack(track.id);
  persistTrackTags(updated);

  if (!updated.artwork_file && match.artworkUrl) {
    try {
      const { buffer, contentType } = await fetchArtwork(match.artworkUrl);
      applyCover(updated, buffer, contentType);
    } catch {
      // Cover is best-effort; metadata enrichment already succeeded.
    }
  }
  return { track: findTrack(track.id), source: match.source };
}

/**
 * Fills missing genre/year for every track of an album and applies the album
 * cover, persisting everything into the audio files.
 */
export async function enrichAlbum(albumArtist, album, provider = 'auto') {
  const tracks = albumTracks(albumArtist, album);
  if (!tracks.length) {
    return null;
  }
  const match = await lookupAlbumMetadata(albumArtist, album, provider);
  if (!match) {
    return null;
  }

  const updateStatement = getDb().prepare(
    'UPDATE tracks SET genre = COALESCE(genre, ?), year = COALESCE(year, ?) WHERE id = ?',
  );
  for (const track of tracks) {
    updateStatement.run(match.genre, match.year, track.id);
    persistTrackTags(findTrack(track.id));
  }

  let coverApplied = false;
  if (match.artworkUrl) {
    try {
      const { buffer, contentType } = await fetchArtwork(match.artworkUrl);
      for (const track of tracks) {
        if (!findTrack(track.id).artwork_file) {
          applyCover(track, buffer, contentType);
          coverApplied = true;
        }
      }
    } catch {
      // Cover is best-effort.
    }
  }
  return { source: match.source, updatedTracks: tracks.length, coverApplied };
}

/**
 * Overwrites the track's album, album artist, genre, year and track number
 * with values from open APIs. Title, artist and cover are never touched;
 * fields the provider has no value for keep their existing value.
 */
export async function overwriteTrack(trackId, provider = 'auto') {
  const track = findTrack(trackId);
  const match = await lookupTrackMetadata(track, provider);
  if (!match) {
    return null;
  }

  getDb()
    .prepare(
      `UPDATE tracks SET
         genre = COALESCE(@genre, genre),
         year = COALESCE(@year, year),
         track_no = COALESCE(@trackNo, track_no),
         album = COALESCE(@album, album),
         album_artist = COALESCE(@albumArtist, album_artist)
       WHERE id = @id`,
    )
    .run({ ...match, id: track.id });

  const updated = findTrack(track.id);
  persistTrackTags(updated);
  return { track: updated, source: match.source };
}

/**
 * Overwrites album name, album artist, genre and year for every track of an
 * album with values from open APIs. Titles, artists and covers are never
 * touched; fields the provider has no value for keep their existing value.
 */
export async function overwriteAlbum(albumArtist, album, provider = 'auto') {
  const tracks = albumTracks(albumArtist, album);
  if (!tracks.length) {
    return null;
  }
  const match = await lookupAlbumMetadata(albumArtist, album, provider);
  if (!match) {
    return null;
  }

  const updateStatement = getDb().prepare(
    `UPDATE tracks SET
       genre = COALESCE(@genre, genre),
       year = COALESCE(@year, year),
       album = COALESCE(@album, album),
       album_artist = COALESCE(@albumArtist, album_artist)
     WHERE id = @id`,
  );
  for (const track of tracks) {
    updateStatement.run({ ...match, id: track.id });
    persistTrackTags(findTrack(track.id));
  }
  return { source: match.source, updatedTracks: tracks.length };
}

/**
 * Fetches the cover for a single track from open APIs and embeds it into the
 * audio file, replacing an existing cover.
 */
export async function downloadTrackCover(trackId, provider = 'auto') {
  const track = findTrack(trackId);
  const match = await lookupTrackMetadata(track, provider);
  if (!match?.artworkUrl) {
    return null;
  }
  const { buffer, contentType } = await fetchArtwork(match.artworkUrl);
  applyCover(track, buffer, contentType);
  return { track: findTrack(track.id), source: match.source };
}

/**
 * Fetches the album cover from open APIs and embeds it into every track of
 * the album, replacing existing covers.
 */
export async function downloadAlbumCover(albumArtist, album, provider = 'auto') {
  const tracks = albumTracks(albumArtist, album);
  if (!tracks.length) {
    return null;
  }
  const match = await lookupAlbumMetadata(albumArtist, album, provider);
  if (!match?.artworkUrl) {
    return null;
  }
  const { buffer, contentType } = await fetchArtwork(match.artworkUrl);
  for (const track of tracks) {
    applyCover(track, buffer, contentType);
  }
  return { source: match.source, updatedTracks: tracks.length };
}
