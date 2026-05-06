import { Router } from "express";
import db from "../db/client";

const router = Router();

router.get("/export", (_req, res) => {
  const settings = db.prepare("SELECT key, value FROM settings").all();
  const tiles = db.prepare("SELECT * FROM tiles ORDER BY sort_order").all();
  const sections = db.prepare("SELECT * FROM sections ORDER BY sort_order").all();
  const links = db.prepare("SELECT * FROM links ORDER BY sort_order").all();
  const tags = db.prepare("SELECT * FROM tags ORDER BY name").all();
  const linkTags = db.prepare("SELECT * FROM link_tags ORDER BY link_id, tag_id").all();
  const notes = db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all();
  const noteFolders = db.prepare("SELECT * FROM note_folders ORDER BY sort_order").all();
  const dashboardSections = db
    .prepare("SELECT * FROM dashboard_sections ORDER BY sort_order")
    .all();
  const dashboardCards = db
    .prepare("SELECT * FROM dashboard_cards ORDER BY sort_order")
    .all();
  const dashboardItems = db
    .prepare("SELECT * FROM dashboard_items ORDER BY section_id, sort_order")
    .all();
  const widgets = db.prepare("SELECT * FROM widgets ORDER BY sort_order").all();
  const widgetSecrets = db
    .prepare("SELECT widget_id, key, '***' AS value FROM widget_secrets ORDER BY widget_id, key")
    .all();
  const auditLog = db
    .prepare("SELECT * FROM audit_log ORDER BY created_at DESC, id DESC LIMIT 500")
    .all();
  const workspaceProjects = db.prepare("SELECT * FROM workspace_projects ORDER BY updated_at DESC").all();
  const workspaceTasks = db.prepare("SELECT * FROM workspace_tasks ORDER BY sort_order ASC").all();
  const workspaceWikiBooks = db.prepare("SELECT * FROM workspace_wiki_books ORDER BY sort_order ASC").all();
  const workspaceWikiChapters = db.prepare("SELECT * FROM workspace_wiki_chapters ORDER BY book_id ASC, sort_order ASC").all();
  const workspaceWikiPages = db.prepare("SELECT * FROM workspace_wiki_pages ORDER BY updated_at DESC").all();
  const workspaceDependencies = db.prepare("SELECT * FROM workspace_dependencies ORDER BY id ASC").all();

  res.setHeader("Content-Disposition", 'attachment; filename="thedash-backup.json"');
  res.json({
    settings,
    tiles,
    sections,
    links,
    tags,
    linkTags,
    notes,
    noteFolders,
    dashboardSections,
    dashboardCards,
    dashboardItems,
    widgets,
    widgetSecrets,
    auditLog,
    workspaceProjects,
    workspaceTasks,
    workspaceWikiBooks,
    workspaceWikiChapters,
    workspaceWikiPages,
    workspaceDependencies,
  });
});

