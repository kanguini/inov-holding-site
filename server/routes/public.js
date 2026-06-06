// Public API: content for the site + form submissions (contact + applications).
import { Router } from 'express';
import { q, getSetting } from '../db.js';
import { shapePublication, shapeCompany, shapePosition } from '../shape.js';
import { uploadCv, uploadNone, publicUrl } from '../upload.js';
import { notify } from '../email.js';
import { rateLimit } from '../security.js';

const router = Router();

const clean = (v, max = 5000) => String(v == null ? '' : v).trim().slice(0, max);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
// Bot trap: hidden form field that real users never fill.
const isBot = (b) => String((b || {}).company_website || '').trim() !== '';
// Cap form submissions per IP.
const formLimit = rateLimit({ windowMs: 60_000, max: 5 });

// Single bootstrap call the frontend uses to populate window.INOV.
router.get('/content', async (req, res) => {
  try {
    const [pubs, comps, pos, media] = await Promise.all([
      q("SELECT * FROM publications WHERE status = 'published' ORDER BY pdate DESC, id DESC"),
      q('SELECT * FROM companies ORDER BY sort_order ASC, id ASC'),
      q("SELECT * FROM positions WHERE status = 'open' ORDER BY sort_order ASC, id ASC"),
      getSetting('media'),
    ]);
    res.json({
      media: media || { cover: null, sectors: { infrastructure: null, finance: null, digital: null, creative: null } },
      companies: comps.map(shapeCompany),
      publications: pubs.map(shapePublication),
      positions: pos.map(shapePosition),
    });
  } catch (err) {
    console.error('[api] /content', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Contact message (browser submits as multipart FormData).
router.post('/messages', formLimit, uploadNone, async (req, res) => {
  try {
    const b = req.body || {};
    if (isBot(b)) return res.json({ ok: true });
    const name = clean(b.name, 200);
    const email = clean(b.email, 200);
    const message = clean(b.message, 5000);
    if (!name || !isEmail(email) || !message) return res.status(400).json({ error: 'invalid_input' });
    await q(
      'INSERT INTO messages (name, email, organisation, subject, message) VALUES (?,?,?,?,?)',
      [name, email, clean(b.organisation, 200), clean(b.subject, 200), message]
    );
    notify(`Nova mensagem de contacto — ${name}`, [
      `Nome: ${name}`,
      `Email: ${email}`,
      `Organização: ${clean(b.organisation, 200) || '—'}`,
      `Assunto: ${clean(b.subject, 200) || '—'}`,
      '',
      message,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[api] /messages', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Job application (optional CV file upload).
router.post('/applications', formLimit, (req, res) => {
  uploadCv.single('cv')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const code = uploadErr.message === 'invalid_file_type' ? 'invalid_file_type' : 'upload_error';
      return res.status(400).json({ error: code });
    }
    try {
      const b = req.body || {};
      if (isBot(b)) return res.json({ ok: true });
      const name = clean(b.name, 200);
      const email = clean(b.email, 200);
      const message = clean(b.message, 5000);
      if (!name || !isEmail(email) || !message) return res.status(400).json({ error: 'invalid_input' });
      const cv = req.file ? publicUrl(req.file.filename) : null;
      await q(
        'INSERT INTO applications (name, email, position, link, message, cv) VALUES (?,?,?,?,?,?)',
        [name, email, clean(b.position, 300), clean(b.link, 500), message, cv]
      );
      notify(`Nova candidatura — ${name}`, [
        `Nome: ${name}`,
        `Email: ${email}`,
        `Vaga: ${clean(b.position, 300) || '—'}`,
        `Link: ${clean(b.link, 500) || '—'}`,
        `CV: ${cv || '— (sem ficheiro)'}`,
        '',
        message,
      ]);
      res.json({ ok: true });
    } catch (err) {
      console.error('[api] /applications', err);
      res.status(500).json({ error: 'server_error' });
    }
  });
});

export default router;
