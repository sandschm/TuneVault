import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const EXTENSION_BY_FORMAT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Stores raw image bytes in the covers directory, deduplicated by content hash.
 * Returns the stored file name (relative to the covers directory).
 */
export function storeArtwork(buffer, format) {
  const extension = EXTENSION_BY_FORMAT[format?.toLowerCase()] ?? '.jpg';
  const hash = crypto.createHash('sha1').update(buffer).digest('hex');
  const fileName = `${hash}${extension}`;
  const filePath = path.join(config.coversDir, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buffer);
  }
  return fileName;
}

export function artworkPath(fileName) {
  return path.join(config.coversDir, fileName);
}

export async function downloadArtwork(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Artwork download failed with status ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  return storeArtwork(buffer, contentType);
}
