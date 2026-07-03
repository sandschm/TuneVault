import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { importAudioFile, isSupportedAudioFile } from '../services/importService.js';

const upload = multer({
  dest: path.join(os.tmpdir(), 'tunevault-uploads'),
  limits: { fileSize: config.maxUploadSizeBytes },
});

export const uploadsRouter = Router();

uploadsRouter.post('/', upload.array('files'), async (req, res) => {
  const results = [];
  for (const file of req.files ?? []) {
    if (!isSupportedAudioFile(file.originalname)) {
      fs.rmSync(file.path, { force: true });
      results.push({ file: file.originalname, status: 'skipped', reason: 'Unsupported file type' });
      continue;
    }
    try {
      const track = await importAudioFile(file.path, file.originalname);
      results.push({ file: file.originalname, status: 'imported', track });
    } catch (error) {
      fs.rmSync(file.path, { force: true });
      results.push({ file: file.originalname, status: 'failed', reason: error.message });
    }
  }
  res.status(201).json(results);
});
