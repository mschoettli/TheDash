import { Router } from "express";
import db from "../db/client";

const router = Router();

const CATALOG = [
  { type: "docker", title: "Docker Stats", category: "Infrastructure", controllable: true },
  { type: "system", title: "System Resources", category: "Infrastructure", controllable: false },
  { type: "media", title: "Media Streams", category: "Media", controllable: false },
  { type: "downloads", title: "Download Queue", category: "Media", controllable: true },
  { type: "network", title: "DNS / Network", category: "Network", controllable: true },
  { type: "rss", title: "RSS Feed", category: "Information", controllable: false },
  { type: "weather", title: "Weather", category: "Information", controllable: false },
  { type: "notebook", title: "Notebook", category: "Productivity", controllable: false },
  { type: "calendar", title: "Calendar", category: "Productivity", controllable: false },
  { type: "iframe", title: "iFrame", category: "Embed", controllable: false },
  { type: "releases", title: "Releases", category: "Development", controllable: false },
  { type: "video", title: "Video Stream", category: "Embed", controllable: false },
  { type: "automation", title: "Execute Automation", category: "Automation", controllable: true },
  { type: "entity", title: "Entity State", category: "Automation", controllable: true },
  { type: "stocks", title: "Stock Price", category: "Information", controllable: false },
  { type: "minecraft", title: "Minecraft Server", category: "Games", controllable: false },
  { type: "notifications", title: "Notifications", category: "System", controllable: false },
];

function mapWidget(row: any) {
  return {
    ...row,
    config: JSON.parse(row.config_json || "{}"),
    layout: JSON.parse(row.layout_json || "{}"),
    is_enabled: Boolean(row.is_enabled),
    config_json: undefined,
    layout_json: undefined,
  };
}

router.get("/catalog", (_req, res) => res.json(CATALOG));

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM widgets ORDER BY sort_order ASC, id ASC").all();
  res.json((rows as any[]).map(mapWidget));
});

router.post("/", (req, res) => {
  const type = String(req.body?.type ?? "").trim();
  const title = String(req.body?.title ?? "").trim();
  if (!type || !title) {
    res.status(400).json({ error: "type and title required" });
    return;
  }
  const result = db
    .prepare(
      "INSERT INTO widgets (type, title, config_json, layout_json, section_id, sort_order, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      type,
      title,
      JSON.stringify(req.body?.config ?? {}),
      JSON.stringify(req.body?.layout ?? {}),
      req.body?.section_id ?? null,
      req.body?.sort_order ?? 0,
      req.body?.is_enabled === false ? 0 : 1
    );
  res.status(201).json(mapWidget(db.prepare("SELECT * FROM widgets WHERE id = ?").get(result.lastInsertRowid)));
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM widgets WHERE id = ?").get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  db.prepare(
    "UPDATE widgets SET title = ?, config_json = ?, layout_json = ?, section_id = ?, sort_order = ?, is_enabled = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    req.body?.title ?? existing.title,
    JSON.stringify(req.body?.config ?? JSON.parse(existing.config_json || "{}")),
    JSON.stringify(req.body?.layout ?? JSON.parse(existing.layout_json || "{}")),
    req.body?.section_id !== undefined ? req.body.section_id : existing.section_id,
    req.body?.sort_order ?? existing.sort_order,
    req.body?.is_enabled !== undefined ? (req.body.is_enabled ? 1 : 0) : existing.is_enabled,
    req.params.id
  );
  res.json(mapWidget(db.prepare("SELECT * FROM widgets WHERE id = ?").get(req.params.id)));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM widgets WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
