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
      description TEXT,
      color      TEXT,
      icon       TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS links (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      url        TEXT    NOT NULL,
      icon_url   TEXT,
      screenshot_url TEXT,
      screenshot_status TEXT NOT NULL DEFAULT 'skipped',
      screenshot_updated_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tags (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      source     TEXT    NOT NULL DEFAULT 'manual',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS link_tags (
      link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (link_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL DEFAULT 'Neue Notiz',
      content    TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS note_folders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id  INTEGER REFERENCES note_folders(id) ON DELETE CASCADE,
      title      TEXT    NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dashboard_sections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      icon       TEXT,
      layout     TEXT    NOT NULL DEFAULT '{}',
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
        show_address INTEGER NOT NULL DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS dashboard_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id  INTEGER NOT NULL REFERENCES dashboard_sections(id) ON DELETE CASCADE,
      item_type   TEXT    NOT NULL CHECK (item_type IN ('tile', 'widget')),
      item_id     INTEGER NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      layout      TEXT    NOT NULL DEFAULT '{}',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS widgets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      type          TEXT    NOT NULL,
      title         TEXT    NOT NULL,
      config_json   TEXT    NOT NULL DEFAULT '{}',
      layout_json   TEXT    NOT NULL DEFAULT '{}',
      section_id    INTEGER REFERENCES dashboard_sections(id) ON DELETE SET NULL,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      is_enabled    INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS widget_secrets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      widget_id  INTEGER NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
      key        TEXT    NOT NULL,
      value      TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(widget_id, key)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      action      TEXT    NOT NULL,
      target_type TEXT    NOT NULL,
      target_id   TEXT,
      payload     TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS logo_cache (
      cache_key   TEXT PRIMARY KEY,
      result_json TEXT NOT NULL,
      expires_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_boards (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      description   TEXT    NOT NULL DEFAULT '',
      icon          TEXT,
      color         TEXT,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_board_columns (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id      INTEGER NOT NULL REFERENCES workspace_boards(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL,
      color         TEXT,
      kind          TEXT    NOT NULL DEFAULT 'custom',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      is_archived   INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_labels (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL UNIQUE,
      color         TEXT    NOT NULL DEFAULT '#06b6d4',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_tags (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL UNIQUE,
      source        TEXT    NOT NULL DEFAULT 'manual',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_task_labels (
      task_id       INTEGER NOT NULL REFERENCES workspace_tasks(id) ON DELETE CASCADE,
      label_id      INTEGER NOT NULL REFERENCES workspace_labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    );

    CREATE TABLE IF NOT EXISTS workspace_task_tags (
      task_id       INTEGER NOT NULL REFERENCES workspace_tasks(id) ON DELETE CASCADE,
      tag_id        INTEGER NOT NULL REFERENCES workspace_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS workspace_checklists (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id       INTEGER NOT NULL REFERENCES workspace_tasks(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL DEFAULT 'Checklist',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_checklist_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id  INTEGER NOT NULL REFERENCES workspace_checklists(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL,
      is_done       INTEGER NOT NULL DEFAULT 0,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS workspace_projects (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      body          TEXT    NOT NULL DEFAULT '',
      status        TEXT    NOT NULL DEFAULT 'backlog',
      priority      TEXT    NOT NULL DEFAULT 'medium',
      start_date    TEXT,
      due_date      TEXT,
      tags          TEXT    NOT NULL DEFAULT '[]',
      icon          TEXT,
      color         TEXT,
      custom_fields TEXT    NOT NULL DEFAULT '{}',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_tasks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id    INTEGER REFERENCES workspace_projects(id) ON DELETE SET NULL,
      parent_id     INTEGER REFERENCES workspace_tasks(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL,
      body          TEXT    NOT NULL DEFAULT '',
      status        TEXT    NOT NULL DEFAULT 'todo',
      priority      TEXT    NOT NULL DEFAULT 'medium',
      start_date    TEXT,
      due_date      TEXT,
      tags          TEXT    NOT NULL DEFAULT '[]',
      custom_fields TEXT    NOT NULL DEFAULT '{}',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_wiki_pages (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      body          TEXT    NOT NULL DEFAULT '',
      tags          TEXT    NOT NULL DEFAULT '[]',
      custom_fields TEXT    NOT NULL DEFAULT '{}',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_wiki_books (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      description   TEXT    NOT NULL DEFAULT '',
      icon          TEXT,
      color         TEXT,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_wiki_chapters (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id       INTEGER NOT NULL REFERENCES workspace_wiki_books(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL,
      description   TEXT    NOT NULL DEFAULT '',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_dependencies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL CHECK (source_type IN ('project', 'task')),
      source_id   INTEGER NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('project', 'task')),
      target_id   INTEGER NOT NULL,
      kind        TEXT NOT NULL DEFAULT 'blocks',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_type, source_id, target_type, target_id, kind)
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

  if (!columnExists("tiles", "show_address")) {
    db.exec("ALTER TABLE tiles ADD COLUMN show_address INTEGER NOT NULL DEFAULT 1");
  }

  if (!columnExists("dashboard_sections", "icon")) {
    db.exec("ALTER TABLE dashboard_sections ADD COLUMN icon TEXT");
  }

  if (!columnExists("dashboard_sections", "layout")) {
    db.exec("ALTER TABLE dashboard_sections ADD COLUMN layout TEXT NOT NULL DEFAULT '{}'");
  }

  db.exec("UPDATE tiles SET provider = 'none' WHERE provider IS NULL OR provider = ''");

  if (!columnExists("sections", "description")) {
    db.exec("ALTER TABLE sections ADD COLUMN description TEXT");
  }

  if (!columnExists("sections", "color")) {
    db.exec("ALTER TABLE sections ADD COLUMN color TEXT");
  }

  if (!columnExists("sections", "icon")) {
    db.exec("ALTER TABLE sections ADD COLUMN icon TEXT");
  }

  if (!columnExists("links", "description")) {
    db.exec("ALTER TABLE links ADD COLUMN description TEXT");
  }

  if (!columnExists("links", "image_url")) {
    db.exec("ALTER TABLE links ADD COLUMN image_url TEXT");
  }

  if (!columnExists("links", "note")) {
    db.exec("ALTER TABLE links ADD COLUMN note TEXT");
  }

  if (!columnExists("links", "is_favorite")) {
    db.exec("ALTER TABLE links ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0");
  }

  if (!columnExists("links", "is_archived")) {
    db.exec("ALTER TABLE links ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0");
  }

  if (!columnExists("links", "is_read")) {
    db.exec("ALTER TABLE links ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0");
  }

  if (!columnExists("links", "created_at")) {
    db.exec("ALTER TABLE links ADD COLUMN created_at TEXT");
    db.exec("UPDATE links SET created_at = datetime('now') WHERE created_at IS NULL");
  }

  if (!columnExists("links", "updated_at")) {
    db.exec("ALTER TABLE links ADD COLUMN updated_at TEXT");
    db.exec("UPDATE links SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL");
  }

  if (!columnExists("links", "screenshot_url")) {
    db.exec("ALTER TABLE links ADD COLUMN screenshot_url TEXT");
  }

  if (!columnExists("links", "screenshot_status")) {
    db.exec("ALTER TABLE links ADD COLUMN screenshot_status TEXT NOT NULL DEFAULT 'skipped'");
  }

  if (!columnExists("links", "screenshot_updated_at")) {
    db.exec("ALTER TABLE links ADD COLUMN screenshot_updated_at TEXT");
  }

  if (!columnExists("notes", "folder_id")) {
    db.exec("ALTER TABLE notes ADD COLUMN folder_id INTEGER REFERENCES note_folders(id) ON DELETE SET NULL");
  }

  if (!columnExists("notes", "tags")) {
    db.exec("ALTER TABLE notes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
  }

  if (!columnExists("notes", "is_pinned")) {
    db.exec("ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
  }

  if (!columnExists("notes", "is_archived")) {
    db.exec("ALTER TABLE notes ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0");
  }

  if (!columnExists("notes", "sort_order")) {
    db.exec("ALTER TABLE notes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  }

  if (!columnExists("notes", "created_at")) {
    db.exec("ALTER TABLE notes ADD COLUMN created_at TEXT");
    db.exec("UPDATE notes SET created_at = COALESCE(updated_at, datetime('now')) WHERE created_at IS NULL");
  }


  if (!columnExists("workspace_tasks", "board_id")) {
    db.exec("ALTER TABLE workspace_tasks ADD COLUMN board_id INTEGER REFERENCES workspace_boards(id) ON DELETE SET NULL");
  }

  if (!columnExists("workspace_tasks", "column_id")) {
    db.exec("ALTER TABLE workspace_tasks ADD COLUMN column_id INTEGER REFERENCES workspace_board_columns(id) ON DELETE SET NULL");
  }

  if (!columnExists("workspace_wiki_pages", "book_id")) {
    db.exec("ALTER TABLE workspace_wiki_pages ADD COLUMN book_id INTEGER REFERENCES workspace_wiki_books(id) ON DELETE SET NULL");
  }

  if (!columnExists("workspace_wiki_pages", "chapter_id")) {
    db.exec("ALTER TABLE workspace_wiki_pages ADD COLUMN chapter_id INTEGER REFERENCES workspace_wiki_chapters(id) ON DELETE SET NULL");
  }

  if (!columnExists("workspace_wiki_pages", "sort_order")) {
    db.exec("ALTER TABLE workspace_wiki_pages ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  }

  const defaultWikiBook = db
    .prepare("SELECT id FROM workspace_wiki_books ORDER BY sort_order ASC, id ASC LIMIT 1")
    .get() as { id: number } | undefined;
  const defaultWikiBookId =
    defaultWikiBook?.id ??
    Number(
      db
        .prepare("INSERT INTO workspace_wiki_books (title, description, icon, color, sort_order) VALUES ('Wiki', 'Default wiki book', 'book-open', '#8b5cf6', 0)")
        .run().lastInsertRowid
    );

  db.prepare("UPDATE workspace_wiki_pages SET book_id = ? WHERE book_id IS NULL").run(defaultWikiBookId);

  const defaultBoard = db
    .prepare("SELECT id FROM workspace_boards ORDER BY sort_order ASC, id ASC LIMIT 1")
    .get() as { id: number } | undefined;
  const defaultBoardId =
    defaultBoard?.id ??
    Number(
      db
        .prepare("INSERT INTO workspace_boards (title, description, icon, color, sort_order) VALUES ('TheDash Board', 'Default workspace board', 'kanban', '#06b6d4', 0)")
        .run().lastInsertRowid
    );

  const defaultColumns = [
    { title: "TheDash Box", kind: "backlog", color: "#64748b", order: 0 },
    { title: "Offen", kind: "todo", color: "#3b82f6", order: 1 },
    { title: "In Arbeit", kind: "doing", color: "#06b6d4", order: 2 },
    { title: "Blockiert", kind: "blocked", color: "#f43f5e", order: 3 },
    { title: "Erledigt", kind: "done", color: "#22c55e", order: 4 },
  ];
  const columnCount = db
    .prepare("SELECT COUNT(*) AS count FROM workspace_board_columns WHERE board_id = ?")
    .get(defaultBoardId) as { count: number };
  if (columnCount.count === 0) {
    const insertColumn = db.prepare("INSERT INTO workspace_board_columns (board_id, title, color, kind, sort_order) VALUES (?, ?, ?, ?, ?)");
    defaultColumns.forEach((column) => insertColumn.run(defaultBoardId, column.title, column.color, column.kind, column.order));
  }

  db.exec(`
    UPDATE workspace_tasks
    SET board_id = ${defaultBoardId}
    WHERE board_id IS NULL;
  `);

  const seededColumns = db
    .prepare("SELECT id, kind FROM workspace_board_columns WHERE board_id = ? ORDER BY sort_order ASC, id ASC")
    .all(defaultBoardId) as Array<{ id: number; kind: string }>;
  const fallbackColumnId = seededColumns[0]?.id;
  seededColumns.forEach((column) => {
    db.prepare("UPDATE workspace_tasks SET column_id = ? WHERE board_id = ? AND column_id IS NULL AND status = ?").run(column.id, defaultBoardId, column.kind);
  });
  if (fallbackColumnId) {
    db.prepare("UPDATE workspace_tasks SET column_id = ? WHERE board_id = ? AND column_id IS NULL").run(fallbackColumnId, defaultBoardId);
  }
  // Seed default settings
  const insert = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  insert.run("theme", "dark");
  insert.run("language", "de");
  insert.run("widgetStyle", "card");

  const home = db
    .prepare("SELECT id FROM dashboard_sections ORDER BY sort_order ASC, id ASC LIMIT 1")
    .get() as { id: number } | undefined;
  const homeId =
    home?.id ??
    Number(
      db
        .prepare("INSERT INTO dashboard_sections (title, icon, sort_order, layout) VALUES ('Home', 'logo:dashboard', 0, '{}')")
        .run().lastInsertRowid
    );

  db.exec(`
    INSERT OR IGNORE INTO dashboard_items (section_id, item_type, item_id, sort_order, layout)
    SELECT ${homeId}, 'tile', id, sort_order, '{}'
    FROM tiles;

    INSERT OR IGNORE INTO dashboard_items (section_id, item_type, item_id, sort_order, layout)
    SELECT ${homeId}, 'widget', id, sort_order, '{}'
    FROM widgets;
  `);

  // Migration: make links.section_id nullable (was NOT NULL)
  const linksTableInfo = db.prepare("PRAGMA table_info(links)").all() as Array<{
    name: string; notnull: number;
  }>;
  const sectionIdCol = linksTableInfo.find((c) => c.name === "section_id");
  if (sectionIdCol && sectionIdCol.notnull === 1) {
    db.exec("PRAGMA foreign_keys = OFF");
    db.exec(`
      CREATE TABLE IF NOT EXISTS links_v2 (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id  INTEGER REFERENCES sections(id) ON DELETE SET NULL,
        name        TEXT    NOT NULL,
        url         TEXT    NOT NULL,
        icon_url    TEXT,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        image_url   TEXT,
        screenshot_url TEXT,
        screenshot_status TEXT NOT NULL DEFAULT 'skipped',
        screenshot_updated_at TEXT,
        note        TEXT,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        is_read     INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT,
        updated_at  TEXT
      );
    `);
    db.exec(`
      INSERT INTO links_v2 (id, section_id, name, url, icon_url, sort_order,
        description, image_url, screenshot_url, screenshot_status, screenshot_updated_at,
        note, is_favorite, is_archived, is_read, created_at, updated_at)
      SELECT id, section_id, name, url, icon_url, sort_order,
        description, image_url, screenshot_url, screenshot_status, screenshot_updated_at,
        note, is_favorite, is_archived, COALESCE(is_read, 0), created_at, updated_at
      FROM links;
    `);
    db.exec("DROP TABLE links");
    db.exec("ALTER TABLE links_v2 RENAME TO links");
    db.exec("PRAGMA foreign_keys = ON");
  }

  // One-time cleanup: remove orphaned tags left over from previous deletes
  db.exec("DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM link_tags)");

  console.log("Database migrations complete.");
}

