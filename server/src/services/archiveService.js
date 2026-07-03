import path from 'node:path';
import archiver from 'archiver';
import { config } from '../config.js';

function sanitizeFileName(value) {
  return value.replace(/[/\\:*?"<>|]/g, '_').trim() || 'download';
}

/**
 * Streams the given tracks as a ZIP archive to an Express response.
 * Track files are addressed relative to the music directory.
 */
export function streamTracksAsZip(response, archiveName, tracks) {
  const fileName = `${sanitizeFileName(archiveName)}.zip`;
  response.setHeader('Content-Type', 'application/zip');
  response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

  const archive = archiver('zip', { zlib: { level: 0 } });
  archive.on('error', (error) => response.destroy(error));
  archive.pipe(response);

  for (const track of tracks) {
    const absolutePath = path.join(config.musicDir, track.file_path);
    archive.file(absolutePath, { name: track.file_path });
  }
  archive.finalize();
}
