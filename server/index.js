// INOV Holding — Express server.
// Serves the built frontend (dist/) + admin panel + JSON API and uploaded files.
// On Hostinger: `npm run build` then `npm start` (this file).
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDb } from './db.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { UPLOAD_DIR } from './upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
// Serve the Vite build if present, otherwise the raw source (dev convenience).
const STATIC = fs.existsSync(path.join(DIST, 'index.html')) ? DIST : ROOT;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Uploaded files
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

// Static frontend assets
app.use(express.static(STATIC, { index: false, maxAge: '1h' }));

// Admin panel entry
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(STATIC, 'admin.html'));
});

// Public site (hash routing -> always serve index.html for non-API GETs)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(STATIC, 'index.html'));
});

const PORT = Number(process.env.PORT || 4321);
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`[inov] server listening on :${PORT} (static: ${STATIC === DIST ? 'dist' : 'src'})`));
  })
  .catch((err) => {
    console.error('[inov] failed to start:', err);
    process.exit(1);
  });
