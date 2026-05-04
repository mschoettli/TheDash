import { Router } from "express";
import db from "../db/client";
import { suggestAiTags } from "../lib/tagging";

const router = Router();

const MAX_COLUMNS_PER_BOARD = 10;
const DEFAULT_BOARD_TITLE = "TheDash Board";
const PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const LEGACY_STATUSES = new Set(["backlog", "todo", "doing", "blocked", "done"]);
const OBJECT_TYPES = new Set(["project", "task", "wiki", "note"]);
const DEFAULT_COLUMNS = [
  { title: "Backlog", kind: "backlog", color: "#64748b" },
  { title: "Todo", kind: "todo", color: "#3b82f6" },
  { title: "Doing", kind: "doing", color: "#06b6d4" },
  { title: "Blocked", kind: "blocked", color: "#f43f5e" },
  { title: "Done", kind: "done", color: "#22c55e" },
];

type WorkspaceType = "project" | "task" | "wiki" | "note";

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

function stringifyTags(value: unknown): string {
  return JSON.stringify(Array.from(new Set(parseJsonArray(value))));
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function stringifyObject(value: unknown): string {
  return JSON.stringify(parseJsonObject(value));
}

function normalizePriority(value: unknown): string {
  const priority = String(value ?? "medium").toLowerCase();
  return PRIORITIES.has(priority) ? priority : "medium";
}

function normalizeLegacyStatus(value: unknown, fallback = "todo"): string {
  const status = String(value ?? fallback).toLowerCase();
  return LEGACY_STATUSES.has(status) ? status : fallback;
}

function normalizeHex(value: unknown, fallback = "#06b6d4"): string {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function getLabelsForTask(taskId: number) {
  return db
    .prepare(
      `SELECT labels.*
       FROM workspace_labels labels
       JOIN workspace_task_labels links ON links.label_id = labels.id
       WHERE links.task_id = ?
       ORDER BY labels.name ASC`
    )
    .all(taskId);
}

function getTagsForTask(taskId: number) {
  return db
    .prepare(
      `SELECT tags.*
       FROM workspace_tags tags
       JOIN workspace_task_tags links ON links.tag_id = tags.id
       WHERE links.task_id = ?
       ORDER BY tags.name ASC`
    )
    .all(taskId);
}

function getChecklistsForTask(taskId: number) {
  const checklists = db.prepare("SELECT * FROM workspace_checklists WHERE task_id = ? ORDER BY sort_order ASC, id ASC").all(taskId) as any[];
  return checklists.map((checklist) => ({
    ...checklist,
    items: (db.prepare("SELECT * FROM workspace_checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC, id ASC").all(checklist.id) as any[]).map((item) => ({
      ...item,
      is_done: Boolean(item.is_done),
    })),
  }));
}

function mapColumn(row: any) {
  return { ...row, is_archived: Boolean(row.is_archived) };
}

function mapProject(row: any) {
  return { ...row, type: "project" as const, tags: parseJsonArray(row.tags), custom_fields: parseJsonObject(row.custom_fields) };
}

function mapTask(row: any) {
  return {
    ...row,
    type: "task" as const,
    board_id: row.board_id ?? null,
    column_id: row.column_id ?? null,
    tags: parseJsonArray(row.tags),
    labels: getLabelsForTask(row.id),
    tag_records: getTagsForTask(row.id),
    checklists: getChecklistsForTask(row.id),
    custom_fields: parseJsonObject(row.custom_fields),
  };
}

function mapWiki(row: any) {
  return { ...row, type: "wiki" as const, tags: parseJsonArray(row.tags), custom_fields: parseJsonObject(row.custom_fields) };
}

function mapNote(row: any) {
  return {
    ...row,
    type: "note" as const,
    body: row.content ?? "",
    tags: parseJsonArray(row.tags),
    is_pinned: Boolean(row.is_pinned),
    is_archived: Boolean(row.is_archived),
  };
}

function getBoards() {
  return db.prepare("SELECT * FROM workspace_boards ORDER BY sort_order ASC, id ASC").all();
}

function getColumns(boardId?: number, includeArchived = false) {
  const where = boardId ? "WHERE board_id = ?" : "";
  const archived = includeArchived ? "" : `${where ? " AND" : "WHERE"} is_archived = 0`;
  const params = boardId ? [boardId] : [];
  return (db.prepare(`SELECT * FROM workspace_board_columns ${where}${archived} ORDER BY sort_order ASC, id ASC`).all(...params) as any[]).map(mapColumn);
}

function getProjects() {
  return (db.prepare("SELECT * FROM workspace_projects ORDER BY updated_at DESC, id DESC").all() as any[]).map(mapProject);
}

function getTasks() {
  return (db.prepare("SELECT * FROM workspace_tasks ORDER BY board_id ASC, column_id ASC, sort_order ASC, updated_at DESC, id DESC").all() as any[]).map(mapTask);
}

function getWikiPages() {
  return (db.prepare("SELECT * FROM workspace_wiki_pages ORDER BY updated_at DESC, id DESC").all() as any[]).map(mapWiki);
}

function getNotes() {
  return (db.prepare("SELECT * FROM notes ORDER BY updated_at DESC, id DESC").all() as any[]).map(mapNote);
}

function getDependencies() {
  return db.prepare("SELECT * FROM workspace_dependencies ORDER BY id ASC").all();
}

function getLabels() {
  return db.prepare("SELECT * FROM workspace_labels ORDER BY name ASC").all();
}

function getWorkspaceTags() {
  return db.prepare("SELECT * FROM workspace_tags ORDER BY name ASC").all();
}

function allObjects() {
  return [...getProjects(), ...getTasks(), ...getWikiPages(), ...getNotes()];
}

function objectText(item: any): string {
  return [
    item.title,
    item.body,
    item.content,
    ...(item.tags ?? []),
    ...(item.labels ?? []).map((label: any) => label.name),
    ...(item.tag_records ?? []).map((tag: any) => tag.name),
  ].join(" ").toLowerCase();
}

function extractWikiLinks(markdown: string): string[] {
  const matches = markdown.matchAll(/\[\[([^\]]+)\]\]/g);
  return Array.from(matches)
    .map((match) => match[1]?.split("|")[0]?.trim())
    .filter(Boolean);
}

function ensureDefaultBoard(): number {
  const existing = db.prepare("SELECT id FROM workspace_boards ORDER BY sort_order ASC, id ASC LIMIT 1").get() as { id: number } | undefined;
  if (existing) return existing.id;
  const result = db.prepare("INSERT INTO workspace_boards (title, description, icon, color, sort_order) VALUES (?, ?, ?, ?, 0)").run(DEFAULT_BOARD_TITLE, "Default workspace board", "kanban", "#06b6d4");
  const boardId = Number(result.lastInsertRowid);
  const insertColumn = db.prepare("INSERT INTO workspace_board_columns (board_id, title, color, kind, sort_order) VALUES (?, ?, ?, ?, ?)");
  DEFAULT_COLUMNS.forEach((column, index) => insertColumn.run(boardId, column.title, column.color, column.kind, index));
  return boardId;
}

function getFallbackColumn(boardId: number): any {
  let column = db.prepare("SELECT * FROM workspace_board_columns WHERE board_id = ? AND is_archived = 0 ORDER BY sort_order ASC, id ASC LIMIT 1").get(boardId) as any;
  if (!column) {
    const result = db.prepare("INSERT INTO workspace_board_columns (board_id, title, color, kind, sort_order) VALUES (?, 'Todo', '#3b82f6', 'todo', 0)").run(boardId);
    column = db.prepare("SELECT * FROM workspace_board_columns WHERE id = ?").get(result.lastInsertRowid);
  }
  return column;
}

function findObject(type: WorkspaceType, id: number) {
  if (type === "project") {
    const row = db.prepare("SELECT * FROM workspace_projects WHERE id = ?").get(id);
    return row ? mapProject(row) : null;
  }
  if (type === "task") {
    const row = db.prepare("SELECT * FROM workspace_tasks WHERE id = ?").get(id);
    return row ? mapTask(row) : null;
  }
  if (type === "wiki") {
    const row = db.prepare("SELECT * FROM workspace_wiki_pages WHERE id = ?").get(id);
    return row ? mapWiki(row) : null;
  }
  const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as any;
  return note ? mapNote(note) : null;
}

function replaceTaskLabels(taskId: number, labelIds: unknown) {
  if (!Array.isArray(labelIds)) return;
  const insert = db.prepare("INSERT OR IGNORE INTO workspace_task_labels (task_id, label_id) VALUES (?, ?)");
  db.prepare("DELETE FROM workspace_task_labels WHERE task_id = ?").run(taskId);
  labelIds.map(Number).filter(Number.isFinite).forEach((labelId) => insert.run(taskId, labelId));
}

function replaceTaskTags(taskId: number, tagIds: unknown) {
  if (!Array.isArray(tagIds)) return;
  const insert = db.prepare("INSERT OR IGNORE INTO workspace_task_tags (task_id, tag_id) VALUES (?, ?)");
  db.prepare("DELETE FROM workspace_task_tags WHERE task_id = ?").run(taskId);
  tagIds.map(Number).filter(Number.isFinite).forEach((tagId) => insert.run(taskId, tagId));
}

function replaceTaskChecklists(taskId: number, checklists: unknown) {
  if (!Array.isArray(checklists)) return;
  const existingChecklists = db.prepare("SELECT id FROM workspace_checklists WHERE task_id = ?").all(taskId) as Array<{ id: number }>;
  const deleteItems = db.prepare("DELETE FROM workspace_checklist_items WHERE checklist_id = ?");
  existingChecklists.forEach((checklist) => deleteItems.run(checklist.id));
  db.prepare("DELETE FROM workspace_checklists WHERE task_id = ?").run(taskId);
  const insertChecklist = db.prepare("INSERT INTO workspace_checklists (task_id, title, sort_order) VALUES (?, ?, ?)");
  const insertItem = db.prepare("INSERT INTO workspace_checklist_items (checklist_id, title, is_done, sort_order) VALUES (?, ?, ?, ?)");
  checklists.forEach((checklist: any, checklistIndex: number) => {
    const title = String(checklist?.title ?? "Checklist").trim() || "Checklist";
    const result = insertChecklist.run(taskId, title, checklistIndex);
    const items = Array.isArray(checklist?.items) ? checklist.items : [];
    items.forEach((item: any, itemIndex: number) => {
      const itemTitle = String(item?.title ?? "").trim();
      if (itemTitle) insertItem.run(Number(result.lastInsertRowid), itemTitle, item?.is_done ? 1 : 0, itemIndex);
    });
  });
}

router.get("/overview", (_req, res) => {
  const boardId = ensureDefaultBoard();
  const projects = getProjects();
  const tasks = getTasks();
  const wiki = getWikiPages();
  const notes = getNotes();
  const dependencies = getDependencies();
  const now = new Date();
  const dueSoon = tasks.filter((task) => task.due_date && new Date(task.due_date) >= now && task.status !== "done");
  res.json({
    boards: getBoards(),
    columns: getColumns(undefined, true),
    labels: getLabels(),
    workspace_tags: getWorkspaceTags(),
    active_board_id: boardId,
    projects,
    tasks,
    wiki,
    notes,
    dependencies,
    stats: {
      activeProjects: projects.filter((project) => project.status !== "done").length,
      openTasks: tasks.filter((task) => task.status !== "done").length,
      blockedTasks: tasks.filter((task) => task.status === "blocked").length,
      dueTasks: dueSoon.length,
      wikiPages: wiki.length,
      notes: notes.filter((note) => !note.is_archived).length,
    },
  });
});

router.get("/boards", (_req, res) => res.json(getBoards()));

router.post("/boards", (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const max = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM workspace_boards").get() as { maxOrder: number };
  const result = db.prepare("INSERT INTO workspace_boards (title, description, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)").run(title, req.body?.description ?? "", req.body?.icon ?? null, normalizeHex(req.body?.color), max.maxOrder + 1);
  const boardId = Number(result.lastInsertRowid);
  const insertColumn = db.prepare("INSERT INTO workspace_board_columns (board_id, title, color, kind, sort_order) VALUES (?, ?, ?, ?, ?)");
  DEFAULT_COLUMNS.forEach((column, index) => insertColumn.run(boardId, column.title, column.color, column.kind, index));
  res.status(201).json(db.prepare("SELECT * FROM workspace_boards WHERE id = ?").get(boardId));
});

router.put("/boards/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM workspace_boards WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "not found" });
  db.prepare("UPDATE workspace_boards SET title = ?, description = ?, icon = ?, color = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?").run(req.body?.title ?? existing.title, req.body?.description ?? existing.description, req.body?.icon ?? existing.icon, req.body?.color ?? existing.color, req.body?.sort_order ?? existing.sort_order, req.params.id);
  res.json(db.prepare("SELECT * FROM workspace_boards WHERE id = ?").get(req.params.id));
});

