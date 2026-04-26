import { Router } from "express";
import db from "../db/client";

const router = Router();

type NoteFolderRow = {
  id: number;
  parent_id: number | null;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type NoteRow = {
  id: number;
  title: string;
  content: string;
  folder_id: number | null;
  tags: string;
  is_pinned: number;
  is_archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function parseTags(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((tag) => String(tag).trim()).filter(Boolean));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      return JSON.stringify(value.split(",").map((tag) => tag.trim()).filter(Boolean));
    }
  }
  return "[]";
}

function mapNote(row: NoteRow) {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags || "[]");
  } catch {
    tags = [];
  }
  return {
    ...row,
    tags,
    is_pinned: Boolean(row.is_pinned),
    is_archived: Boolean(row.is_archived),
  };
}

function suggestNoteTags(title: string, content: string): Array<{ name: string; source: "auto" | "ai" }> {
  const blocked = new Set(["diese", "eine", "oder", "aber", "nicht", "with", "this", "that", "from"]);
  const values = new Set<string>();
  `${title} ${content}`
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .filter((word) => word.length > 4 && !/^\d+$/.test(word) && !blocked.has(word))
    .slice(0, 20)
    .forEach((word) => values.add(word));
  const source = process.env.AI_TAGGING_PROVIDER ? "ai" : "auto";
  return Array.from(values).slice(0, 8).map((name) => ({ name, source }));
}

router.get("/folders", (_req, res) => {
  const folders = db
    .prepare("SELECT * FROM note_folders ORDER BY sort_order ASC, title ASC")
    .all() as NoteFolderRow[];
  res.json(folders);
});

router.post("/folders", (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  const parentId = req.body?.parent_id ? Number(req.body.parent_id) : null;
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }

  const max = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM note_folders WHERE parent_id IS ?")
    .get(parentId) as { maxOrder: number };
  const result = db
    .prepare("INSERT INTO note_folders (parent_id, title, sort_order) VALUES (?, ?, ?)")
    .run(parentId, title, max.maxOrder + 1);
  res.status(201).json(db.prepare("SELECT * FROM note_folders WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/folders/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM note_folders WHERE id = ?").get(req.params.id) as
    | NoteFolderRow
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const title = String(req.body?.title ?? existing.title).trim();
  const parentId = req.body?.parent_id !== undefined ? req.body.parent_id : existing.parent_id;
  const sortOrder = req.body?.sort_order !== undefined ? Number(req.body.sort_order) : existing.sort_order;
  db.prepare("UPDATE note_folders SET title = ?, parent_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?").run(
    title || existing.title,
    parentId,
    Number.isFinite(sortOrder) ? sortOrder : existing.sort_order,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM note_folders WHERE id = ?").get(req.params.id));
});

router.delete("/folders/:id", (req, res) => {
  db.transaction(() => {
    db.prepare("UPDATE notes SET folder_id = NULL WHERE folder_id = ?").run(req.params.id);
    db.prepare("DELETE FROM note_folders WHERE id = ?").run(req.params.id);
  })();
  res.json({ ok: true });
});

router.get("/", (_req, res) => {
  const notes = db
    .prepare("SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC")
    .all() as NoteRow[];
  res.json(notes.map(mapNote));
});

router.post("/tag-suggestions", (req, res) => {
  const title = String(req.body?.title ?? "");
  const content = String(req.body?.content ?? "");
  res.json({
    provider: process.env.AI_TAGGING_PROVIDER ? "ai" : "auto",
    suggestions: suggestNoteTags(title, content),
  });
});

router.post("/", (req, res) => {
  const { title, content, folder_id, tags, is_pinned, is_archived, sort_order } = req.body ?? {};
  const folderId = folder_id ?? null;
  const minOrder = db
    .prepare("SELECT COALESCE(MIN(sort_order), 0) AS minOrder FROM notes WHERE folder_id IS ?")
    .get(folderId) as { minOrder: number };
  const result = db
    .prepare(
      `INSERT INTO notes (title, content, folder_id, tags, is_pinned, is_archived, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .run(
      title ?? "Neue Notiz",
      content ?? "",
      folderId,
      parseTags(tags),
      is_pinned ? 1 : 0,
      is_archived ? 1 : 0,
      sort_order ?? minOrder.minOrder - 1
    );
  const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(result.lastInsertRowid) as NoteRow;
  res.status(201).json(mapNote(note));
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id) as NoteRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const data = req.body ?? {};
  db.prepare(
    `UPDATE notes
     SET title = ?, content = ?, folder_id = ?, tags = ?, is_pinned = ?, is_archived = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    data.title ?? existing.title,
    data.content ?? existing.content,
    data.folder_id !== undefined ? data.folder_id : existing.folder_id,
    data.tags !== undefined ? parseTags(data.tags) : existing.tags,
    data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : existing.is_pinned,
    data.is_archived !== undefined ? (data.is_archived ? 1 : 0) : existing.is_archived,
    data.sort_order ?? existing.sort_order,
    req.params.id
  );

  res.json(mapNote(db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id) as NoteRow));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
