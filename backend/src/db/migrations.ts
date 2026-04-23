import db from "./client";

function tableExists(table: string): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get(table);
  return Boolean(row);
}

function columnExists(table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  return columns.some((entry) => entry.name === column);
}

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS links (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      url        TEXT    NOT NULL,
      icon_url   TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL DEFAULT 'Neue Notiz',
      content    TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dashboard_sections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

  `);

  if (!tableExists("tiles")) {
    db.exec(`
      CREATE TABLE tiles (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT    NOT NULL,
        url          TEXT    NOT NULL,
        icon_url     TEXT,
        style        TEXT    NOT NULL DEFAULT 'card',
        api_url      TEXT,
        api_key      TEXT,
        provider     TEXT    NOT NULL DEFAULT 'none',
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_cards (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id   INTEGER NOT NULL REFERENCES dashboard_sections(id) ON DELETE CASCADE,
      title        TEXT    NOT NULL,
      description  TEXT,
      tile_id      INTEGER REFERENCES tiles(id) ON DELETE SET NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if (columnExists("tiles", "api_endpoint")) {
    const hasApiUrl = columnExists("tiles", "api_url");
    const hasApiKey = columnExists("tiles", "api_key");
    const hasProvider = columnExists("tiles", "provider");
    const apiUrlExpr = hasApiUrl
      ? "COALESCE(api_url, api_endpoint)"
      : "api_endpoint";
    const apiKeyExpr = hasApiKey ? "api_key" : "NULL";
    const providerExpr = hasProvider
      ? "COALESCE(NULLIF(provider, ''), 'none')"
      : "'none'";

    db.exec("PRAGMA foreign_keys = OFF");
    db.exec(`
      CREATE TABLE IF NOT EXISTS tiles_v2 (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT    NOT NULL,
        url          TEXT    NOT NULL,
        icon_url     TEXT,
        style        TEXT    NOT NULL DEFAULT 'card',
        api_url      TEXT,
        api_key      TEXT,
        provider     TEXT    NOT NULL DEFAULT 'none',
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`
      INSERT INTO tiles_v2 (id, name, url, icon_url, style, api_url, api_key, provider, sort_order, created_at)
      SELECT
        id,
        name,
        url,
        icon_url,
        style,
        ${apiUrlExpr},
        ${apiKeyExpr},
        ${providerExpr},
        sort_order,
        created_at
      FROM tiles;
    `);

    db.exec("DROP TABLE tiles");
    db.exec("ALTER TABLE tiles_v2 RENAME TO tiles");
    db.exec("PRAGMA foreign_keys = ON");
  }

  if (!columnExists("tiles", "api_url")) {
    db.exec("ALTER TABLE tiles ADD COLUMN api_url TEXT");
  }

  if (!columnExists("tiles", "api_key")) {
    db.exec("ALTER TABLE tiles ADD COLUMN api_key TEXT");
  }

  if (!columnExists("tiles", "provider")) {
    db.exec("ALTER TABLE tiles ADD COLUMN provider TEXT NOT NULL DEFAULT 'none'");
  }

  db.exec("UPDATE tiles SET provider = 'none' WHERE provider IS NULL OR provider = ''");

  // Seed default settings
  const insert = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  insert.run("theme", "dark");
  insert.run("language", "de");
  insert.run("widgetStyle", "card");

  console.log("Database migrations complete.");
}
