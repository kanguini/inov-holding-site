# INOV Holding Corporate — Institutional Website

Bilingual (EN/PT) single-page institutional website for **INOV Holding Corporate**, an Angolan holding company headquartered in Luanda and active on three continents.

*Intelligent Management, Sustainable Growth.*

## Overview

- **Single-file, zero-dependency** static site — no build step, no framework.
- **Bilingual**: English and Portuguese, switchable in-page (no reload).
- **Client-side routing** across 7 sections via URL hash: Home, The Group, Sectors, Presence, Governance, Sustainability, Contact.
- **Responsive** with a mobile navigation menu.
- **SEO-ready**: Open Graph, Twitter Card, canonical URL and `Organization` JSON-LD structured data.

## Structure

```
.
├── index.html     # The entire site (HTML + CSS + JS inline)
├── favicon.svg    # Brand mark
├── .nojekyll      # Disable Jekyll processing on GitHub Pages
└── README.md
```

## Running locally

It is plain HTML — open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

The site is fully static and can be hosted on any static host (GitHub Pages, Netlify, Vercel, Hostinger, etc.). For GitHub Pages, enable Pages on the `main` branch (root) — `.nojekyll` is already included.

## Contact

- General: geral@inovholding.ao
- Partnerships: parcerias@inovholding.ao

---

© 2026 INOV Holding Corporate. All rights reserved.
