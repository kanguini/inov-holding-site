# INOV Holding Corporate — Institutional Website + Admin

Bilingual (EN/PT) institutional website for **INOV Holding Corporate**, an Angolan
holding company headquartered in Luanda and active on three continents, now with a
self-hosted content/admin backend.

*Intelligent Management, Sustainable Growth.*

## Overview

- **Bilingual** EN/PT, switchable in-page (no reload).
- **Client-side routing** across sections: Home, The Group, Sectors, Presence,
  Governance, Sustainability, **Insights**, **Careers**, Contact.
- **Data-driven**: publications, group companies, open positions and site images
  are loaded from the API (`GET /api/content`) with a graceful fallback to built-in
  defaults when no API is present (e.g. the static GitHub Pages mirror).
- **Admin panel** at `/admin`: manage publications (EN+PT), careers, group company
  logos (grayscale → colour on hover), hero/sector images, and read the contact
  messages and job applications inbox.
- **Email notifications** to the team on new messages/applications (SMTP).
- **SEO-ready**: Open Graph, Twitter Card, canonical URL and `Organization` JSON-LD.

## Structure

```
.
├── index.html          # Public site (HTML + CSS + JS inline)
├── admin.html          # Admin panel (HTML + CSS + JS inline)
├── server/             # Express API + database/email/auth/uploads
│   ├── index.js        # App entry (serves dist/ + /api + /uploads)
│   ├── db.js           # MySQL (prod) / SQLite (local) adapter, schema + seed
│   ├── auth.js         # JWT cookie admin auth
│   ├── email.js        # SMTP notifications (nodemailer)
│   ├── upload.js       # File uploads (CVs, logos, images)
│   ├── shape.js        # DB rows -> frontend data contract
│   └── routes/         # public.js (content + forms), admin.js (CRUD)
├── favicon.svg
├── vite.config.js      # Multi-page build (index + admin) -> dist/
├── .env.example        # Configuration template
└── uploads/            # Uploaded files (runtime; gitignored)
```

## Running locally

```bash
npm install
npm run build      # builds dist/ (index.html + admin.html)
npm start          # starts the server on http://localhost:4321
```

With no `DB_HOST` set, the server uses a zero-config local **SQLite** file
(`data.sqlite`) and seeds the default content + an admin account from
`ADMIN_EMAIL` / `ADMIN_PASSWORD` (see `.env.example`).
Admin panel: `http://localhost:4321/admin`.

`npm run dev` runs the Vite dev server for the frontend only (static fallback data).

## Deployment

### Hostinger (Node.js Web App — recommended, full backend)

1. Create a **MySQL** database in hPanel → Databases → MySQL.
2. Import this Git repository as a Node.js app.
3. Set environment variables (from `.env.example`): `DB_HOST`, `DB_PORT`,
   `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `JWT_SECRET`, and the `SMTP_*` / `MAIL_*` values for notifications.
4. Build command: `npm run build` · Start command: `npm start`.

The schema is created and seeded automatically on first start.

### GitHub Pages (static mirror)

The public site also runs as a pure static page on GitHub Pages — `index.html`
falls back to its built-in default content when `/api/content` is unavailable.
Forms require the backend, so the live site should be the Hostinger deployment.

## Contact

- General: geral@inovholding.ao
- Partnerships: parcerias@inovholding.ao

---

© 2026 INOV Holding Corporate. All rights reserved.