router.delete("/boards/:id", (req, res) => {
  const boards = getBoards() as any[];
  if (boards.length <= 1) return res.status(400).json({ error: "last board cannot be deleted" });
  const target = boards.find((board) => board.id !== Number(req.params.id));
  const targetColumn = getFallbackColumn(target.id);
  db.transaction(() => {
    db.prepare("UPDATE workspace_tasks SET board_id = ?, column_id = ? WHERE board_id = ?").run(target.id, targetColumn.id, req.params.id);
    db.prepare("DELETE FROM workspace_boards WHERE id = ?").run(req.params.id);
  })();
  res.json({ ok: true });
});

router.get("/boards/:boardId/columns", (req, res) => res.json(getColumns(Number(req.params.boardId), true)));

router.post("/boards/:boardId/columns", (req, res) => {
  const boardId = Number(req.params.boardId);
  if (!db.prepare("SELECT id FROM workspace_boards WHERE id = ?").get(boardId)) return res.status(404).json({ error: "board not found" });
  const count = db.prepare("SELECT COUNT(*) AS count FROM workspace_board_columns WHERE board_id = ? AND is_archived = 0").get(boardId) as { count: number };
  if (count.count >= MAX_COLUMNS_PER_BOARD) return res.status(400).json({ error: "column limit reached" });
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const max = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM workspace_board_columns WHERE board_id = ?").get(boardId) as { maxOrder: number };
  const result = db.prepare("INSERT INTO workspace_board_columns (board_id, title, color, kind, sort_order) VALUES (?, ?, ?, ?, ?)").run(boardId, title, normalizeHex(req.body?.color), req.body?.kind ?? "custom", max.maxOrder + 1);
  res.status(201).json(db.prepare("SELECT * FROM workspace_board_columns WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/boards/:boardId/columns/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM workspace_board_columns WHERE id = ? AND board_id = ?").get(req.params.id, req.params.boardId) as any;
  if (!existing) return res.status(404).json({ error: "not found" });
  db.prepare("UPDATE workspace_board_columns SET title = ?, color = ?, kind = ?, sort_order = ?, is_archived = ?, updated_at = datetime('now') WHERE id = ?").run(req.body?.title ?? existing.title, req.body?.color ?? existing.color, req.body?.kind ?? existing.kind, req.body?.sort_order ?? existing.sort_order, req.body?.is_archived !== undefined ? (req.body.is_archived ? 1 : 0) : existing.is_archived, req.params.id);
  res.json(db.prepare("SELECT * FROM workspace_board_columns WHERE id = ?").get(req.params.id));
});

router.delete("/boards/:boardId/columns/:id", (req, res) => {
  const boardId = Number(req.params.boardId);
  const columnId = Number(req.params.id);
  const columns = getColumns(boardId) as any[];
  if (columns.length <= 1) return res.status(400).json({ error: "last column cannot be deleted" });
  const targetId = Number(req.body?.target_column_id) || columns.find((column) => column.id !== columnId)?.id;
  if (!targetId) return res.status(400).json({ error: "target column required" });
  db.transaction(() => {
    db.prepare("UPDATE workspace_tasks SET column_id = ? WHERE column_id = ?").run(targetId, columnId);
    db.prepare("DELETE FROM workspace_board_columns WHERE id = ? AND board_id = ?").run(columnId, boardId);
  })();
  res.json({ ok: true });
});

router.put("/boards/:boardId/reorder", (req, res) => {
  const boardId = Number(req.params.boardId);
  const columns = Array.isArray(req.body?.columns) ? req.body.columns : [];
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
  db.transaction(() => {
    const updateColumn = db.prepare("UPDATE workspace_board_columns SET sort_order = ?, updated_at = datetime('now') WHERE id = ? AND board_id = ?");
    columns.forEach((column: any, index: number) => {
      const id = Number(column.id);
      if (Number.isFinite(id)) updateColumn.run(Number.isFinite(Number(column.sort_order)) ? Number(column.sort_order) : index, id, boardId);
    });
    const updateTask = db.prepare("UPDATE workspace_tasks SET board_id = ?, column_id = ?, status = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?");
    tasks.forEach((task: any, index: number) => {
      const id = Number(task.id);
      const columnId = Number(task.column_id);
      if (!Number.isFinite(id) || !Number.isFinite(columnId)) return;
      const column = db.prepare("SELECT kind FROM workspace_board_columns WHERE id = ? AND board_id = ?").get(columnId, boardId) as any;
      updateTask.run(boardId, columnId, normalizeLegacyStatus(column?.kind ?? task.status), Number.isFinite(Number(task.sort_order)) ? Number(task.sort_order) : index, id);
    });
  })();
  res.json({ ok: true });
});

router.get("/labels", (_req, res) => res.json(getLabels()));

router.post("/labels", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "name required" });
  const result = db.prepare("INSERT OR IGNORE INTO workspace_labels (name, color) VALUES (?, ?)").run(name, normalizeHex(req.body?.color));
  const id = result.lastInsertRowid || (db.prepare("SELECT id FROM workspace_labels WHERE name = ?").get(name) as any)?.id;
  res.status(201).json(db.prepare("SELECT * FROM workspace_labels WHERE id = ?").get(id));
});

