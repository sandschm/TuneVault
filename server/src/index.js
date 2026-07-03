import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config, ensureDataDirectories } from './config.js';
import { getDb } from './db.js';
import { tracksRouter } from './routes/tracks.js';
import { libraryRouter } from './routes/library.js';
import { playlistsRouter } from './routes/playlists.js';
import { uploadsRouter } from './routes/uploads.js';
import { artworkRouter } from './routes/artwork.js';

ensureDataDirectories();
getDb();

const app = express();
app.use(express.json());

app.use('/api/tracks', tracksRouter);
app.use('/api/library', libraryRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/artwork', artworkRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

if (fs.existsSync(config.clientDistDir)) {
  app.use(express.static(config.clientDistDir));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(config.clientDistDir, 'index.html'));
  });
}

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) {
    return next(error);
  }
  res.status(500).json({ error: error.message ?? 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`TuneVault listening on port ${config.port} (data: ${config.dataDir})`);
});
