import { Router } from "express";
import db from "../db/client";
import fetch from "node-fetch";
import si from "systeminformation";
import { listContainers } from "../lib/docker";
import { fetchProviderMetrics, MediaProvider } from "../lib/mediaProviders";

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

const ACTIVE_WIDGET_TYPES = new Set([
  "docker",
  "system",
  "media",
  "downloads",
  "network",
  "rss",
  "weather",
  "calendar",
  "releases",
  "stocks",
]);

const ACTIVE_CATALOG = CATALOG.filter((item) => ACTIVE_WIDGET_TYPES.has(item.type));

function mapWidget(row: any) {
  const config = sanitizeStoredWidgetConfig(row);
  const secretKeys = db
    .prepare("SELECT key FROM widget_secrets WHERE widget_id = ?")
    .all(row.id) as Array<{ key: string }>;
  return {
    ...row,
    config: {
      ...config,
      hasApiKey: secretKeys.some((item) => item.key === "apiKey"),
      hasPassword: secretKeys.some((item) => item.key === "password"),
    },
    layout: JSON.parse(row.layout_json || "{}"),
    is_enabled: Boolean(row.is_enabled),
    config_json: undefined,
    layout_json: undefined,
  };
}

function readWidgetSecret(widgetId: number, key: string): string {
  const row = db.prepare("SELECT value FROM widget_secrets WHERE widget_id = ? AND key = ?").get(widgetId, key) as
    | { value: string }
    | undefined;
  return row?.value ?? "";
}

function splitSecrets(config: any): { publicConfig: Record<string, unknown>; secrets: Record<string, string> } {
  const publicConfig = { ...(config ?? {}) };
  const secrets: Record<string, string> = {};
  ["apiKey", "password"].forEach((key) => {
    const value = publicConfig[key];
    delete publicConfig[key];
    if (typeof value === "string" && value.trim()) secrets[key] = value.trim();
  });
  return { publicConfig, secrets };
}

