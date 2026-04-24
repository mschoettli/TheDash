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
  const dashboardSections = db
    .prepare("SELECT * FROM dashboard_sections ORDER BY sort_order")
    .all();
  const dashboardCards = db
    .prepare("SELECT * FROM dashboard_cards ORDER BY sort_order")
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
    dashboardSections,
    dashboardCards,
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
    dashboardSections,
    dashboardCards,
  } = req.body;

  const doImport = db.transaction(() => {
    db.prepare("DELETE FROM links").run();
    db.prepare("DELETE FROM link_tags").run();
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM sections").run();
    db.prepare("DELETE FROM dashboard_cards").run();
    db.prepare("DELETE FROM dashboard_sections").run();
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

    for (const n of notes ?? []) {
      db.prepare(
        "INSERT INTO notes (id, title, content, updated_at) VALUES (?, ?, ?, ?)"
      ).run(n.id, n.title, n.content, n.updated_at);
    }

    for (const section of dashboardSections ?? []) {
      db.prepare(
        "INSERT INTO dashboard_sections (id, title, sort_order) VALUES (?, ?, ?)"
      ).run(section.id, section.title, section.sort_order);
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
  });

  try {
    doImport();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
