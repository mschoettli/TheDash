import { Router } from "express";
import db from "../db/client";
import { attachTags } from "./links";

const router = Router();

router.get("/", (_req, res) => {
  const sections = db
    .prepare("SELECT * FROM sections ORDER BY sort_order ASC, id ASC")
    .all() as Array<{ id: number; title: string; sort_order: number }>;
  const links = db
    .prepare("SELECT * FROM links ORDER BY sort_order ASC, id ASC")
    .all() as Array<{ id: number; section_id: number }>;
  const linksWithTags = attachTags(links);

  const result = sections.map((s) => ({
    ...s,
    links: linksWithTags.filter((l) => l.section_id === s.id),
  }));
  res.json(result);
});

router.post("/", (req, res) => {
  const { title, sort_order } = req.body;
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const result = db
    .prepare("INSERT INTO sections (title, sort_order) VALUES (?, ?)")
    .run(title, sort_order ?? 0);
  const section = db
    .prepare("SELECT * FROM sections WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json({ ...(section as object), links: [] });
});

router.put("/:id", (req, res) => {
  const { title, sort_order } = req.body;
  const existing = db
    .prepare("SELECT * FROM sections WHERE id = ?")
    .get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  db.prepare("UPDATE sections SET title=?, sort_order=? WHERE id=?").run(
    title ?? existing.title,
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