router.post("/import", (req, res) => {
  const {
    settings,
    tiles,
    sections,
    links,
    tags,
    linkTags,
    notes,
    noteFolders,
    dashboardSections,
    dashboardCards,
    dashboardItems,
    widgets,
    workspaceProjects,
    workspaceTasks,
    workspaceWikiBooks,
    workspaceWikiChapters,
    workspaceWikiPages,
    workspaceDependencies,
  } = req.body;

  const doImport = db.transaction(() => {
    db.prepare("DELETE FROM links").run();
    db.prepare("DELETE FROM link_tags").run();
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM sections").run();
    db.prepare("DELETE FROM dashboard_cards").run();
    db.prepare("DELETE FROM dashboard_items").run();
    db.prepare("DELETE FROM dashboard_sections").run();
    db.prepare("DELETE FROM widgets").run();
    db.prepare("DELETE FROM widget_secrets").run();
    db.prepare("DELETE FROM workspace_dependencies").run();
    db.prepare("DELETE FROM workspace_tasks").run();
    db.prepare("DELETE FROM workspace_wiki_pages").run();
    db.prepare("DELETE FROM workspace_wiki_chapters").run();
    db.prepare("DELETE FROM workspace_wiki_books").run();
    db.prepare("DELETE FROM workspace_projects").run();
    db.prepare("DELETE FROM note_folders").run();
    db.prepare("DELETE FROM tiles").run();
    db.prepare("DELETE FROM notes").run();
    db.prepare("DELETE FROM settings").run();

    for (const s of settings ?? []) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(s.key, s.value);
    }

    for (const t of tiles ?? []) {
      db.prepare(
        "INSERT INTO tiles (id, name, url, icon_url, style, api_url, api_key, provider, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        t.id,
        t.name,
        t.url,
        t.icon_url,
        t.style,
        t.api_url ?? t.api_endpoint ?? null,
        t.api_key ?? null,
        t.provider ?? "none",
        t.sort_order,
        t.created_at
      );
    }

    for (const s of sections ?? []) {
      db.prepare("INSERT INTO sections (id, title, sort_order) VALUES (?, ?, ?)").run(
        s.id,
        s.title,
        s.sort_order
      );
    }

    for (const l of links ?? []) {
      db.prepare(
        `INSERT INTO links
          (id, section_id, name, url, icon_url, image_url, screenshot_url, screenshot_status,
           screenshot_updated_at, description, note, is_favorite, is_archived, is_read, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        l.id,
        l.section_id,
        l.name,
        l.url,
        l.icon_url,
        l.image_url ?? null,
        l.screenshot_url ?? null,
        l.screenshot_status ?? "skipped",
        l.screenshot_updated_at ?? null,
        l.description ?? null,
        l.note ?? null,
        l.is_favorite ? 1 : 0,
        l.is_archived ? 1 : 0,
        l.is_read ? 1 : 0,
        l.sort_order,
        l.created_at ?? new Date().toISOString(),
        l.updated_at ?? new Date().toISOString()
      );
    }

    for (const tag of tags ?? []) {
      db.prepare(
        "INSERT INTO tags (id, name, source, created_at) VALUES (?, ?, ?, ?)"
      ).run(tag.id, tag.name, tag.source ?? "manual", tag.created_at ?? new Date().toISOString());
    }

    for (const linkTag of linkTags ?? []) {
      db.prepare(
        "INSERT OR IGNORE INTO link_tags (link_id, tag_id) VALUES (?, ?)"
      ).run(linkTag.link_id, linkTag.tag_id);
    }

    for (const folder of noteFolders ?? []) {
      db.prepare(
        "INSERT INTO note_folders (id, parent_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        folder.id,
        folder.parent_id ?? null,
        folder.title,
        folder.sort_order ?? 0,
        folder.created_at ?? new Date().toISOString(),
        folder.updated_at ?? new Date().toISOString()
      );
    }

    for (const n of notes ?? []) {
      db.prepare(
        `INSERT INTO notes
          (id, title, content, folder_id, tags, is_pinned, is_archived, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        n.id,
        n.title,
        n.content,
        n.folder_id ?? null,
        Array.isArray(n.tags) ? JSON.stringify(n.tags) : n.tags ?? "[]",
        n.is_pinned ? 1 : 0,
        n.is_archived ? 1 : 0,
        n.sort_order ?? 0,
        n.created_at ?? n.updated_at ?? new Date().toISOString(),
        n.updated_at ?? new Date().toISOString()
      );
    }

    for (const section of dashboardSections ?? []) {
      db.prepare(
        "INSERT INTO dashboard_sections (id, title, icon, layout, sort_order) VALUES (?, ?, ?, ?, ?)"
      ).run(section.id, section.title, section.icon ?? null, section.layout ?? "{}", section.sort_order);
    }

    for (const card of dashboardCards ?? []) {
      db.prepare(
        "INSERT INTO dashboard_cards (id, section_id, title, description, tile_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        card.id,
        card.section_id,
        card.title,
        card.description ?? null,
        card.tile_id ?? null,
        card.sort_order,
        card.created_at,
        card.updated_at
      );
    }

    for (const widget of widgets ?? []) {
      db.prepare(
        `INSERT INTO widgets
          (id, type, title, config_json, layout_json, section_id, sort_order, is_enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        widget.id,
        widget.type,
        widget.title,
        widget.config_json ?? JSON.stringify(widget.config ?? {}),
        widget.layout_json ?? JSON.stringify(widget.layout ?? {}),
        widget.section_id ?? null,
        widget.sort_order ?? 0,
        widget.is_enabled === false ? 0 : 1,
        widget.created_at ?? new Date().toISOString(),
        widget.updated_at ?? new Date().toISOString()
      );
    }

    for (const item of dashboardItems ?? []) {
      db.prepare(
        "INSERT OR IGNORE INTO dashboard_items (id, section_id, item_type, item_id, sort_order, layout, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        item.id,
        item.section_id,
        item.item_type,
        item.item_id,
        item.sort_order ?? 0,
        item.layout ?? "{}",
        item.created_at ?? new Date().toISOString(),
        item.updated_at ?? new Date().toISOString()
      );
    }

    for (const project of workspaceProjects ?? []) {
      db.prepare(
        `INSERT INTO workspace_projects
          (id, title, body, status, priority, start_date, due_date, tags, icon, color, custom_fields, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        project.id,
        project.title,
        project.body ?? "",
        project.status ?? "backlog",
        project.priority ?? "medium",
        project.start_date ?? null,
        project.due_date ?? null,
        Array.isArray(project.tags) ? JSON.stringify(project.tags) : project.tags ?? "[]",
        project.icon ?? null,
        project.color ?? null,
        typeof project.custom_fields === "string" ? project.custom_fields : JSON.stringify(project.custom_fields ?? {}),
        project.created_at ?? new Date().toISOString(),
        project.updated_at ?? new Date().toISOString()
      );
    }

    for (const task of workspaceTasks ?? []) {
      db.prepare(
        `INSERT INTO workspace_tasks
          (id, project_id, parent_id, title, body, status, priority, start_date, due_date, tags, custom_fields, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        task.id,
        task.project_id ?? null,
        task.parent_id ?? null,
        task.title,
        task.body ?? "",
        task.status ?? "todo",
        task.priority ?? "medium",
        task.start_date ?? null,
        task.due_date ?? null,
        Array.isArray(task.tags) ? JSON.stringify(task.tags) : task.tags ?? "[]",
        typeof task.custom_fields === "string" ? task.custom_fields : JSON.stringify(task.custom_fields ?? {}),
        task.sort_order ?? 0,
        task.created_at ?? new Date().toISOString(),
        task.updated_at ?? new Date().toISOString()
      );
    }

    let fallbackWikiBookId: number | null = null;
    for (const book of workspaceWikiBooks ?? []) {
      db.prepare(
        `INSERT INTO workspace_wiki_books
          (id, title, description, icon, color, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        book.id,
        book.title,
        book.description ?? "",
        book.icon ?? null,
        book.color ?? null,
        book.sort_order ?? 0,
        book.created_at ?? new Date().toISOString(),
        book.updated_at ?? new Date().toISOString()
      );
      fallbackWikiBookId = fallbackWikiBookId ?? book.id;
    }

    if (!fallbackWikiBookId) {
      fallbackWikiBookId = Number(
        db
          .prepare("INSERT INTO workspace_wiki_books (title, description, icon, color, sort_order) VALUES ('Wiki', 'Default wiki book', 'book-open', '#8b5cf6', 0)")
          .run().lastInsertRowid
      );
    }

    for (const chapter of workspaceWikiChapters ?? []) {
      db.prepare(
        `INSERT INTO workspace_wiki_chapters
          (id, book_id, title, description, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        chapter.id,
        chapter.book_id ?? fallbackWikiBookId,
        chapter.title,
        chapter.description ?? "",
        chapter.sort_order ?? 0,
        chapter.created_at ?? new Date().toISOString(),
        chapter.updated_at ?? new Date().toISOString()
      );
    }

    for (const page of workspaceWikiPages ?? []) {
      db.prepare(
        `INSERT INTO workspace_wiki_pages
          (id, book_id, chapter_id, title, body, tags, custom_fields, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        page.id,
        page.book_id ?? fallbackWikiBookId,
        page.chapter_id ?? null,
        page.title,
        page.body ?? "",
        Array.isArray(page.tags) ? JSON.stringify(page.tags) : page.tags ?? "[]",
        typeof page.custom_fields === "string" ? page.custom_fields : JSON.stringify(page.custom_fields ?? {}),
        page.sort_order ?? 0,
        page.created_at ?? new Date().toISOString(),
        page.updated_at ?? new Date().toISOString()
      );
    }

    for (const dependency of workspaceDependencies ?? []) {
      db.prepare(
        "INSERT OR IGNORE INTO workspace_dependencies (id, source_type, source_id, target_type, target_id, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        dependency.id,
        dependency.source_type,
        dependency.source_id,
        dependency.target_type,
        dependency.target_id,
        dependency.kind ?? "blocks",
        dependency.created_at ?? new Date().toISOString()
      );
    }
  });

  try {
    doImport();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
