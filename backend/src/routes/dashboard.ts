import { Router } from "express";
import db from "../db/client";

const router = Router();

type DashboardSectionRow = {
  id: number;
  title: string;
  sort_order: number;
};

type DashboardCardRow = {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  tile_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function reindexSection(sectionId: number): void {
  const cards = db
    .prepare(
      "SELECT id FROM dashboard_cards WHERE section_id = ? ORDER BY sort_order ASC, id ASC"
    )
    .all(sectionId) as Array<{ id: number }>;

  const update = db.prepare("UPDATE dashboard_cards SET sort_order = ? WHERE id = ?");
  cards.forEach((card, index) => update.run(index, card.id));
}

function loadSectionsWithCards() {
  const sections = db
    .prepare("SELECT * FROM dashboard_sections ORDER BY sort_order ASC, id ASC")
    .all() as DashboardSectionRow[];

  const cards = db
    .prepare("SELECT * FROM dashboard_cards ORDER BY sort_order ASC, id ASC")
    .all() as DashboardCardRow[];

  return sections.map((section) => ({
    ...section,
    cards: cards.filter((card) => card.section_id === section.id),
  }));
}

router.get("/sections", (_req, res) => {
  res.json(loadSectionsWithCards());
});

router.post("/sections", (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }

  const max = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM dashboard_sections")
    .get() as { maxOrder: number };

  const result = db
    .prepare("INSERT INTO dashboard_sections (title, sort_order) VALUES (?, ?)")
    .run(title, max.maxOrder + 1);

  const section = db
    .prepare("SELECT * FROM dashboard_sections WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json({ ...(section as object), cards: [] });
});

router.put("/sections/:id", (req, res) => {
  const section = db
    .prepare("SELECT * FROM dashboard_sections WHERE id = ?")
    .get(req.params.id) as DashboardSectionRow | undefined;

  if (!section) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const title = String(req.body?.title ?? section.title).trim();
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }

  db.prepare("UPDATE dashboard_sections SET title = ? WHERE id = ?").run(
    title,
    req.params.id
  );

  res.json(db.prepare("SELECT * FROM dashboard_sections WHERE id = ?").get(req.params.id));
});

router.delete("/sections/:id", (req, res) => {
  const section = db
    .prepare("SELECT * FROM dashboard_sections WHERE id = ?")
    .get(req.params.id) as DashboardSectionRow | undefined;
  if (!section) {
    res.status(404).json({ error: "not found" });
    return;
  }

  db.transaction(() => {
    db.prepare("DELETE FROM dashboard_sections WHERE id = ?").run(req.params.id);
    const sections = db
      .prepare("SELECT id FROM dashboard_sections ORDER BY sort_order ASC, id ASC")
      .all() as Array<{ id: number }>;
    const update = db.prepare("UPDATE dashboard_sections SET sort_order = ? WHERE id = ?");
    sections.forEach((entry, index) => update.run(index, entry.id));
  })();

  res.json({ ok: true });
});

router.post("/cards", (req, res) => {
  const sectionId = Number(req.body?.section_id);
  const title = String(req.body?.title ?? "").trim();
  const description = String(req.body?.description ?? "").trim() || null;
  const tileId = req.body?.tile_id ? Number(req.body.tile_id) : null;

  if (!sectionId || !title) {
    res.status(400).json({ error: "section_id and title required" });
    return;
  }

  const section = db
    .prepare("SELECT id FROM dashboard_sections WHERE id = ?")
    .get(sectionId);
  if (!section) {
    res.status(404).json({ error: "section not found" });
    return;
  }

  const max = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM dashboard_cards WHERE section_id = ?"
    )
    .get(sectionId) as { maxOrder: number };

  const result = db
    .prepare(
      "INSERT INTO dashboard_cards (section_id, title, description, tile_id, sort_order) VALUES (?, ?, ?, ?, ?)"
    )
    .run(sectionId, title, description, tileId, max.maxOrder + 1);

  const card = db
    .prepare("SELECT * FROM dashboard_cards WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(card);
});

router.put("/cards/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM dashboard_cards WHERE id = ?")
    .get(req.params.id) as DashboardCardRow | undefined;

  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const title = String(req.body?.title ?? existing.title).trim();
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }

  const description =
    req.body?.description !== undefined
      ? String(req.body.description).trim() || null
      : existing.description;

  const tileId =
    req.body?.tile_id !== undefined
      ? req.body.tile_id
        ? Number(req.body.tile_id)
        : null
      : existing.tile_id;

  db.prepare(
    "UPDATE dashboard_cards SET title = ?, description = ?, tile_id = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(title, description, tileId, req.params.id);

  res.json(db.prepare("SELECT * FROM dashboard_cards WHERE id = ?").get(req.params.id));
});

router.post("/cards/:id/move", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM dashboard_cards WHERE id = ?")
    .get(req.params.id) as DashboardCardRow | undefined;

  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const targetSectionId = Number(req.body?.section_id ?? existing.section_id);
  const targetOrder = Number(req.body?.sort_order ?? 999999);

  const section = db
    .prepare("SELECT id FROM dashboard_sections WHERE id = ?")
    .get(targetSectionId);
  if (!section) {
    res.status(404).json({ error: "section not found" });
    return;
  }

  db.transaction(() => {
    db.prepare(
      "UPDATE dashboard_cards SET section_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(targetSectionId, targetOrder, req.params.id);

    reindexSection(existing.section_id);
    reindexSection(targetSectionId);
  })();

  res.json(db.prepare("SELECT * FROM dashboard_cards WHERE id = ?").get(req.params.id));
});

router.delete("/cards/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM dashboard_cards WHERE id = ?")
    .get(req.params.id) as DashboardCardRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  db.transaction(() => {
    db.prepare("DELETE FROM dashboard_cards WHERE id = ?").run(req.params.id);
    reindexSection(existing.section_id);
  })();

  res.json({ ok: true });
});

export default router;