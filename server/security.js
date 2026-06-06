// Lightweight security helpers (no extra dependencies).

// Conservative security headers. No strict CSP because the site intentionally
// uses inline <style>/<script>; we still set the cheap, safe defenses.
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

// Simple fixed-window in-memory rate limiter, keyed by client IP. Suitable for
// a single-instance deploy (Hostinger Node app). Protects form + login routes.
export function rateLimit({ windowMs = 60_000, max = 10, message = 'too_many_requests' } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }
  // Periodic cleanup so the map does not grow unbounded.
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of hits) if (rec.resetAt <= now) hits.delete(ip);
  }, windowMs).unref?.();

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    let rec = hits.get(ip);
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(ip, rec);
    }
    rec.count += 1;
    if (rec.count > max) {
      res.setHeader('Retry-After', Math.ceil((rec.resetAt - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// Rejects submissions where the hidden honeypot field was filled (bots).
export function honeypot(field = 'company_website') {
  return (req, res, next) => {
    if (req.body && String(req.body[field] || '').trim() !== '') {
      // Pretend success so bots don't learn they were caught.
      return res.json({ ok: true });
    }
    next();
  };
}