router.put("/labels/:id", (req, res) => {
  db.prepare("UPDATE workspace_labels SET name = COALESCE(?, name), color = COALESCE(?, color), updated_at = datetime('now') WHERE id = ?").run(req.body?.name ?? null, req.body?.color ?? null, req.params.id);
  res.json(db.prepare("SELECT * FROM workspace_labels WHERE id = ?").get(req.params.id));
});

router.delete("/labels/:id", (req, res) => {
  db.prepare("DELETE FROM workspace_labels WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/tags", (_req, res) => res.json(getWorkspaceTags()));

router.post("/tags", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "name required" });
  const source = ["manual", "auto", "ai"].includes(String(req.body?.source)) ? String(req.body.source) : "manual";
  const result = db.prepare("INSERT OR IGNORE INTO workspace_tags (name, source) VALUES (?, ?)").run(name, source);
  const id = result.lastInsertRowid || (db.prepare("SELECT id FROM workspace_tags WHERE name = ?").get(name) as any)?.id;
  res.status(201).json(db.prepare("SELECT * FROM workspace_tags WHERE id = ?").get(id));
});

router.put("/tags/:id", (req, res) => {
  db.prepare("UPDATE workspace_tags SET name = COALESCE(?, name), source = COALESCE(?, source), updated_at = datetime('now') WHERE id = ?").run(req.body?.name ?? null, req.body?.source ?? null, req.params.id);
  res.json(db.prepare("SELECT * FROM workspace_tags WHERE id = ?").get(req.params.id));
});

