import { Router } from "express";
import db from "../db/client";

const router = Router();

router.get("/", (_req, res) => {
  const tags = db
    .prepare(
      `SELECT t.id, t.name, t.source, t.created_at, COUNT(lt.link_id) AS count
       FROM tags t
       LEFT JOIN link_tags lt ON lt.tag_id = t.id
       GROUP BY t.id
       ORDER BY count DESC, t.name ASC`
    )
    .all();
  res.json(tags);
});

router.post("/", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }

  db.prepare("INSERT OR IGNORE INTO tags (name, source) VALUES (?, 'manual')").run(name);
  const tag = db.prepare("SELECT * FROM tags WHERE name = ?").get(name);
  res.status(201).json(tag);
});

router.put("/:id", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }

  const result = db.prepare("UPDATE tags SET name = ? WHERE id = ?").run(name, req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "not found" });
    return;
  }

  res.json(db.prepare("SELECT * FROM tags WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM tags WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
