import { Router } from "express";
import db from "../db/client";
import { suggestAiTags } from "../lib/tagging";

const router = Router();

const STATUSES = new Set(["backlog", "todo", "doing", "blocked", "done"]);
const PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const OBJECT_TYPES = new Set(["project", "task", "wiki", "note"]);

type WorkspaceType = "project" | "task" | "wiki" | "note";

type BaseRow = {
  id: number;
  title: string;
  body?: string;
  content?: string;
  tags?: string;
  custom_fields?: string;
  created_at: string;
  updated_at: string;
};

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

function normalizeStatus(value: unknown, fallback = "todo"): string {
  const status = String(value ?? fallback).toLowerCase();
  return STATUSES.has(status) ? status : fallback;
}

function normalizePriority(value: unknown): string {
  const priority = String(value ?? "medium").toLowerCase();
  return PRIORITIES.has(priority) ? priority : "medium";
}

function mapProject(row: any) {
  return {
    ...row,
    type: "project" as const,
    tags: parseJsonArray(row.tags),
    custom_fields: parseJsonObject(row.custom_fields),
  };
}

function mapTask(row: any) {
  return {
    ...row,
    type: "task" as const,
    tags: parseJsonArray(row.tags),
    custom_fields: parseJsonObject(row.custom_fields),
  };
}

