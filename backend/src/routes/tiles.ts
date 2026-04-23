import { Router } from "express";
import db from "../db/client";

const router = Router();

router.get("/", (_req, res) => {
  const tiles = db
    .prepare("SELECT * FROM tiles ORDER BY sort_order ASC, id ASC")
    .all();
  res.json(tiles);
});

router.post("/", (req, res) => {
  const { name, url, icon_url, style, api_endpoint, sort_order } = req.body;
  if (!name || !url) {
    res.status(400).json({ error: "name and url required" });
    return;
  }
  const result = db
    .prepare(
      "INSERT INTO tiles (name, url, icon_url, style, api_endpoint, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(name, url, icon_url ?? null, style ?? "card", api_endpoint ?? null, sort_order ?? 0);
  const tile = db.prepare("SELECT * FROM tiles WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(tile);
});

router.put("/:id", (req, res) => {
  const { name, url, icon_url, style, api_endpoint, sort_order } = req.body;
  const existing = db.prepare("SELECT * FROM tiles WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  db.prepare(
    "UPDATE tiles SET name=?, url=?, icon_url=?, style=?, api_endpoint=?, sort_order=? WHERE id=?"
  ).run(
    name ?? (existing as any).name,
    url ?? (existing as any).url,
    icon_url !== undefined ? icon_url : (existing as any).icon_url,
    style ?? (existing as any).style,
    api_endpoint !== undefined ? api_endpoint : (existing as any).api_endpoint,
    sort_order ?? (existing as any).sort_order,
    req.params.id
  );
  const tile = db.prepare("SELECT * FROM tiles WHERE id = ?").get(req.params.id);
  res.json(tile);
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM tiles WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
