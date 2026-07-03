import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), 'data'));

export const config = {
  port: Number(process.env.PORT ?? 8080),
  dataDir,
  musicDir: path.join(dataDir, 'music'),
  coversDir: path.join(dataDir, 'covers'),
  databaseFile: path.join(dataDir, 'library.db'),
  clientDistDir: path.resolve(process.env.CLIENT_DIST ?? path.join(process.cwd(), '..', 'client', 'dist')),
  maxUploadSizeBytes: Number(process.env.MAX_UPLOAD_MB ?? 500) * 1024 * 1024,
};

export function ensureDataDirectories() {
  for (const dir of [config.dataDir, config.musicDir, config.coversDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