router.delete("/tags/:id", (req, res) => {
  db.prepare("DELETE FROM workspace_tags WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/projects", (_req, res) => res.json(getProjects()));

router.post("/projects", (req, res) => {
  const body = req.body ?? {};
  const title = String(body.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const result = db.prepare(
    `INSERT INTO workspace_projects
      (title, body, status, priority, start_date, due_date, tags, icon, color, custom_fields, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(title, body.body ?? "", normalizeLegacyStatus(body.status, "backlog"), normalizePriority(body.priority), body.start_date ?? null, body.due_date ?? null, stringifyTags(body.tags), body.icon ?? null, body.color ?? null, stringifyObject(body.custom_fields));
  res.status(201).json(findObject("project", Number(result.lastInsertRowid)));
});

router.put("/projects/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM workspace_projects WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "not found" });
  const body = req.body ?? {};
  db.prepare(
    `UPDATE workspace_projects
     SET title = ?, body = ?, status = ?, priority = ?, start_date = ?, due_date = ?, tags = ?, icon = ?, color = ?, custom_fields = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(body.title ?? existing.title, body.body ?? existing.body, normalizeLegacyStatus(body.status ?? existing.status, "backlog"), normalizePriority(body.priority ?? existing.priority), body.start_date !== undefined ? body.start_date : existing.start_date, body.due_date !== undefined ? body.due_date : existing.due_date, body.tags !== undefined ? stringifyTags(body.tags) : existing.tags, body.icon !== undefined ? body.icon : existing.icon, body.color !== undefined ? body.color : existing.color, body.custom_fields !== undefined ? stringifyObject(body.custom_fields) : existing.custom_fields, req.params.id);
  res.json(findObject("project", Number(req.params.id)));
});

router.delete("/projects/:id", (req, res) => {
  db.transaction(() => {
    db.prepare("UPDATE workspace_tasks SET project_id = NULL WHERE project_id = ?").run(req.params.id);
    db.prepare("DELETE FROM workspace_dependencies WHERE (source_type = 'project' AND source_id = ?) OR (target_type = 'project' AND target_id = ?)").run(req.params.id, req.params.id);
    db.prepare("DELETE FROM workspace_projects WHERE id = ?").run(req.params.id);
  })();
  res.json({ ok: true });
});

router.get("/tasks", (_req, res) => res.json(getTasks()));

router.post("/tasks", (req, res) => {
  const body = req.body ?? {};
  const title = String(body.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const boardId = Number(body.board_id) || ensureDefaultBoard();
  const columnId = Number(body.column_id) || getFallbackColumn(boardId).id;
  const column = db.prepare("SELECT * FROM workspace_board_columns WHERE id = ? AND board_id = ?").get(columnId, boardId) as any;
  if (!column) return res.status(400).json({ error: "invalid column" });
  const max = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM workspace_tasks WHERE column_id = ?").get(columnId) as { maxOrder: number };
  const result = db.prepare(
    `INSERT INTO workspace_tasks
      (project_id, parent_id, title, body, status, priority, start_date, due_date, tags, custom_fields, board_id, column_id, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(body.project_id ?? null, body.parent_id ?? null, title, body.body ?? "", normalizeLegacyStatus(column.kind), normalizePriority(body.priority), body.start_date ?? null, body.due_date ?? null, stringifyTags(body.tags), stringifyObject(body.custom_fields), boardId, columnId, body.sort_order ?? max.maxOrder + 1);
  const taskId = Number(result.lastInsertRowid);
  replaceTaskLabels(taskId, body.label_ids);
  replaceTaskTags(taskId, body.tag_ids);
  replaceTaskChecklists(taskId, body.checklists);
  res.status(201).json(findObject("task", taskId));
});

router.put("/tasks/reorder", (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  db.transaction(() => {
    const update = db.prepare("UPDATE workspace_tasks SET board_id = COALESCE(?, board_id), column_id = COALESCE(?, column_id), status = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?");
    items.forEach((item: any) => {
      const id = Number(item.id);
      const sortOrder = Number(item.sort_order);
      const columnId = Number(item.column_id);
      const boardId = Number(item.board_id);
      const column = Number.isFinite(columnId) ? (db.prepare("SELECT kind FROM workspace_board_columns WHERE id = ?").get(columnId) as any) : null;
      if (Number.isFinite(id) && Number.isFinite(sortOrder)) update.run(Number.isFinite(boardId) ? boardId : null, Number.isFinite(columnId) ? columnId : null, normalizeLegacyStatus(column?.kind ?? item.status), sortOrder, id);
    });
  })();
  res.json({ ok: true });
});

router.put("/tasks/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM workspace_tasks WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "not found" });
  const body = req.body ?? {};
  const boardId = body.board_id !== undefined ? Number(body.board_id) : existing.board_id;
  const columnId = body.column_id !== undefined ? Number(body.column_id) : existing.column_id;
  const column = columnId ? (db.prepare("SELECT * FROM workspace_board_columns WHERE id = ?").get(columnId) as any) : null;
  db.prepare(
    `UPDATE workspace_tasks
     SET project_id = ?, parent_id = ?, title = ?, body = ?, status = ?, priority = ?, start_date = ?, due_date = ?, tags = ?, custom_fields = ?, board_id = ?, column_id = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(body.project_id !== undefined ? body.project_id : existing.project_id, body.parent_id !== undefined ? body.parent_id : existing.parent_id, body.title ?? existing.title, body.body ?? existing.body, normalizeLegacyStatus(column?.kind ?? body.status ?? existing.status), normalizePriority(body.priority ?? existing.priority), body.start_date !== undefined ? body.start_date : existing.start_date, body.due_date !== undefined ? body.due_date : existing.due_date, body.tags !== undefined ? stringifyTags(body.tags) : existing.tags, body.custom_fields !== undefined ? stringifyObject(body.custom_fields) : existing.custom_fields, Number.isFinite(boardId) ? boardId : existing.board_id, Number.isFinite(columnId) ? columnId : existing.column_id, body.sort_order ?? existing.sort_order, req.params.id);
  replaceTaskLabels(Number(req.params.id), body.label_ids);
  replaceTaskTags(Number(req.params.id), body.tag_ids);
  replaceTaskChecklists(Number(req.params.id), body.checklists);
  res.json(findObject("task", Number(req.params.id)));
});

router.delete("/tasks/:id", (req, res) => {
  db.transaction(() => {
    db.prepare("DELETE FROM workspace_dependencies WHERE (source_type = 'task' AND source_id = ?) OR (target_type = 'task' AND target_id = ?)").run(req.params.id, req.params.id);
    db.prepare("DELETE FROM workspace_tasks WHERE id = ?").run(req.params.id);
  })();
  res.json({ ok: true });
});

router.get("/wiki", (_req, res) => res.json(getWikiPages()));

router.post("/wiki", (req, res) => {
  const body = req.body ?? {};
  const title = String(body.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const result = db.prepare("INSERT INTO workspace_wiki_pages (title, body, tags, custom_fields, updated_at) VALUES (?, ?, ?, ?, datetime('now'))").run(title, body.body ?? "", stringifyTags(body.tags), stringifyObject(body.custom_fields));
  res.status(201).json(findObject("wiki", Number(result.lastInsertRowid)));
});

router.put("/wiki/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM workspace_wiki_pages WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "not found" });
  const body = req.body ?? {};
  db.prepare("UPDATE workspace_wiki_pages SET title = ?, body = ?, tags = ?, custom_fields = ?, updated_at = datetime('now') WHERE id = ?").run(body.title ?? existing.title, body.body ?? existing.body, body.tags !== undefined ? stringifyTags(body.tags) : existing.tags, body.custom_fields !== undefined ? stringifyObject(body.custom_fields) : existing.custom_fields, req.params.id);
  res.json(findObject("wiki", Number(req.params.id)));
});

router.delete("/wiki/:id", (req, res) => {
  db.prepare("DELETE FROM workspace_wiki_pages WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/search", (req, res) => {
  const q = String(req.query?.q ?? "").trim().toLowerCase();
  const type = String(req.query?.type ?? "").trim();
  const results = allObjects().filter((item: any) => {
    if (type && item.type !== type) return false;
    return !q || objectText(item).includes(q);
  });
  res.json(results.slice(0, 100));
});

router.get("/backlinks/:type/:id", (req, res) => {
  const type = String(req.params.type) as WorkspaceType;
  const id = Number(req.params.id);
  if (!OBJECT_TYPES.has(type) || !Number.isFinite(id)) return res.status(400).json({ error: "invalid object" });
  const target = findObject(type, id) as any;
  if (!target) return res.status(404).json({ error: "not found" });
  const targetTitle = String(target.title).toLowerCase();
  const backlinks = allObjects().filter((item: any) => {
    if (item.type === type && item.id === id) return false;
    return extractWikiLinks(String(item.body ?? item.content ?? "")).some((link) => link.toLowerCase() === targetTitle);
  });
  res.json(backlinks);
});

router.put("/dependencies", (req, res) => {
  const dependencies = Array.isArray(req.body?.dependencies) ? req.body.dependencies : [];
  db.transaction(() => {
    db.prepare("DELETE FROM workspace_dependencies").run();
    const insert = db.prepare("INSERT OR IGNORE INTO workspace_dependencies (source_type, source_id, target_type, target_id, kind) VALUES (?, ?, ?, ?, ?)");
    dependencies.forEach((dep: any) => {
      const sourceType = String(dep.source_type);
      const targetType = String(dep.target_type);
      const sourceId = Number(dep.source_id);
      const targetId = Number(dep.target_id);
      if (["project", "task"].includes(sourceType) && ["project", "task"].includes(targetType) && Number.isFinite(sourceId) && Number.isFinite(targetId)) {
        insert.run(sourceType, sourceId, targetType, targetId, dep.kind ?? "blocks");
      }
    });
  })();
  res.json({ ok: true, dependencies: getDependencies() });
});

router.post("/assistant/suggest", async (req, res) => {
  const kind = String(req.body?.kind ?? "summary");
  const title = String(req.body?.title ?? "");
  const content = String(req.body?.content ?? "");
  const tags = await suggestAiTags({ kind: "note", title, content });
  const taskCandidates = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+\[[ x]\]\s+/i.test(line) || /^(todo|task|fix|check):/i.test(line))
    .slice(0, 8)
    .map((line) => line.replace(/^[-*]\s+\[[ x]\]\s+/i, "").replace(/^(todo|task|fix|check):\s*/i, ""));
  res.json({
    kind,
    suggestions: {
      tags: tags ?? [],
      summary: content ? content.replace(/[#*_`>\-\[\]]/g, "").split(/\s+/).slice(0, 36).join(" ") : "",
      tasks: taskCandidates,
      status_update: taskCandidates.length ? `${taskCandidates.length} suggested tasks found.` : "No task candidates found.",
    },
    requires_confirmation: true,
  });
});

router.post("/reset", (req, res) => {
  if (req.body?.confirm !== "RESET_WORKSPACE") return res.status(400).json({ error: "confirmation required" });
  db.transaction(() => {
    db.prepare("DELETE FROM workspace_dependencies").run();
    db.prepare("DELETE FROM workspace_task_labels").run();
    db.prepare("DELETE FROM workspace_task_tags").run();
    db.prepare("DELETE FROM workspace_checklist_items").run();
    db.prepare("DELETE FROM workspace_checklists").run();
    db.prepare("DELETE FROM workspace_tasks").run();
    db.prepare("DELETE FROM workspace_wiki_pages").run();
    db.prepare("DELETE FROM workspace_projects").run();
    db.prepare("DELETE FROM workspace_board_columns").run();
    db.prepare("DELETE FROM workspace_boards").run();
    db.prepare("DELETE FROM notes").run();
    db.prepare("DELETE FROM note_folders").run();
  })();
  ensureDefaultBoard();
  res.json({ ok: true });
});

export default router;
