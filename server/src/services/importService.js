import fs from 'node:fs';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import { config } from '../config.js';
import { getDb } from '../db.js';
import { storeArtwork } from './artworkService.js';

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.wav']);

const MIME_BY_EXTENSION = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
};

export function isSupportedAudioFile(fileName) {
  return SUPPORTED_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function sanitizePathSegment(value) {
  return (value ?? '').replace(/[/\\:*?"<>|]/g, '_').trim() || '_';
}

/**
 * Moves a file across file-system boundaries: rename when possible,
 * copy + delete when source and target are on different devices (EXDEV),
 * e.g. container tmpfs -> mounted data volume.
 */
function moveFile(sourcePath, targetPath) {
  try {
    fs.renameSync(sourcePath, targetPath);
  } catch (error) {
    if (error.code !== 'EXDEV') {
      throw error;
    }
    fs.copyFileSync(sourcePath, targetPath);
    fs.rmSync(sourcePath, { force: true });
  }
}

function uniqueTargetPath(directory, baseName, extension) {
  let candidate = path.join(directory, `${baseName}${extension}`);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${baseName} (${counter})${extension}`);
    counter += 1;
  }
  return candidate;
}

function extractTags(metadata, fallbackTitle) {
  const { common, format } = metadata;
  return {
    title: common.title?.trim() || fallbackTitle,
    artist: common.artist?.trim() || 'Unknown Artist',
    albumArtist: common.albumartist?.trim() || common.artist?.trim() || 'Unknown Artist',
    album: common.album?.trim() || 'Unknown Album',
    genre: common.genre?.[0]?.trim() || null,
    year: common.year ?? null,
    trackNo: common.track?.no ?? null,
    discNo: common.disk?.no ?? null,
    duration: format.duration ?? null,
    bitrate: format.bitrate ? Math.round(format.bitrate) : null,
    picture: common.picture?.[0] ?? null,
  };
}

/**
 * Imports one uploaded audio file: parses its tags, moves it into the
 * structured music directory (Artist/Album/Title.ext) and inserts a track row.
 */
export async function importAudioFile(temporaryPath, originalName) {
  const extension = path.extname(originalName).toLowerCase();
  const fallbackTitle = path.basename(originalName, extension);

  let tags;
  try {
    tags = extractTags(await parseFile(temporaryPath), fallbackTitle);
  } catch {
    tags = extractTags({ common: {}, format: {} }, fallbackTitle);
  }

  const targetDir = path.join(
    config.musicDir,
    sanitizePathSegment(tags.albumArtist),
    sanitizePathSegment(tags.album),
  );
  fs.mkdirSync(targetDir, { recursive: true });

  const baseName = tags.trackNo
    ? `${String(tags.trackNo).padStart(2, '0')} ${sanitizePathSegment(tags.title)}`
    : sanitizePathSegment(tags.title);
  const targetPath = uniqueTargetPath(targetDir, baseName, extension);
  moveFile(temporaryPath, targetPath);

  const artworkFile = tags.picture
    ? storeArtwork(tags.picture.data, tags.picture.format)
    : findExistingAlbumArtwork(tags.albumArtist, tags.album);

  const result = getDb()
    .prepare(
      `INSERT INTO tracks
         (title, artist, album_artist, album, genre, year, track_no, disc_no,
          duration, file_path, file_size, mime_type, bitrate, artwork_file)
       VALUES
         (@title, @artist, @albumArtist, @album, @genre, @year, @trackNo, @discNo,
          @duration, @filePath, @fileSize, @mimeType, @bitrate, @artworkFile)`,
    )
    .run({
      ...tags,
      picture: undefined,
      filePath: path.relative(config.musicDir, targetPath),
      fileSize: fs.statSync(targetPath).size,
      mimeType: MIME_BY_EXTENSION[extension] ?? 'application/octet-stream',
      artworkFile,
    });

  return getDb().prepare('SELECT * FROM tracks WHERE id = ?').get(result.lastInsertRowid);
}

function findExistingAlbumArtwork(albumArtist, album) {
  const row = getDb()
    .prepare(
      `SELECT artwork_file FROM tracks
       WHERE album_artist = ? AND album = ? AND artwork_file IS NOT NULL
       LIMIT 1`,
    )
    .get(albumArtist, album);
  return row?.artwork_file ?? null;
}
