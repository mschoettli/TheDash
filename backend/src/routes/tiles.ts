import { Router } from "express";
import db from "../db/client";
import {
  fetchProviderMetrics,
  MediaProvider,
} from "../lib/mediaProviders";

const router = Router();

interface TileRow {
  id: number;
  name: string;
  url: string;
  icon_url: string | null;
  style: "card" | "compact" | "minimal";
  api_url: string | null;
  api_key: string | null;
  provider: MediaProvider;
  show_address: boolean;
  sort_order: number;
  created_at: string;
}

function mapTile(row: any): TileRow {
  return {
    ...row,
    api_url: row.api_url ?? row.api_endpoint ?? null,
    provider: (row.provider ?? "none") as MediaProvider,
    api_key: row.api_key ?? null,
    show_address: Boolean(row.show_address ?? 1),
  };
}

router.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM tiles ORDER BY sort_order ASC, id ASC")
    .all() as any[];
  res.json(rows.map(mapTile));
});

router.get("/:id/metrics", async (req, res) => {
  const row = db.prepare("SELECT * FROM tiles WHERE id = ?").get(req.params.id) as
    | any
    | undefined;

  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const tile = mapTile(row);
  const metrics = await fetchProviderMetrics({
    provider: tile.provider,
    apiUrl: tile.api_url ?? tile.url,
    apiKey: tile.api_key,
  });

  res.json(metrics);
});

router.post("/", (req, res) => {
  const {
    name,
    url,
    icon_url,
    style,
    api_url,
    api_endpoint,
    api_key,
    provider,
    show_address,
    sort_order,
  } = req.body;

  if (!name || !url) {
    res.status(400).json({ error: "name and url required" });
    return;
  }

  const result = db
    .prepare(
      "INSERT INTO tiles (name, url, icon_url, style, api_url, api_key, provider, show_address, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      name,
      url,
      icon_url ?? null,
      style ?? "card",
      api_url ?? api_endpoint ?? null,
      api_key ?? null,
      provider ?? "none",
      show_address === false ? 0 : 1,
      sort_order ?? 0
    );

  const row = db.prepare("SELECT * FROM tiles WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(mapTile(row));
});

router.put("/reorder/batch", (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) {
    res.status(400).json({ error: "items required" });
    return;
  }

  db.transaction(() => {
    const update = db.prepare("UPDATE tiles SET sort_order = ? WHERE id = ?");
    items.forEach((item: any) => {
      const id = Number(item.id);
      const sortOrder = Number(item.sort_order);
      if (Number.isFinite(id) && Number.isFinite(sortOrder)) update.run(sortOrder, id);
    });
  })();

  res.json({ ok: true });
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM tiles WHERE id = ?").get(req.params.id) as
    | any
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const {
    name,
    url,
    icon_url,
    style,
    api_url,
    api_endpoint,
    api_key,
    provider,
    show_address,
    sort_order,
  } = req.body;

  db.prepare(
    "UPDATE tiles SET name=?, url=?, icon_url=?, style=?, api_url=?, api_key=?, provider=?, show_address=?, sort_order=? WHERE id=?"
  ).run(
    name ?? existing.name,
    url ?? existing.url,
    icon_url !== undefined ? icon_url : existing.icon_url,
    style ?? existing.style,
    api_url !== undefined
      ? api_url
      : api_endpoint !== undefined
      ? api_endpoint
      : existing.api_url ?? existing.api_endpoint,
    api_key !== undefined ? api_key : existing.api_key,
    provider ?? existing.provider ?? "none",
    show_address !== undefined ? (show_address ? 1 : 0) : existing.show_address ?? 1,
    sort_order ?? existing.sort_order,
    req.params.id
  );

  const row = db.prepare("SELECT * FROM tiles WHERE id = ?").get(req.params.id);
  res.json(mapTile(row));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM tiles WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
