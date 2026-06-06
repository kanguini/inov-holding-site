// Admin API: auth + CRUD for publications, positions, companies; media
// settings; inbox (messages + applications); file uploads. All routes except
// /login require a valid admin session cookie.
import { Router } from 'express';
import { q, one, getSetting, setSetting } from '../db.js';
import { login, setAuthCookie, clearAuthCookie, requireAuth, changePassword } from '../auth.js';
import { uploadImage, publicUrl } from '../upload.js';
import { rateLimit } from '../security.js';

const router = Router();
const loginLimit = rateLimit({ windowMs: 5 * 60_000, max: 10, message: 'too_many_attempts' });
const clean = (v, max = 5000) => String(v == null ? '' : v).trim().slice(0, max);
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// ── Auth ─────────────────────────────────────────────────────────────────
router.post('/login', loginLimit, async (req, res) => {
  const token = await login(req.body?.email, req.body?.password);
  if (!token) return res.status(401).json({ error: 'invalid_credentials' });
  setAuthCookie(res, token);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ email: req.admin.email });
});

router.post('/password', requireAuth, async (req, res) => {
  const r = await changePassword(req.admin.id, req.body?.current, req.body?.next);
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
});

// All routes below require auth.
router.use(requireAuth);

// ── File upload (images: logos, covers, sector photos) ─────────────────────
router.post('/upload', (req, res) => {
  uploadImage.single('file')(req, res, (err) => {
    if (err) {
      const code = err.message === 'invalid_file_type' ? 'invalid_file_type' : 'upload_error';
      return res.status(400).json({ error: code });
    }
    if (!req.file) return res.status(400).json({ error: 'no_file' });
    res.json({ url: publicUrl(req.file.filename) });
  });
});

// ── Publications ───────────────────────────────────────────────────────────
router.get('/publications', async (req, res) => {
  res.json(await q('SELECT * FROM publications ORDER BY pdate DESC, id DESC'));
});

