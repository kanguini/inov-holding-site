// INOV Holding — Express server.
// Serves the built frontend (dist/) + admin panel + JSON API and uploaded files.
// On Hostinger: `npm run build` then `npm start` (this file).
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDbWithRetry, dbReady, dbLastError } from './db.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { UPLOAD_DIR } from './upload.js';
import { securityHeaders } from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
// Serve the Vite build if present, otherwise the raw source (dev convenience).
const STATIC = fs.existsSync(path.join(DIST, 'index.html')) ? DIST : ROOT;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Hostinger serves behind a reverse proxy
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// The database comes up asynchronously. Until it does, answer API calls with a
// clear 503 instead of throwing — the public site falls back to its built-in
// content and keeps working.
app.use('/api', (req, res, next) => {
  if (dbReady()) return next();
  res.status(503).json({ error: 'database_unavailable', detail: 'The service is starting up. Try again shortly.' });
});

// API
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Liveness/readiness, so an outage can be diagnosed without shell access.
app.get('/healthz', (req, res) => {
  const err = dbLastError();
  res.status(dbReady() ? 200 : 503).json({
    ok: dbReady(),
    db: dbReady() ? 'ready' : 'unavailable',
    ...(err ? { lastError: `${err.code || err.name}: ${err.message}` } : {}),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

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

// Listen FIRST. Previously the process exited when the database was unreachable
// at boot, which left the reverse proxy with no upstream — a permanent 503 on
// /admin and /api that only a manual restart could clear.
app.listen(PORT, () => {
  console.log(`[inov] server listening on :${PORT} (static: ${STATIC === DIST ? 'dist' : 'src'})`);
  initDbWithRetry({ onReady: () => console.log('[inov] database ready; API live') });
});

// A late failure should be logged, not fatal — the proxy keeps its upstream.
process.on('unhandledRejection', (err) => console.error('[inov] unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('[inov] uncaught exception:', err));