function writeWidgetSecrets(widgetId: number, secrets: Record<string, string>): void {
  const upsert = db.prepare(
    `INSERT INTO widget_secrets (widget_id, key, value, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(widget_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  );
  Object.entries(secrets).forEach(([key, value]) => upsert.run(widgetId, key, value));
}

function parseConfigJson(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function sanitizeStoredWidgetConfig(row: any): Record<string, unknown> {
  const config = parseConfigJson(row.config_json);
  const { publicConfig, secrets } = splitSecrets(config);
  const migrated = Object.keys(secrets).length > 0;

  if (migrated) {
    db.transaction(() => {
      db.prepare("UPDATE widgets SET config_json = ?, updated_at = datetime('now') WHERE id = ?").run(
        JSON.stringify(publicConfig),
        row.id
      );
      writeWidgetSecrets(Number(row.id), secrets);
    })();
  }

  return publicConfig;
}

function isKnownWidgetType(type: string): boolean {
  return CATALOG.some((item) => item.type === type);
}

function isActiveWidgetType(type: string): boolean {
  return ACTIVE_WIDGET_TYPES.has(type);
}

router.get("/catalog", (_req, res) => res.json(ACTIVE_CATALOG));

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

    if (mapped.type === "media" && endpoint) {
      const provider = String(mapped.config.provider ?? "jellyfin") as MediaProvider;
      const apiKey = readWidgetSecret(mapped.id, "apiKey");
      const metrics = await fetchProviderMetrics({ provider, apiUrl: endpoint, apiKey });
      res.json({
        status: metrics.status,
        error: metrics.error,
        cards: [
          { label: "Movies", value: String(metrics.movieCount ?? "-") },
          { label: "Series", value: String(metrics.seriesCount ?? "-") },
          { label: "Streams", value: String(metrics.activeStreams ?? "-") },
        ],
      });
      return;
    }

    if (mapped.type === "downloads" && endpoint) {
      const client = String(mapped.config.client ?? "qbittorrent");
      if (client === "sabnzbd") {
        const apiKey = readWidgetSecret(mapped.id, "apiKey");
        const url = new URL(`${endpoint.replace(/\/$/, "")}/api`);
        url.searchParams.set("mode", "queue");
        url.searchParams.set("output", "json");
        if (apiKey) url.searchParams.set("apikey", apiKey);
        const response = await fetch(url.toString(), { timeout: 7000 } as any);
        const data = await response.json() as any;
        res.json({
          status: response.ok ? "ok" : "error",
          cards: [
            { label: "Queue", value: String(data?.queue?.noofslots_total ?? "-") },
            { label: "Speed", value: String(data?.queue?.speed ?? "-") },
          ],
        });
        return;
      }

      const username = String(mapped.config.username ?? "");
      const password = readWidgetSecret(mapped.id, "password");
      let cookie = "";
      if (username && password) {
        const login = await fetch(`${endpoint.replace(/\/$/, "")}/api/v2/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username, password }).toString(),
          timeout: 7000,
        } as any);
        cookie = String(login.headers.get("set-cookie") ?? "").split(";")[0];
      }
      const response = await fetch(`${endpoint.replace(/\/$/, "")}/api/v2/transfer/info`, {
        headers: cookie ? { Cookie: cookie } : undefined,
        timeout: 7000,
      } as any);
      const data = await response.json() as any;
      res.json({
        status: response.ok ? "ok" : "error",
        cards: [
          { label: "Down", value: `${Math.round(Number(data?.dl_info_speed ?? 0) / 1024)} KB/s` },
          { label: "Up", value: `${Math.round(Number(data?.up_info_speed ?? 0) / 1024)} KB/s` },
        ],
      });
      return;
    }

    if (mapped.type === "network" && endpoint) {
      const started = Date.now();
      let response = await fetch(endpoint, { method: "HEAD", timeout: 7000 } as any);
      if (response.status === 405 || response.status === 403) {
        response = await fetch(endpoint, { method: "GET", timeout: 7000 } as any);
      }
      res.json({
        status: response.ok ? "ok" : "error",
        cards: [
          { label: "HTTP", value: String(response.status) },
          { label: "Latency", value: `${Date.now() - started} ms` },
        ],
      });
      return;
    }

    if (mapped.type === "calendar" && endpoint) {
      const response = await fetch(endpoint, { timeout: 7000 } as any);
      const text = await response.text();
      const events = (text.match(/^BEGIN:VEVENT/gm) ?? []).length;
      res.json({ status: response.ok ? "ok" : "error", cards: [{ label: "Events", value: String(events) }] });
      return;
    }

    if (mapped.type === "releases" && endpoint) {
      const repo = endpoint.replace(/^https:\/\/github\.com\//i, "").replace(/\/$/, "");
      const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { "User-Agent": "TheDash" },
        timeout: 7000,
      } as any);
      const data = await response.json() as any;
      res.json({
        status: response.ok ? "ok" : "error",
        cards: [
          { label: "Latest", value: String(data?.tag_name ?? "-") },
          { label: "Name", value: String(data?.name ?? repo) },
        ],
      });
      return;
    }

    if (mapped.type === "stocks" && endpoint) {
      const symbol = endpoint.trim().toLowerCase();
      const response = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`, { timeout: 7000 } as any);
      const text = await response.text();
      const [, row] = text.trim().split(/\r?\n/);
      const columns = row?.split(",") ?? [];
      res.json({
        status: response.ok ? "ok" : "error",
        cards: [
          { label: "Price", value: columns[6] ?? "-" },
          { label: "Volume", value: columns[7] ?? "-" },
        ],
      });
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
  if (!isKnownWidgetType(type) || !isActiveWidgetType(type)) {
    res.status(400).json({ error: "unsupported widget type" });
    return;
  }
  const { publicConfig, secrets } = splitSecrets(req.body?.config ?? {});
  const result = db
    .prepare(
      "INSERT INTO widgets (type, title, config_json, layout_json, section_id, sort_order, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      type,
      title,
      JSON.stringify(publicConfig),
      JSON.stringify(req.body?.layout ?? {}),
      req.body?.section_id ?? null,
      req.body?.sort_order ?? 0,
      req.body?.is_enabled === false ? 0 : 1
    );
  writeWidgetSecrets(Number(result.lastInsertRowid), secrets);
  res.status(201).json(mapWidget(db.prepare("SELECT * FROM widgets WHERE id = ?").get(result.lastInsertRowid)));
});

router.put("/reorder/batch", (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) {
    res.status(400).json({ error: "items required" });
    return;
  }

  db.transaction(() => {
    const update = db.prepare("UPDATE widgets SET sort_order = ?, updated_at = datetime('now') WHERE id = ?");
    items.forEach((item: any) => {
      const id = Number(item.id);
      const sortOrder = Number(item.sort_order);
      if (Number.isFinite(id) && Number.isFinite(sortOrder)) update.run(sortOrder, id);
    });
  })();

  res.json({ ok: true });
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM widgets WHERE id = ?").get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (req.body?.type !== undefined && (!isKnownWidgetType(String(req.body.type)) || !isActiveWidgetType(String(req.body.type)))) {
    res.status(400).json({ error: "unsupported widget type" });
    return;
  }
  const title = String(req.body?.title ?? existing.title).trim();
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const nextConfig = req.body?.config !== undefined
    ? splitSecrets(req.body.config)
    : { publicConfig: sanitizeStoredWidgetConfig(existing), secrets: {} };

  db.prepare(
    "UPDATE widgets SET type = ?, title = ?, config_json = ?, layout_json = ?, section_id = ?, sort_order = ?, is_enabled = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    req.body?.type ?? existing.type,
    title,
    JSON.stringify(nextConfig.publicConfig),
    JSON.stringify(req.body?.layout ?? JSON.parse(existing.layout_json || "{}")),
    req.body?.section_id !== undefined ? req.body.section_id : existing.section_id,
    req.body?.sort_order ?? existing.sort_order,
    req.body?.is_enabled !== undefined ? (req.body.is_enabled ? 1 : 0) : existing.is_enabled,
    req.params.id
  );
  if (req.body?.config !== undefined) writeWidgetSecrets(Number(req.params.id), nextConfig.secrets);
  res.json(mapWidget(db.prepare("SELECT * FROM widgets WHERE id = ?").get(req.params.id)));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM widgets WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