router.post('/publications', async (req, res) => {
  const b = req.body || {};
  const r = await q(
    `INSERT INTO publications
       (pdate, cover, cat_en, cat_pt, title_en, title_pt, excerpt_en, excerpt_pt, body_en, body_pt, status, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [clean(b.pdate, 10), clean(b.cover, 500) || null, clean(b.cat_en, 120), clean(b.cat_pt, 120),
     clean(b.title_en, 300), clean(b.title_pt, 300), clean(b.excerpt_en), clean(b.excerpt_pt),
     clean(b.body_en, 20000), clean(b.body_pt, 20000), b.status === 'draft' ? 'draft' : 'published', num(b.sort_order)]
  );
  res.json({ ok: true, id: r.insertId });
});

router.put('/publications/:id', async (req, res) => {
  const b = req.body || {};
  await q(
    `UPDATE publications SET
       pdate=?, cover=?, cat_en=?, cat_pt=?, title_en=?, title_pt=?,
       excerpt_en=?, excerpt_pt=?, body_en=?, body_pt=?, status=?, sort_order=?
     WHERE id=?`,
    [clean(b.pdate, 10), clean(b.cover, 500) || null, clean(b.cat_en, 120), clean(b.cat_pt, 120),
     clean(b.title_en, 300), clean(b.title_pt, 300), clean(b.excerpt_en), clean(b.excerpt_pt),
     clean(b.body_en, 20000), clean(b.body_pt, 20000), b.status === 'draft' ? 'draft' : 'published',
     num(b.sort_order), num(req.params.id)]
  );
  res.json({ ok: true });
});

router.delete('/publications/:id', async (req, res) => {
  await q('DELETE FROM publications WHERE id=?', [num(req.params.id)]);
  res.json({ ok: true });
});

// ── Positions ──────────────────────────────────────────────────────────────
router.get('/positions', async (req, res) => {
  res.json(await q('SELECT * FROM positions ORDER BY sort_order ASC, id ASC'));
});

router.post('/positions', async (req, res) => {
  const b = req.body || {};
  const r = await q(
    `INSERT INTO positions
       (location, title_en, title_pt, dept_en, dept_pt, type_en, type_pt, summary_en, summary_pt, status, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [clean(b.location, 200), clean(b.title_en, 300), clean(b.title_pt, 300), clean(b.dept_en, 120),
     clean(b.dept_pt, 120), clean(b.type_en, 120), clean(b.type_pt, 120), clean(b.summary_en),
     clean(b.summary_pt), b.status === 'closed' ? 'closed' : 'open', num(b.sort_order)]
  );
  res.json({ ok: true, id: r.insertId });
});

router.put('/positions/:id', async (req, res) => {
  const b = req.body || {};
  await q(
    `UPDATE positions SET
       location=?, title_en=?, title_pt=?, dept_en=?, dept_pt=?, type_en=?, type_pt=?,
       summary_en=?, summary_pt=?, status=?, sort_order=?
     WHERE id=?`,
    [clean(b.location, 200), clean(b.title_en, 300), clean(b.title_pt, 300), clean(b.dept_en, 120),
     clean(b.dept_pt, 120), clean(b.type_en, 120), clean(b.type_pt, 120), clean(b.summary_en),
     clean(b.summary_pt), b.status === 'closed' ? 'closed' : 'open', num(b.sort_order), num(req.params.id)]
  );
  res.json({ ok: true });
});

router.delete('/positions/:id', async (req, res) => {
  await q('DELETE FROM positions WHERE id=?', [num(req.params.id)]);
  res.json({ ok: true });
});

// ── Companies ──────────────────────────────────────────────────────────────
router.get('/companies', async (req, res) => {
  res.json(await q('SELECT * FROM companies ORDER BY sort_order ASC, id ASC'));
});

router.post('/companies', async (req, res) => {
  const b = req.body || {};
  const r = await q(
    `INSERT INTO companies (name, word, color, url, logo, cap_en, cap_pt, sort_order)
     VALUES (?,?,?,?,?,?,?,?)`,
    [clean(b.name, 200), clean(b.word, 200), clean(b.color, 20) || '#002F55', clean(b.url, 500) || '#',
     clean(b.logo, 500) || null, clean(b.cap_en, 200), clean(b.cap_pt, 200), num(b.sort_order)]
  );
  res.json({ ok: true, id: r.insertId });
});

router.put('/companies/:id', async (req, res) => {
  const b = req.body || {};
  await q(
    `UPDATE companies SET name=?, word=?, color=?, url=?, logo=?, cap_en=?, cap_pt=?, sort_order=? WHERE id=?`,
    [clean(b.name, 200), clean(b.word, 200), clean(b.color, 20) || '#002F55', clean(b.url, 500) || '#',
     clean(b.logo, 500) || null, clean(b.cap_en, 200), clean(b.cap_pt, 200), num(b.sort_order), num(req.params.id)]
  );
  res.json({ ok: true });
});

router.delete('/companies/:id', async (req, res) => {
  await q('DELETE FROM companies WHERE id=?', [num(req.params.id)]);
  res.json({ ok: true });
});

// ── Media settings (hero cover + sector images) ────────────────────────────
router.get('/media', async (req, res) => {
  res.json((await getSetting('media')) || { cover: null, sectors: {} });
});

router.put('/media', async (req, res) => {
  const b = req.body || {};
  const media = {
    cover: b.cover || null,
    sectors: {
      infrastructure: b?.sectors?.infrastructure || null,
      finance: b?.sectors?.finance || null,
      digital: b?.sectors?.digital || null,
      creative: b?.sectors?.creative || null,
    },
  };
  await setSetting('media', media);
  res.json({ ok: true, media });
});

// ── Inbox: contact messages ────────────────────────────────────────────────
router.get('/messages', async (req, res) => {
  res.json(await q('SELECT * FROM messages ORDER BY created_at DESC, id DESC'));
});

router.patch('/messages/:id', async (req, res) => {
  await q('UPDATE messages SET is_read=? WHERE id=?', [req.body?.is_read ? 1 : 0, num(req.params.id)]);
  res.json({ ok: true });
});

router.delete('/messages/:id', async (req, res) => {
  await q('DELETE FROM messages WHERE id=?', [num(req.params.id)]);
  res.json({ ok: true });
});

// ── Inbox: applications ────────────────────────────────────────────────────
router.get('/applications', async (req, res) => {
  res.json(await q('SELECT * FROM applications ORDER BY created_at DESC, id DESC'));
});

router.patch('/applications/:id', async (req, res) => {
  await q('UPDATE applications SET is_read=? WHERE id=?', [req.body?.is_read ? 1 : 0, num(req.params.id)]);
  res.json({ ok: true });
});

router.delete('/applications/:id', async (req, res) => {
  await q('DELETE FROM applications WHERE id=?', [num(req.params.id)]);
  res.json({ ok: true });
});

// ── Dashboard counts ───────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const [m, a, p, j, c] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM messages WHERE is_read=0'),
    one('SELECT COUNT(*) AS n FROM applications WHERE is_read=0'),
    one('SELECT COUNT(*) AS n FROM publications'),
    one('SELECT COUNT(*) AS n FROM positions'),
    one('SELECT COUNT(*) AS n FROM companies'),
  ]);
  res.json({
    unreadMessages: Number(m.n), unreadApplications: Number(a.n),
    publications: Number(p.n), positions: Number(j.n), companies: Number(c.n),
  });
});

export default router;
