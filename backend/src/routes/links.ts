import { Router } from "express";
import db from "../db/client";

const router = Router();

router.post("/", (req, res) => {
  const { section_id, name, url, icon_url, sort_order } = req.body;
  if (!section_id || !name || !url) {
    res.status(400).json({ error: "section_id, name and url required" });
    return;
  }
  const result = db
    .prepare(
      "INSERT INTO links (section_id, name, url, icon_url, sort_order) VALUES (?, ?, ?, ?, ?)"
    )
    .run(section_id, name, url, icon_url ?? null, sort_order ?? 0);
  const link = db
    .prepare("SELECT * FROM links WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(link);
});

router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM links WHERE id = ?")
    .get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const { section_id, name, url, icon_url, sort_order } = req.body;
  db.prepare(
    "UPDATE links SET section_id=?, name=?, url=?, icon_url=?, sort_order=? WHERE id=?"
  ).run(
    section_id ?? existing.section_id,
    name ?? existing.name,
    url ?? existing.url,
    icon_url !== undefined ? icon_url : existing.icon_url,
    sort_order ?? existing.sort_order,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM links WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM links WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