function mapWiki(row: any) {
  return {
    ...row,
    type: "wiki" as const,
    tags: parseJsonArray(row.tags),
    custom_fields: parseJsonObject(row.custom_fields),
  };
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

function getProjects() {
  return (db.prepare("SELECT * FROM workspace_projects ORDER BY updated_at DESC, id DESC").all() as any[]).map(mapProject);
}

function getTasks() {
  return (db.prepare("SELECT * FROM workspace_tasks ORDER BY sort_order ASC, updated_at DESC, id DESC").all() as any[]).map(mapTask);
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

function allObjects() {
  return [...getProjects(), ...getTasks(), ...getWikiPages(), ...getNotes()];
}

function objectText(item: any): string {
  return [item.title, item.body, item.content, ...(item.tags ?? [])].join(" ").toLowerCase();
}

function extractWikiLinks(markdown: string): string[] {
  const matches = markdown.matchAll(/\[\[([^\]]+)\]\]/g);
  return Array.from(matches)
    .map((match) => match[1]?.split("|")[0]?.trim())
    .filter(Boolean);
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

router.get("/overview", (_req, res) => {
  const projects = getProjects();
  const tasks = getTasks();
  const wiki = getWikiPages();
  const notes = getNotes();
  const dependencies = getDependencies();
  const now = new Date();
  const dueSoon = tasks.filter((task) => task.due_date && new Date(task.due_date) >= now && task.status !== "done");
  res.json({
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

router.get("/projects", (_req, res) => res.json(getProjects()));
router.post("/projects", (req, res) => {
  const body = req.body ?? {};
  const title = String(body.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const result = db.prepare(
    `INSERT INTO workspace_projects
      (title, body, status, priority, start_date, due_date, tags, icon, color, custom_fields, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    title,
    body.body ?? "",
    normalizeStatus(body.status, "backlog"),
    normalizePriority(body.priority),
    body.start_date ?? null,
    body.due_date ?? null,
    stringifyTags(body.tags),
    body.icon ?? null,
    body.color ?? null,
    stringifyObject(body.custom_fields)
  );
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
  ).run(
    body.title ?? existing.title,
    body.body ?? existing.body,
    normalizeStatus(body.status ?? existing.status, "backlog"),
    normalizePriority(body.priority ?? existing.priority),
    body.start_date !== undefined ? body.start_date : existing.start_date,
    body.due_date !== undefined ? body.due_date : existing.due_date,
    body.tags !== undefined ? stringifyTags(body.tags) : existing.tags,
    body.icon !== undefined ? body.icon : existing.icon,
    body.color !== undefined ? body.color : existing.color,
    body.custom_fields !== undefined ? stringifyObject(body.custom_fields) : existing.custom_fields,
    req.params.id
  );
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
  const max = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM workspace_tasks WHERE status = ?").get(normalizeStatus(body.status)) as { maxOrder: number };
  const result = db.prepare(
    `INSERT INTO workspace_tasks
      (project_id, parent_id, title, body, status, priority, start_date, due_date, tags, custom_fields, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    body.project_id ?? null,
    body.parent_id ?? null,
    title,
    body.body ?? "",
    normalizeStatus(body.status),
    normalizePriority(body.priority),
    body.start_date ?? null,
    body.due_date ?? null,
    stringifyTags(body.tags),
    stringifyObject(body.custom_fields),
    body.sort_order ?? max.maxOrder + 1
  );
  res.status(201).json(findObject("task", Number(result.lastInsertRowid)));
});

router.put("/tasks/reorder", (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  db.transaction(() => {
    const update = db.prepare("UPDATE workspace_tasks SET status = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?");
    items.forEach((item: any) => {
      const id = Number(item.id);
      const sortOrder = Number(item.sort_order);
      if (Number.isFinite(id) && Number.isFinite(sortOrder)) update.run(normalizeStatus(item.status), sortOrder, id);
    });
  })();
  res.json({ ok: true });
});

router.put("/tasks/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM workspace_tasks WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "not found" });
  const body = req.body ?? {};
  db.prepare(
    `UPDATE workspace_tasks
     SET project_id = ?, parent_id = ?, title = ?, body = ?, status = ?, priority = ?, start_date = ?, due_date = ?, tags = ?, custom_fields = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    body.project_id !== undefined ? body.project_id : existing.project_id,
    body.parent_id !== undefined ? body.parent_id : existing.parent_id,
    body.title ?? existing.title,
    body.body ?? existing.body,
    normalizeStatus(body.status ?? existing.status),
    normalizePriority(body.priority ?? existing.priority),
    body.start_date !== undefined ? body.start_date : existing.start_date,
    body.due_date !== undefined ? body.due_date : existing.due_date,
    body.tags !== undefined ? stringifyTags(body.tags) : existing.tags,
    body.custom_fields !== undefined ? stringifyObject(body.custom_fields) : existing.custom_fields,
    body.sort_order ?? existing.sort_order,
    req.params.id
  );
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
  const result = db.prepare(
    "INSERT INTO workspace_wiki_pages (title, body, tags, custom_fields, updated_at) VALUES (?, ?, ?, ?, datetime('now'))"
  ).run(title, body.body ?? "", stringifyTags(body.tags), stringifyObject(body.custom_fields));
  res.status(201).json(findObject("wiki", Number(result.lastInsertRowid)));
});

router.put("/wiki/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM workspace_wiki_pages WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "not found" });
  const body = req.body ?? {};
  db.prepare(
    "UPDATE workspace_wiki_pages SET title = ?, body = ?, tags = ?, custom_fields = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    body.title ?? existing.title,
    body.body ?? existing.body,
    body.tags !== undefined ? stringifyTags(body.tags) : existing.tags,
    body.custom_fields !== undefined ? stringifyObject(body.custom_fields) : existing.custom_fields,
    req.params.id
  );
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
    .filter((line) => /^[-*]\s+\[[ x]\]\s+/i.test(line) || /^(todo|task|fix|prüfen|check):/i.test(line))
    .slice(0, 8)
    .map((line) => line.replace(/^[-*]\s+\[[ x]\]\s+/i, "").replace(/^(todo|task|fix|prüfen|check):\s*/i, ""));
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
    db.prepare("DELETE FROM workspace_tasks").run();
    db.prepare("DELETE FROM workspace_wiki_pages").run();
    db.prepare("DELETE FROM workspace_projects").run();
    db.prepare("DELETE FROM notes").run();
    db.prepare("DELETE FROM note_folders").run();
  })();
  res.json({ ok: true });
});

export default router;
