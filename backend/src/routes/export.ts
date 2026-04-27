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
          (id, section_id, name, url, icon_url, image_url, description, note, is_favorite, is_archived, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        l.id,
        l.section_id,
        l.name,
        l.url,
        l.icon_url,
        l.image_url ?? null,
        l.description ?? null,
        l.note ?? null,
        l.is_favorite ? 1 : 0,
        l.is_archived ? 1 : 0,
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
  });

  try {
    doImport();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
