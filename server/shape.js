// Convert DB rows into the exact shape the frontend (window.INOV) expects,
// so no UI rework is needed when live data replaces the static placeholder.

function paras(text) {
  return String(text || '')
    .split(/\r?\n\s*\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function shapePublication(r) {
  return {
    id: String(r.id),
    date: r.pdate || '',
    cover: r.cover || null,
    cat: { en: r.cat_en || '', pt: r.cat_pt || '' },
    title: { en: r.title_en || '', pt: r.title_pt || '' },
    excerpt: { en: r.excerpt_en || '', pt: r.excerpt_pt || '' },
    body: { en: paras(r.body_en), pt: paras(r.body_pt) },
  };
}

export function shapeCompany(r) {
  return {
    id: String(r.id),
    name: r.name || '',
    word: r.word || r.name || '',
    color: r.color || '#002F55',
    url: r.url || '#',
    logo: r.logo || null,
    cap: { en: r.cap_en || '', pt: r.cap_pt || '' },
  };
}

export function shapePosition(r) {
  return {
    id: String(r.id),
    location: r.location || '',
    title: { en: r.title_en || '', pt: r.title_pt || '' },
    dept: { en: r.dept_en || '', pt: r.dept_pt || '' },
    type: { en: r.type_en || '', pt: r.type_pt || '' },
    summary: { en: r.summary_en || '', pt: r.summary_pt || '' },
  };
}
