// ───────────────────────────────────────────────────────────────────────────
// Database layer with a thin dual-driver adapter.
//
//   • No DB_HOST set  -> SQLite (better-sqlite3), zero-config local development.
//   • DB_HOST set     -> MySQL (mysql2/promise), the Hostinger production path.
//
// Both drivers use `?` placeholders, so application queries are portable. The
// only dialect difference handled here is the primary-key / DDL syntax.
// On first run the schema is created and seeded with the same default content
// the static frontend used, so a fresh deploy is never blank.
// ───────────────────────────────────────────────────────────────────────────
import 'dotenv/config';
import bcrypt from 'bcryptjs';

const USE_MYSQL = !!process.env.DB_HOST;

let pool = null; // mysql2 pool
let sdb = null; // better-sqlite3 instance

export async function initDb() {
  if (USE_MYSQL) {
    const mysql = await import('mysql2/promise');
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
    });
    await pool.query('SELECT 1');
  } else {
    const { default: Database } = await import('better-sqlite3');
    sdb = new Database(process.env.SQLITE_PATH || './data.sqlite');
    sdb.pragma('journal_mode = WAL');
  }
  await migrate();
  await seed();
  console.log(`[db] ready (${USE_MYSQL ? 'mysql' : 'sqlite'})`);
}

// SELECT -> array of rows. Other statements -> { insertId, affectedRows }.
export async function q(sql, params = []) {
  if (USE_MYSQL) {
    const [res] = await pool.query(sql, params);
    if (Array.isArray(res)) return res;
    return { insertId: res.insertId, affectedRows: res.affectedRows };
  }
  const stmt = sdb.prepare(sql);
  if (/^\s*select/i.test(sql)) return stmt.all(...params);
  const info = stmt.run(...params);
  return { insertId: Number(info.lastInsertRowid), affectedRows: info.changes };
}

