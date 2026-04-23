import { Router } from "express";
import db from "../db/client";

const router = Router();

router.get("/", (_req, res) => {
  const notes = db
    .prepare("SELECT * FROM notes ORDER BY updated_at DESC")
    .all();
  res.json(notes);
});

router.post("/", (req, res) => {
  const { title, content } = req.body;
  const result = db
    .prepare("INSERT INTO notes (title, content) VALUES (?, ?)")
    .run(title ?? "Neue Notiz", content ?? "");
  const note = db
    .prepare("SELECT * FROM notes WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(note);
});

router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM notes WHERE id = ?")
    .get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const { title, content } = req.body;
  db.prepare(
    "UPDATE notes SET title=?, content=?, updated_at=datetime('now') WHERE id=?"
  ).run(
    title ?? existing.title,
    content ?? existing.content,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
