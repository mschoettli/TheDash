import { Router } from "express";
import db from "../db/client";
import fetch from "node-fetch";
import si from "systeminformation";
import { listContainers } from "../lib/docker";

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

function isKnownWidgetType(type: string): boolean {
  return CATALOG.some((item) => item.type === type);
}

router.get("/catalog", (_req, res) => res.json(CATALOG));

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM widgets ORDER BY sort_order ASC, id ASC").all();
  res.json((rows as any[]).map(mapWidget));
});

router.get("/:id/metrics", async (req, res) => {
  const widget = db.prepare("SELECT * FROM widgets WHERE id = ?").get(req.params.id) as any;
  if (!widget) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const mapped = mapWidget(widget);
  const endpoint = String(mapped.config.endpoint ?? "").trim();

  try {
    if (mapped.type === "system") {
      const [load, mem, fs] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize()]);
      res.json({
        status: "ok",
        cards: [
          { label: "CPU", value: `${Math.round(load.currentLoad)}%` },
          { label: "RAM", value: `${Math.round((mem.active / mem.total) * 100)}%` },
          { label: "Disk", value: fs[0] ? `${Math.round(fs[0].use)}%` : "-" },
        ],
      });
      return;
    }

    if (mapped.type === "docker") {
      const containers = await listContainers();
      res.json({
        status: "ok",
        cards: [
          { label: "Containers", value: String(containers.length) },
          { label: "Running", value: String(containers.filter((container) => container.state === "running").length) },
        ],
      });
      return;
    }

    if (mapped.type === "rss" && endpoint) {
      const response = await fetch(endpoint, { timeout: 7000 } as any);
      const text = await response.text();
      const itemCount = (text.match(/<item\b|<entry\b/gi) ?? []).length;
      res.json({ status: response.ok ? "ok" : "error", cards: [{ label: "Items", value: String(itemCount) }] });
      return;
    }

    if (mapped.type === "weather" && endpoint) {
      const response = await fetch(`https://wttr.in/${encodeURIComponent(endpoint)}?format=j1`, { timeout: 7000 } as any);
      const data = await response.json() as any;
      const current = data?.current_condition?.[0];
      res.json({
        status: "ok",
        cards: [
          { label: "Temp", value: `${current?.temp_C ?? "-"}°C` },
          { label: "Wind", value: `${current?.windspeedKmph ?? "-"} km/h` },
        ],
      });
      return;
    }

    res.json({ status: endpoint ? "configured" : "unconfigured", cards: [] });
  } catch (error: any) {
    res.json({ status: "error", error: error?.message ?? "Widget metrics unavailable", cards: [] });
  }
});

router.post("/", (req, res) => {
  const type = String(req.body?.type ?? "").trim();
  const title = String(req.body?.title ?? "").trim();
  if (!type || !title) {
    res.status(400).json({ error: "type and title required" });
    return;
  }
  if (!isKnownWidgetType(type)) {
    res.status(400).json({ error: "unknown widget type" });
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
  if (req.body?.type !== undefined && !isKnownWidgetType(String(req.body.type))) {
    res.status(400).json({ error: "unknown widget type" });
    return;
  }
  const title = String(req.body?.title ?? existing.title).trim();
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  db.prepare(
    "UPDATE widgets SET type = ?, title = ?, config_json = ?, layout_json = ?, section_id = ?, sort_order = ?, is_enabled = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    req.body?.type ?? existing.type,
    title,
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