export async function one(sql, params = []) {
  const rows = await q(sql, params);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function migrate() {
  const AI = USE_MYSQL
    ? 'INT AUTO_INCREMENT PRIMARY KEY'
    : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const TS = 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP';

  const tables = [
    `CREATE TABLE IF NOT EXISTS admins (
       id ${AI},
       email VARCHAR(190) UNIQUE,
       password_hash VARCHAR(255),
       ${TS}
     )`,
    `CREATE TABLE IF NOT EXISTS publications (
       id ${AI},
       pdate VARCHAR(10),
       cover VARCHAR(500),
       cat_en VARCHAR(120), cat_pt VARCHAR(120),
       title_en VARCHAR(300), title_pt VARCHAR(300),
       excerpt_en TEXT, excerpt_pt TEXT,
       body_en TEXT, body_pt TEXT,
       status VARCHAR(20) DEFAULT 'published',
       sort_order INT DEFAULT 0,
       ${TS}
     )`,
    `CREATE TABLE IF NOT EXISTS companies (
       id ${AI},
       name VARCHAR(200), word VARCHAR(200),
       color VARCHAR(20), url VARCHAR(500), logo VARCHAR(500),
       cap_en VARCHAR(200), cap_pt VARCHAR(200),
       sort_order INT DEFAULT 0,
       ${TS}
     )`,
    `CREATE TABLE IF NOT EXISTS positions (
       id ${AI},
       location VARCHAR(200),
       title_en VARCHAR(300), title_pt VARCHAR(300),
       dept_en VARCHAR(120), dept_pt VARCHAR(120),
       type_en VARCHAR(120), type_pt VARCHAR(120),
       summary_en TEXT, summary_pt TEXT,
       status VARCHAR(20) DEFAULT 'open',
       sort_order INT DEFAULT 0,
       ${TS}
     )`,
    `CREATE TABLE IF NOT EXISTS messages (
       id ${AI},
       name VARCHAR(200), email VARCHAR(200),
       organisation VARCHAR(200), subject VARCHAR(200),
       message TEXT,
       is_read INT DEFAULT 0,
       ${TS}
     )`,
    `CREATE TABLE IF NOT EXISTS applications (
       id ${AI},
       name VARCHAR(200), email VARCHAR(200),
       position VARCHAR(300), link VARCHAR(500),
       message TEXT, cv VARCHAR(500),
       is_read INT DEFAULT 0,
       ${TS}
     )`,
    `CREATE TABLE IF NOT EXISTS settings (
       skey VARCHAR(120) PRIMARY KEY,
       svalue TEXT
     )`,
  ];
  for (const ddl of tables) await q(ddl);

  // Additive migrations: columns added after a table already shipped.
  await addColumnIfMissing('companies', 'desc_en', 'TEXT');
  await addColumnIfMissing('companies', 'desc_pt', 'TEXT');
}

// Adds a column only when it is missing — safe to run on every boot, on a
// fresh DB or one created before the column existed (MySQL and SQLite).
async function addColumnIfMissing(table, col, type) {
  if (USE_MYSQL) {
    const rows = await q(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [table, col]
    );
    if (!rows.length) await q(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  } else {
    const rows = await q(`PRAGMA table_info(${table})`);
    if (!rows.some((r) => r.name === col)) await q(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  }
}

// Short, factual descriptions per company — used to seed a fresh DB and to
// backfill installations that predate the description field. Editable in admin.
const COMPANY_DESCS = {
  'Meteoro': {
    en: 'Integrated construction, logistics, transport and facilities management — serving the group’s own platforms and external clients with the scale and cadence that long-term infrastructure demands.',
    pt: 'Construção, logística, transporte e gestão de instalações integradas — ao serviço das próprias plataformas do grupo e de clientes externos, com a escala e a cadência que a infra-estrutura de longo prazo exige.',
  },
  'Hexa': {
    en: 'A licensed insurance broker supervised by ARSEG, acting as its clients’ risk-intelligence partner: it analyses, structures and negotiates cover — and widens the market through insurance literacy.',
    pt: 'Corretora de seguros licenciada e supervisionada pela ARSEG, parceira de inteligência de risco dos seus clientes: analisa, estrutura e negoceia coberturas — e alarga o mercado através da literacia seguradora.',
  },
  'Adventure': {
    en: 'Communication and corporate events — strategy, brand activations and event production, with reach across the African continent.',
    pt: 'Comunicação e eventos corporativos — estratégia, activações de marca e produção de eventos, com alcance em todo o continente africano.',
  },
  'Factory Ideas': {
    en: 'Graphic production and stand construction — turning ideas into physical brand presence, from print to built environments.',
    pt: 'Produção gráfica e construção de stands — transforma ideias em presença física de marca, do impresso aos ambientes construídos.',
  },
  'Publink': {
    en: 'Digital out-of-home media — billboard and screen rental in high-traffic locations that amplify brands across the city.',
    pt: 'Media exterior digital — aluguer de outdoors e ecrãs em locais de grande tráfego que amplificam as marcas pela cidade.',
  },
};

async function seed() {
  // Admin from env (created once; password changes are done in-app afterwards).
  const email = (process.env.ADMIN_EMAIL || 'admin@inovholding.com').toLowerCase();
  const existing = await one('SELECT id FROM admins WHERE email = ?', [email]);
  if (!existing) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'change-me-now', 10);
    await q('INSERT INTO admins (email, password_hash) VALUES (?, ?)', [email, hash]);
    console.log(`[db] seeded admin: ${email}`);
  }

  const pubCount = await one('SELECT COUNT(*) AS n FROM publications');
  if (Number(pubCount.n) === 0) {
    const pubs = [
      ['2026-05-20', 'Insight', 'Análise',
        'Why the next reference companies will also be born in Africa',
        'Porque as próximas empresas de referência também nascerão em África',
        'Demographics, urbanisation and the formalisation of markets are aligning. The opportunity is structural — for those with the discipline to build for decades.',
        'Demografia, urbanização e formalização dos mercados estão a alinhar-se. A oportunidade é estrutural — para quem tem a disciplina de construir por décadas.',
        'Across the strategic sectors of the economy, the same pattern repeats: demand is structural, execution is scarce, and trust is the real barrier to entry.\n\nINOV was designed for exactly this environment — to allocate capital with conviction and to operate with the rigour of an institution.\n\nThe companies that organise the formalisation of markets will capture value durably. That is our thesis, and it is why we build for generations rather than cycles.',
        'Nos sectores estratégicos da economia repete-se o mesmo padrão: a procura é estrutural, a execução é escassa e a confiança é a verdadeira barreira à entrada.\n\nA INOV foi desenhada exactamente para este ambiente — para alocar capital com convicção e operar com o rigor de uma instituição.\n\nAs empresas que organizam a formalização dos mercados capturam valor de forma duradoura. Essa é a nossa tese, e é por isso que construímos para gerações e não para ciclos.'],
      ['2026-04-08', 'Press', 'Imprensa',
        'INOV expands its creative platform across East Africa',
        'INOV expande a sua plataforma criativa na África Oriental',
        'Events delivered in Kenya, Mozambique and Ethiopia mark a new stage in the group’s internationalisation.',
        'Eventos realizados no Quénia, Moçambique e Etiópia marcam uma nova etapa na internacionalização do grupo.',
        'The communication and creative-industries platform — the sector where the group was born — continues to lead its internationalisation, with representation in South Africa and projects across the continent.\n\nThis expansion reflects a simple conviction: the economy of attention has no borders.',
        'A plataforma de comunicação e indústrias criativas — o sector onde o grupo nasceu — continua a liderar a sua internacionalização, com representação na África do Sul e projectos por todo o continente.\n\nEsta expansão reflecte uma convicção simples: a economia da atenção não tem fronteiras.'],
      ['2026-02-15', 'Report', 'Relatório',
        'Governance as a competitive advantage',
        'A governação como vantagem competitiva',
        'In markets where informality is the norm, rigorous governance is a commercial differentiator — not a cost.',
        'Em mercados onde a informalidade é a norma, a governação rigorosa é um diferenciador comercial — não um custo.',
        'INOV was designed to earn the confidence of regulators, partners and investors. Consolidated reporting, legal rigour and clear accountability are not overhead — they are how trust is built.\n\nIn a region where trust is scarce, discipline compounds.',
        'A INOV foi desenhada para inspirar a confiança de reguladores, parceiros e investidores. O reporte consolidado, o rigor legal e a prestação de contas clara não são um custo — são a forma como se constrói confiança.\n\nNuma região onde a confiança é escassa, a disciplina compõe-se ao longo do tempo.'],
    ];
    let ord = 0;
    for (const p of pubs) {
      await q(
        `INSERT INTO publications
           (pdate, cat_en, cat_pt, title_en, title_pt, excerpt_en, excerpt_pt, body_en, body_pt, status, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?, 'published', ?)`,
        [...p, ord++]
      );
    }
    console.log('[db] seeded publications');
  }

  const compCount = await one('SELECT COUNT(*) AS n FROM companies');
  if (Number(compCount.n) === 0) {
    const comps = [
      ['Meteoro', 'Meteoro', '#C8102E', 'Infrastructure & Logistics', 'Infra-estrutura & Logística'],
      ['Hexa', 'Hexa', '#1D4ED8', 'Insurance Brokerage', 'Corretagem de Seguros'],
      ['Adventure', 'Adventure', '#0EA5A4', 'Communication & Events', 'Comunicação & Eventos'],
      ['Factory Ideas', 'Factory Ideas', '#F59E0B', 'Graphic Production', 'Produção Gráfica'],
      ['Publink', 'Publink', '#10B981', 'Out-of-Home Media', 'Media Exterior'],
    ];
    let ord = 0;
    for (const c of comps) {
      const d = COMPANY_DESCS[c[0]] || { en: '', pt: '' };
      await q(
        `INSERT INTO companies (name, word, color, url, cap_en, cap_pt, desc_en, desc_pt, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [c[0], c[1], c[2], '#', c[3], c[4], d.en, d.pt, ord++]
      );
    }
    console.log('[db] seeded companies');
  }

  // Backfill descriptions for companies seeded before the field existed.
  // Only fills empties — never clobbers a description edited in admin.
  for (const [name, d] of Object.entries(COMPANY_DESCS)) {
    await q(
      `UPDATE companies SET desc_en=?, desc_pt=? WHERE name=? AND (desc_en IS NULL OR desc_en='')`,
      [d.en, d.pt, name]
    );
  }

  const posCount = await one('SELECT COUNT(*) AS n FROM positions');
  if (Number(posCount.n) === 0) {
    const pos = [
      ['Luanda, AO', 'Group Financial Controller', 'Controller Financeiro do Grupo', 'Finance', 'Finanças', 'Full-time', 'Tempo inteiro', 'Consolidated reporting across the group’s platforms.', 'Reporte consolidado das plataformas do grupo.'],
      ['Luanda, AO', 'Platform Operations Manager — Logistics', 'Gestor de Operações — Logística', 'Operations', 'Operações', 'Full-time', 'Tempo inteiro', 'Run integrated logistics for Meteoro and group clients.', 'Gerir a logística integrada da Meteoro e clientes do grupo.'],
    ];
    let ord = 0;
    for (const p of pos) {
      await q(
        `INSERT INTO positions
           (location, title_en, title_pt, dept_en, dept_pt, type_en, type_pt, summary_en, summary_pt, status, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?, 'open', ?)`,
        [...p, ord++]
      );
    }
    console.log('[db] seeded positions');
  }

  // Default media settings.
  const media = await one('SELECT svalue FROM settings WHERE skey = ?', ['media']);
  if (!media) {
    const def = { cover: null, coverFit: 'cover', coverPos: '50% 50%', sectors: { infrastructure: null, finance: null, digital: null, creative: null } };
    await setSetting('media', def);
  }
}

export async function getSetting(key) {
  const row = await one('SELECT svalue FROM settings WHERE skey = ?', [key]);
  if (!row) return null;
  try { return JSON.parse(row.svalue); } catch { return row.svalue; }
}

export async function setSetting(key, value) {
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  const exists = await one('SELECT skey FROM settings WHERE skey = ?', [key]);
  if (exists) await q('UPDATE settings SET svalue = ? WHERE skey = ?', [v, key]);
  else await q('INSERT INTO settings (skey, svalue) VALUES (?, ?)', [key, v]);
}
