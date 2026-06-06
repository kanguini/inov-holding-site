-- ───────────────────────────────────────────────────────────────────────────
-- INOV Holding — MySQL schema (Hostinger / phpMyAdmin)
--
-- You normally DON'T need this file: the Express app auto-creates every table
-- and seeds the default content on first boot (see server/db.js → migrate/seed).
-- It's provided so you can create the structure manually in phpMyAdmin if you
-- prefer, or to inspect/version the production schema.
--
-- Steps in hPanel:
--   1. Databases → MySQL Databases → create an empty database + user, grant all.
--   2. Open phpMyAdmin → select that database → SQL tab → paste this file → Go.
--   3. Set the app env vars (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME …).
--   4. `npm run build && npm start` — the app seeds default content automatically.
--
-- Engine/charset match the mysql2 pool config (utf8mb4).
-- ───────────────────────────────────────────────────────────────────────────

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS publications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pdate VARCHAR(10),
  cover VARCHAR(500),
  cat_en VARCHAR(120), cat_pt VARCHAR(120),
  title_en VARCHAR(300), title_pt VARCHAR(300),
  excerpt_en TEXT, excerpt_pt TEXT,
  body_en TEXT, body_pt TEXT,
  status VARCHAR(20) DEFAULT 'published',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200), word VARCHAR(200),
  color VARCHAR(20), url VARCHAR(500), logo VARCHAR(500),
  cap_en VARCHAR(200), cap_pt VARCHAR(200),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location VARCHAR(200),
  title_en VARCHAR(300), title_pt VARCHAR(300),
  dept_en VARCHAR(120), dept_pt VARCHAR(120),
  type_en VARCHAR(120), type_pt VARCHAR(120),
  summary_en TEXT, summary_pt TEXT,
  status VARCHAR(20) DEFAULT 'open',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200), email VARCHAR(200),
  organisation VARCHAR(200), subject VARCHAR(200),
  message TEXT,
  is_read INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200), email VARCHAR(200),
  position VARCHAR(300), link VARCHAR(500),
  message TEXT, cv VARCHAR(500),
  is_read INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  skey VARCHAR(120) PRIMARY KEY,
  svalue TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
