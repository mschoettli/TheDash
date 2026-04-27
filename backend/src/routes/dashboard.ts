import { Router } from "express";
import db from "../db/client";

const router = Router();

type DashboardSectionRow = {
  id: number;
  title: string;
  icon: string | null;
  layout: string;
  sort_order: number;
};

type DashboardItemRow = {
  id: number;
  section_id: number;
  item_type: "tile" | "widget";
  item_id: number;
  sort_order: number;
  layout: string;
  created_at: string;
  updated_at: string;
};

function parseJson(value: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function mapSection(section: DashboardSectionRow, items: DashboardItemRow[]) {
  return {
    ...section,
    layout: parseJson(section.layout),
    items: items
      .filter((item) => item.section_id === section.id)
      .map((item) => ({ ...item, layout: parseJson(item.layout) })),
  };
}

function ensureDefaultDashboardItems(): void {
  const home = db
    .prepare("SELECT id FROM dashboard_sections ORDER BY sort_order ASC, id ASC LIMIT 1")
    .get() as { id: number } | undefined;
  const homeId =
    home?.id ??
    Number(
      db
        .prepare("INSERT INTO dashboard_sections (title, icon, sort_order, layout) VALUES ('Home', 'logo:dashboard', 0, '{}')")
        .run().lastInsertRowid
    );

  db.exec(`
    DELETE FROM dashboard_items
    WHERE item_type = 'tile'
      AND item_id NOT IN (SELECT id FROM tiles);

    DELETE FROM dashboard_items
    WHERE item_type = 'widget'
      AND item_id NOT IN (SELECT id FROM widgets);

    INSERT OR IGNORE INTO dashboard_items (section_id, item_type, item_id, sort_order, layout)
    SELECT ${homeId}, 'tile', id, sort_order, '{}'
    FROM tiles;

    INSERT OR IGNORE INTO dashboard_items (section_id, item_type, item_id, sort_order, layout)
    SELECT ${homeId}, 'widget', id, sort_order, '{}'
    FROM widgets;
  `);
}

function loadDashboard() {
  ensureDefaultDashboardItems();
  const sections = db
    .prepare("SELECT * FROM dashboard_sections ORDER BY sort_order ASC, id ASC")
    .all() as DashboardSectionRow[];
  const items = db
    .prepare("SELECT * FROM dashboard_items ORDER BY sort_order ASC, id ASC")
    .all() as DashboardItemRow[];

  return sections.map((section) => mapSection(section, items));
}

router.get("/", (_req, res) => {
  res.json({ sections: loadDashboard() });
});

router.get("/sections", (_req, res) => {
  res.json(loadDashboard());
});

router.post("/sections", (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  const icon = String(req.body?.icon ?? "").trim() || null;
  const layout = req.body?.layout && typeof req.body.layout === "object" ? req.body.layout : {};
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }

  const max = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM dashboard_sections")
    .get() as { maxOrder: number };
  const result = db
    .prepare("INSERT INTO dashboard_sections (title, icon, layout, sort_order) VALUES (?, ?, ?, ?)")
    .run(title, icon, JSON.stringify(layout), max.maxOrder + 1);

  res.status(201).json(mapSection(db.prepare("SELECT * FROM dashboard_sections WHERE id = ?").get(result.lastInsertRowid) as DashboardSectionRow, []));
});

router.put("/sections/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM dashboard_sections WHERE id = ?").get(req.params.id) as
    | DashboardSectionRow
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const title = String(req.body?.title ?? existing.title).trim();
  const icon = req.body?.icon !== undefined ? String(req.body.icon).trim() || null : existing.icon;
  const layout = req.body?.layout && typeof req.body.layout === "object" ? req.body.layout : parseJson(existing.layout);
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }

  db.prepare("UPDATE dashboard_sections SET title = ?, icon = ?, layout = ? WHERE id = ?").run(
    title,
    icon,
    JSON.stringify(layout),
    req.params.id
  );

  res.json(mapSection(db.prepare("SELECT * FROM dashboard_sections WHERE id = ?").get(req.params.id) as DashboardSectionRow, []));
});

