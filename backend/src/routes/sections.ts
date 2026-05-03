import { Router } from "express";
import db from "../db/client";
import { attachTags } from "./links";

const router = Router();

router.get("/", (_req, res) => {
  db.prepare(
    `UPDATE links
     SET screenshot_status = 'failed',
         screenshot_updated_at = datetime('now'),
         updated_at = datetime('now')
     WHERE screenshot_status = 'pending'
       AND COALESCE(screenshot_updated_at, updated_at, created_at) < datetime('now', '-2 minutes')`
  ).run();

  const sections = db
    .prepare("SELECT * FROM sections ORDER BY sort_order ASC, id ASC")
    .all() as Array<{ id: number; title: string; description: string | null; color: string | null; icon: string | null; sort_order: number }>;
  const links = db
    .prepare("SELECT * FROM links ORDER BY sort_order ASC, id ASC")
    .all() as Array<{ id: number; section_id: number | null }>;
  const linksWithTags = attachTags(links);

  const sectionsResult = sections.map((s) => ({
    ...s,
    links: linksWithTags.filter((l) => l.section_id === s.id),
  }));
  const unsectionedLinks = linksWithTags.filter((l) => l.section_id === null);

  res.json({ sections: sectionsResult, unsectionedLinks });
});

router.post("/", (req, res) => {
  const { title, description, color, icon, sort_order } = req.body;
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const result = db
    .prepare("INSERT INTO sections (title, description, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)")
    .run(title, description ?? null, color ?? null, icon ?? null, sort_order ?? 0);
  const section = db
    .prepare("SELECT * FROM sections WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json({ ...(section as object), links: [] });
});

router.put("/:id", (req, res) => {
  const { title, description, color, icon, sort_order } = req.body;
  const existing = db
    .prepare("SELECT * FROM sections WHERE id = ?")
    .get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  db.prepare("UPDATE sections SET title=?, description=?, color=?, icon=?, sort_order=? WHERE id=?").run(
    title ?? existing.title,
    description !== undefined ? description : existing.description,
    color !== undefined ? color : existing.color,
    icon !== undefined ? icon : existing.icon,
    sort_order ?? existing.sort_order,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM sections WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM sections WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
