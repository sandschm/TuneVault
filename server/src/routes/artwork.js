import fs from 'node:fs';
import { Router } from 'express';
import { artworkPath } from '../services/artworkService.js';

export const artworkRouter = Router();

artworkRouter.get('/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  if (fileName.includes('/') || fileName.includes('..')) {
    return res.status(400).json({ error: 'Invalid artwork file name' });
  }
  const filePath = artworkPath(fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Artwork not found' });
  }
  res.sendFile(filePath, { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } });
});
