import path from 'node:path';
import { File, Picture, PictureType, ByteVector } from 'node-taglib-sharp';
import { config } from '../config.js';

/**
 * Persists metadata into the audio file's tags (ID3/Vorbis/MP4).
 * Only fields that are present (not undefined/null) are written.
 * filePath is relative to the music directory.
 */
export function writeTags(filePath, fields) {
  const file = File.createFromPath(path.join(config.musicDir, filePath));
  try {
    if (fields.title != null) file.tag.title = fields.title;
    if (fields.artist != null) file.tag.performers = [fields.artist];
    if (fields.albumArtist != null) file.tag.albumArtists = [fields.albumArtist];
    if (fields.album != null) file.tag.album = fields.album;
    if (fields.genre != null) file.tag.genres = [fields.genre];
    if (fields.year != null) file.tag.year = fields.year;
    if (fields.trackNo != null) file.tag.track = fields.trackNo;
    file.save();
  } finally {
    file.dispose();
  }
}

/**
 * Embeds a front-cover image into the audio file, replacing existing pictures.
 */
export function writeCover(filePath, imageBuffer) {
  const file = File.createFromPath(path.join(config.musicDir, filePath));
  try {
    const picture = Picture.fromData(ByteVector.fromByteArray(imageBuffer));
    picture.type = PictureType.FrontCover;
    file.tag.pictures = [picture];
    file.save();
  } finally {
    file.dispose();
  }
}
