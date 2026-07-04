import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const USER_AGENT = 'TuneVault/1.0 (self-hosted music library)';

/** Artists Deezer had no photo for — avoids re-querying on every request. */
const knownMisses = new Set();

function cacheFilePath(artistName) {
  const key = crypto.createHash('sha1').update(artistName.trim().toLowerCase()).digest('hex');
  return path.join(config.artistImagesDir, `${key}.jpg`);
}

/**
 * Returns the absolute path of a photo for the given artist, or null if none
 * is available. Photos are looked up once via the free, keyless Deezer API
 * and cached on disk in DATA_DIR/artists/; misses are cached in memory so a
 * library full of unknown artists doesn't hammer the API.
 */
export async function getArtistImage(artistName) {
  const name = artistName?.trim();
  if (!name || name === 'Unknown Artist') {
    return null;
  }
  const filePath = cacheFilePath(name);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  if (knownMisses.has(filePath)) {
    return null;
  }

  const url = new URL('https://api.deezer.com/search/artist');
  url.searchParams.set('q', name);
  url.searchParams.set('limit', '1');
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    return null; // transient provider error — do not negative-cache
  }
  const artist = (await response.json()).data?.[0];
  const pictureUrl = artist?.picture_big || artist?.picture_medium;
  // Deezer returns a generic placeholder URL (…/artist//…) when it has no photo.
  if (!pictureUrl || pictureUrl.includes('/artist//')) {
    knownMisses.add(filePath);
    return null;
  }

  const image = await fetch(pictureUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!image.ok) {
    return null;
  }
  fs.writeFileSync(filePath, Buffer.from(await image.arrayBuffer()));
  return filePath;
}