router.delete("/sections/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM dashboard_sections WHERE id = ?").get(req.params.id) as
    | DashboardSectionRow
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  db.transaction(() => {
    const fallback = db
      .prepare("SELECT id FROM dashboard_sections WHERE id != ? ORDER BY sort_order ASC, id ASC LIMIT 1")
      .get(req.params.id) as { id: number } | undefined;
    if (fallback) {
      db.prepare("UPDATE dashboard_items SET section_id = ?, updated_at = datetime('now') WHERE section_id = ?").run(
        fallback.id,
        req.params.id
      );
    }
    db.prepare("DELETE FROM dashboard_sections WHERE id = ?").run(req.params.id);
    const sections = db
      .prepare("SELECT id FROM dashboard_sections ORDER BY sort_order ASC, id ASC")
      .all() as Array<{ id: number }>;
    const update = db.prepare("UPDATE dashboard_sections SET sort_order = ? WHERE id = ?");
    sections.forEach((section, index) => update.run(index, section.id));
  })();

  res.json({ ok: true });
});

router.post("/items", (req, res) => {
  const sectionId = Number(req.body?.section_id);
  const itemType = String(req.body?.item_type ?? "");
  const itemId = Number(req.body?.item_id);
  const sortOrder = Number(req.body?.sort_order ?? 0);
  const layout = req.body?.layout && typeof req.body.layout === "object" ? req.body.layout : {};

  if (!Number.isFinite(sectionId) || !["tile", "widget"].includes(itemType) || !Number.isFinite(itemId)) {
    res.status(400).json({ error: "section_id, item_type, item_id required" });
    return;
  }

  const section = db.prepare("SELECT id FROM dashboard_sections WHERE id = ?").get(sectionId) as { id: number } | undefined;
  if (!section) {
    res.status(404).json({ error: "section not found" });
    return;
  }

  try {
    const result = db
      .prepare(
        "INSERT INTO dashboard_items (section_id, item_type, item_id, sort_order, layout) VALUES (?, ?, ?, ?, ?)"
      )
      .run(sectionId, itemType, itemId, sortOrder, JSON.stringify(layout));

    const item = db
      .prepare("SELECT * FROM dashboard_items WHERE id = ?")
      .get(result.lastInsertRowid) as DashboardItemRow;

    res.status(201).json({ ...item, layout: parseJson(item.layout) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      res.status(409).json({ error: "item already exists in dashboard" });
    } else {
      res.status(500).json({ error: msg });
    }
  }
});

router.put("/reorder", (req, res) => {
  const sections = Array.isArray(req.body?.sections) ? req.body.sections : [];
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!sections.length && !items.length) {
    res.status(400).json({ error: "sections or items required" });
    return;
  }

  db.transaction(() => {
    const updateSection = db.prepare(
      "UPDATE dashboard_sections SET sort_order = ?, title = COALESCE(?, title), layout = COALESCE(?, layout) WHERE id = ?"
    );
    sections.forEach((section: any) => {
      const id = Number(section.id);
      const sortOrder = Number(section.sort_order);
      const title = section.title ? String(section.title) : null;
      const layout = section.layout && typeof section.layout === "object" ? JSON.stringify(section.layout) : null;
      if (Number.isFinite(id) && Number.isFinite(sortOrder)) updateSection.run(sortOrder, title, layout, id);
    });

    const updateItem = db.prepare(
      "UPDATE dashboard_items SET section_id = ?, sort_order = ?, layout = ?, updated_at = datetime('now') WHERE id = ?"
    );
    items.forEach((item: any) => {
      const id = Number(item.id);
      const sectionId = Number(item.section_id);
      const sortOrder = Number(item.sort_order);
      const layout = item.layout && typeof item.layout === "object" ? item.layout : {};
      if (Number.isFinite(id) && Number.isFinite(sectionId) && Number.isFinite(sortOrder)) {
        updateItem.run(sectionId, sortOrder, JSON.stringify(layout), id);
      }
    });
  })();

  res.json({ ok: true });
});

export default router;
