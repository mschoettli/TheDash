import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive,
  BarChart3,
  Blocks,
  Bot,
  CalendarDays,
  FileText,
  FolderKanban,
  GitBranch,
  GripVertical,
  Layers3,
  Link2,
  ListChecks,
  Network,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import {
  AssistantSuggestion,
  useCreateWorkspaceProject,
  useCreateWorkspaceTask,
  useCreateWorkspaceWiki,
  useDeleteWorkspaceProject,
  useDeleteWorkspaceTask,
  useDeleteWorkspaceWiki,
  useReorderWorkspaceTasks,
  useUpdateWorkspaceDependencies,
  useUpdateWorkspaceProject,
  useUpdateWorkspaceTask,
  useUpdateWorkspaceWiki,
  useWorkspaceAssistant,
  useWorkspaceBacklinks,
  useWorkspaceOverview,
  WorkspaceDependency,
  WorkspaceObject,
  WorkspaceObjectType,
  WorkspacePriority,
  WorkspaceProject,
  WorkspaceStatus,
  WorkspaceTask,
} from "../hooks/useWorkspace";
import { useCreateNote, useDeleteNote, useUpdateNote } from "../hooks/useNotes";

const statuses: WorkspaceStatus[] = ["backlog", "todo", "doing", "blocked", "done"];
const priorities: WorkspacePriority[] = ["low", "medium", "high", "urgent"];
const tabs = ["dashboard", "board", "list", "calendar", "timeline", "mindmap", "projects", "wiki", "notes"] as const;
type WorkspaceTab = typeof tabs[number];

type Draft = {
  type: WorkspaceObjectType;
  id?: number;
  title: string;
  body: string;
  status: WorkspaceStatus;
  priority: WorkspacePriority;
  start_date: string;
  due_date: string;
  tags: string;
  project_id?: number | null;
  parent_id?: number | null;
};

function stripMarkdown(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[*_`>#-]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function objectBody(item: WorkspaceObject): string {
  return item.body;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function priorityClass(priority: WorkspacePriority): string {
  if (priority === "urgent") return "text-rose-400 bg-rose-500/10 border-rose-500/25";
  if (priority === "high") return "text-amber-400 bg-amber-500/10 border-amber-500/25";
  if (priority === "low") return "text-t3 bg-line/15 border-line/50";
  return "text-accent bg-accent/10 border-accent/25";
}

function statusLabel(status: WorkspaceStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function makeDraft(type: WorkspaceObjectType, item?: WorkspaceObject): Draft {
  if (!item) {
    return {
      type,
      title: type === "project" ? "New Project" : type === "task" ? "New Task" : type === "wiki" ? "New Wiki Page" : "New Note",
      body: "",
      status: type === "project" ? "backlog" : "todo",
      priority: "medium",
      start_date: "",
      due_date: "",
      tags: "",
      project_id: null,
      parent_id: null,
    };
  }
  return {
    type: item.type,
    id: item.id,
    title: item.title,
    body: objectBody(item),
    status: item.type === "project" || item.type === "task" ? item.status : "todo",
    priority: item.type === "project" || item.type === "task" ? item.priority : "medium",
    start_date: item.type === "project" || item.type === "task" ? item.start_date ?? "" : "",
    due_date: item.type === "project" || item.type === "task" ? item.due_date ?? "" : "",
    tags: item.tags.join(", "),
    project_id: item.type === "task" ? item.project_id : null,
    parent_id: item.type === "task" ? item.parent_id : null,
  };
}

function StatCard({ icon: Icon, label, value, tone = "accent" }: { icon: React.ElementType; label: string; value: number; tone?: "accent" | "warn" | "ok" }) {
  const toneClass = tone === "warn" ? "text-amber-400 bg-amber-500/10" : tone === "ok" ? "text-emerald-400 bg-emerald-500/10" : "text-accent bg-accent/10";
  return (
    <div className="rounded-2xl border border-line/60 bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-t1">{value}</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-t3">{label}</div>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}><Icon size={18} /></span>
      </div>
    </div>
  );
}

function ObjectCard({ item, onOpen }: { item: WorkspaceObject; onOpen: (item: WorkspaceObject) => void }) {
  const body = stripMarkdown(objectBody(item));
  return (
    <button onClick={() => onOpen(item)} className="group rounded-2xl border border-line/60 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-t3">{item.type}</div>
          <div className="mt-1 truncate text-[15px] font-semibold text-t1">{item.title}</div>
        </div>
        <span className="rounded-full border border-line/50 px-2 py-0.5 text-[10px] text-t3">{formatDate(item.updated_at)}</span>
      </div>
      <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-[12px] leading-5 text-t2">{body || "No content yet."}</p>
      <div className="mt-3 flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
        {item.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent/85">{tag}</span>)}
        {item.tags.length > 3 && <span className="text-[10px] text-t3">+{item.tags.length - 3}</span>}
      </div>
    </button>
  );
}

function TaskCard({ task, project, onOpen }: { task: WorkspaceTask; project?: WorkspaceProject; onOpen: (item: WorkspaceObject) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task:${task.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} className={`rounded-xl border border-line/60 bg-surface p-3 ${isDragging ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 cursor-grab touch-none text-t3"><GripVertical size={13} /></button>
        <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
          <div className="truncate text-[13px] font-semibold text-t1">{task.title}</div>
          {project && <div className="mt-0.5 truncate text-[11px] text-t3">{project.title}</div>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
            {task.due_date && <span className="rounded-full border border-line/50 px-2 py-0.5 text-[10px] text-t3">{formatDate(task.due_date)}</span>}
          </div>
        </button>
      </div>
    </div>
  );
}

function BoardColumn({ status, tasks, projects, onOpen }: { status: WorkspaceStatus; tasks: WorkspaceTask[]; projects: WorkspaceProject[]; onOpen: (item: WorkspaceObject) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `status:${status}` });
  return (
    <section ref={setNodeRef} className={`min-h-[360px] rounded-2xl border border-line/60 bg-card p-3 transition-colors ${isOver ? "border-accent/40 bg-accent/5" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-t2">{statusLabel(status)}</h3>
        <span className="rounded-full bg-line/30 px-2 py-0.5 text-[11px] text-t3">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => <TaskCard key={task.id} task={task} project={projects.find((project) => project.id === task.project_id)} onOpen={onOpen} />)}
      </div>
    </section>
  );
}

function WorkspaceDrawer({ draft, setDraft, onClose, overview }: { draft: Draft; setDraft: (draft: Draft | null) => void; onClose: () => void; overview: ReturnType<typeof useWorkspaceOverview>["data"] }) {
  const { t } = useTranslation();
  const createProject = useCreateWorkspaceProject();
  const updateProject = useUpdateWorkspaceProject();
  const deleteProject = useDeleteWorkspaceProject();
  const createTask = useCreateWorkspaceTask();
  const updateTask = useUpdateWorkspaceTask();
  const deleteTask = useDeleteWorkspaceTask();
  const createWiki = useCreateWorkspaceWiki();
  const updateWiki = useUpdateWorkspaceWiki();
  const deleteWiki = useDeleteWorkspaceWiki();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const updateDependencies = useUpdateWorkspaceDependencies();
  const assistant = useWorkspaceAssistant();
  const { data: backlinks = [] } = useWorkspaceBacklinks(draft.id ? draft.type : undefined, draft.id);
  const [assistantResult, setAssistantResult] = useState<AssistantSuggestion | null>(null);
  const [dependencyTarget, setDependencyTarget] = useState("");
  const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  const isExisting = Boolean(draft.id);
  const dependencyOptions = [
    ...(overview?.projects ?? []).map((project) => ({ type: "project" as const, id: project.id, title: project.title })),
    ...(overview?.tasks ?? []).map((task) => ({ type: "task" as const, id: task.id, title: task.title })),
  ].filter((item) => !(item.type === draft.type && item.id === draft.id));
  const dependencies = overview?.dependencies ?? [];
  const currentDependencies = isExisting && (draft.type === "project" || draft.type === "task")
    ? dependencies.filter((dep) => dep.source_type === draft.type && dep.source_id === draft.id)
    : [];

  const save = async () => {
    const payload = {
      title: draft.title.trim() || "Untitled",
      body: draft.body,
      status: draft.status,
      priority: draft.priority,
      start_date: draft.start_date || null,
      due_date: draft.due_date || null,
      tags,
      project_id: draft.project_id ?? null,
      parent_id: draft.parent_id ?? null,
    };
    if (draft.type === "project") setDraft(makeDraft("project", draft.id ? await updateProject.mutateAsync({ id: draft.id, ...payload }) : await createProject.mutateAsync(payload)));
    if (draft.type === "task") setDraft(makeDraft("task", draft.id ? await updateTask.mutateAsync({ id: draft.id, ...payload }) : await createTask.mutateAsync(payload)));
    if (draft.type === "wiki") setDraft(makeDraft("wiki", draft.id ? await updateWiki.mutateAsync({ id: draft.id, title: payload.title, body: payload.body, tags }) : await createWiki.mutateAsync({ title: payload.title, body: payload.body, tags })));
    if (draft.type === "note") {
      const saved = draft.id
        ? await updateNote.mutateAsync({ id: draft.id, title: payload.title, content: payload.body, tags })
        : await createNote.mutateAsync({ title: payload.title, content: payload.body, tags });
      setDraft(makeDraft("note", { ...saved, type: "note", body: saved.content } as WorkspaceObject));
    }
  };

  const remove = async () => {
    if (!draft.id || !window.confirm(t("workspace.delete_confirm", "Delete this item?"))) return;
    if (draft.type === "project") await deleteProject.mutateAsync(draft.id);
    if (draft.type === "task") await deleteTask.mutateAsync(draft.id);
    if (draft.type === "wiki") await deleteWiki.mutateAsync(draft.id);
    if (draft.type === "note") await deleteNote.mutateAsync(draft.id);
    onClose();
  };

  const addDependency = async () => {
    if (!draft.id || !(draft.type === "project" || draft.type === "task") || !dependencyTarget) return;
    const [target_type, target_id] = dependencyTarget.split(":") as ["project" | "task", string];
    await updateDependencies.mutateAsync([...dependencies, { source_type: draft.type, source_id: draft.id, target_type, target_id: Number(target_id), kind: "blocks" }]);
    setDependencyTarget("");
  };

  const removeDependency = async (target: WorkspaceDependency) => {
    await updateDependencies.mutateAsync(dependencies.filter((dep) => !(dep.source_type === target.source_type && dep.source_id === target.source_id && dep.target_type === target.target_type && dep.target_id === target.target_id)));
  };

  const runAssistant = async () => setAssistantResult(await assistant.mutateAsync({ kind: "workspace", title: draft.title, content: draft.body }));
  const outline = draft.body.match(/^#{1,6}\s+.+$/gm) ?? [];

  return (
    <aside className="fixed bottom-0 right-0 top-14 z-[90] flex w-full max-w-[520px] flex-col border-l border-line/70 bg-surface shadow-2xl shadow-black/25">
      <div className="flex items-center justify-between border-b border-line/60 px-5 py-4">
        <div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-t3">{draft.type}</div><h2 className="text-lg font-semibold text-t1">{isExisting ? draft.title : t("workspace.create", "Create item")}</h2></div>
        <button onClick={onClose} className="rounded-lg p-2 text-t3 hover:bg-line/30 hover:text-t1"><X size={17} /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <label className="block"><span className="label-xs mb-1.5 block">Title</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="w-full rounded-xl border border-line/60 bg-card px-3 py-2 text-sm text-t1 outline-none focus:border-accent/50" /></label>
        {(draft.type === "project" || draft.type === "task") && (
          <div className="grid grid-cols-2 gap-3">
            <label><span className="label-xs mb-1.5 block">Status</span><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as WorkspaceStatus })} className="w-full rounded-xl border border-line/60 bg-card px-3 py-2 text-sm text-t1 outline-none">{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
            <label><span className="label-xs mb-1.5 block">Priority</span><select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as WorkspacePriority })} className="w-full rounded-xl border border-line/60 bg-card px-3 py-2 text-sm text-t1 outline-none">{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
            <label><span className="label-xs mb-1.5 block">Start</span><input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} className="w-full rounded-xl border border-line/60 bg-card px-3 py-2 text-sm text-t1 outline-none" /></label>
            <label><span className="label-xs mb-1.5 block">Due</span><input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} className="w-full rounded-xl border border-line/60 bg-card px-3 py-2 text-sm text-t1 outline-none" /></label>
          </div>
        )}
        {draft.type === "task" && (
          <div className="grid grid-cols-2 gap-3">
            <label><span className="label-xs mb-1.5 block">Project</span><select value={draft.project_id ?? ""} onChange={(e) => setDraft({ ...draft, project_id: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-xl border border-line/60 bg-card px-3 py-2 text-sm text-t1 outline-none"><option value="">No project</option>{overview?.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
            <label><span className="label-xs mb-1.5 block">Parent task</span><select value={draft.parent_id ?? ""} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-xl border border-line/60 bg-card px-3 py-2 text-sm text-t1 outline-none"><option value="">No parent</option>{overview?.tasks.filter((task) => task.id !== draft.id).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          </div>
        )}
        <label className="block"><span className="label-xs mb-1.5 block">Tags</span><input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="homelab, runbook, project" className="w-full rounded-xl border border-line/60 bg-card px-3 py-2 text-sm text-t1 outline-none focus:border-accent/50" /></label>
        <label className="block"><span className="label-xs mb-1.5 block">Markdown</span><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={12} className="w-full resize-y rounded-xl border border-line/60 bg-card px-3 py-3 font-mono text-[13px] leading-6 text-t1 outline-none focus:border-accent/50" placeholder="Markdown, [[Wiki Links]], tasks, notes..." /></label>
        {(draft.type === "project" || draft.type === "task") && isExisting && (
          <section className="rounded-2xl border border-line/60 bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-t3"><GitBranch size={13} /> Dependencies</div>
            <div className="flex gap-2"><select value={dependencyTarget} onChange={(e) => setDependencyTarget(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-line/60 bg-surface px-3 py-2 text-sm text-t1 outline-none"><option value="">Blocks...</option>{dependencyOptions.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{item.type}: {item.title}</option>)}</select><button onClick={addDependency} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-bg">Add</button></div>
            <div className="mt-3 space-y-1">{currentDependencies.map((dep) => { const target = dependencyOptions.find((item) => item.type === dep.target_type && item.id === dep.target_id); return <div key={`${dep.target_type}:${dep.target_id}`} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-[12px] text-t2"><span>{target?.title ?? `${dep.target_type} #${dep.target_id}`}</span><button onClick={() => removeDependency(dep)} className="text-t3 hover:text-rose-400"><X size={13} /></button></div>; })}</div>
          </section>
        )}
        <section className="rounded-2xl border border-line/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-t3"><Bot size={13} /> Assistant</div><button onClick={runAssistant} disabled={assistant.isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-[12px] font-semibold text-accent disabled:opacity-50"><Sparkles size={12} /> Suggest</button></div>
          {assistantResult ? <div className="space-y-2 text-[12px] text-t2"><p>{assistantResult.suggestions.summary || "No summary available."}</p>{assistantResult.suggestions.tasks.length > 0 && <div className="rounded-lg bg-surface p-2"><strong className="text-t1">Tasks:</strong> {assistantResult.suggestions.tasks.join(" - ")}</div>}{assistantResult.suggestions.tags.length > 0 && <div className="flex flex-wrap gap-1">{assistantResult.suggestions.tags.map((tag) => <span key={tag.name} className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">{tag.name}</span>)}</div>}</div> : <p className="text-[12px] text-t3">Suggestions are shown here and must be applied manually.</p>}
        </section>
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line/60 bg-card p-4"><div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-t3">Outline</div>{outline.length ? outline.map((heading) => <div key={heading} className="truncate text-[12px] text-t2">{heading.replace(/^#+\s+/, "")}</div>) : <div className="text-[12px] text-t3">No headings.</div>}</div>
          <div className="rounded-2xl border border-line/60 bg-card p-4"><div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-t3">Backlinks</div>{backlinks.length ? backlinks.map((item) => <button key={`${item.type}:${item.id}`} onClick={() => setDraft(makeDraft(item.type, item))} className="block max-w-full truncate text-[12px] text-t2 hover:text-accent">{item.type}: {item.title}</button>) : <div className="text-[12px] text-t3">No backlinks.</div>}</div>
        </section>
      </div>
      <div className="flex gap-2 border-t border-line/60 p-4"><button onClick={save} className="flex-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg hover:opacity-90">Save</button>{isExisting && <button onClick={remove} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-t2 hover:border-rose-400/40 hover:text-rose-400"><Trash2 size={15} /></button>}</div>
    </aside>
  );
}

export default function WorkspacePage() {
  const { data: overview, isLoading } = useWorkspaceOverview();
  const createProject = useCreateWorkspaceProject();
  const createTask = useCreateWorkspaceTask();
  const createWiki = useCreateWorkspaceWiki();
  const createNote = useCreateNote();
  const reorderTasks = useReorderWorkspaceTasks();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const projects = overview?.projects ?? [];
  const tasks = overview?.tasks ?? [];
  const wiki = overview?.wiki ?? [];
  const notes = overview?.notes ?? [];
  const dependencies = overview?.dependencies ?? [];
  const filteredObjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: WorkspaceObject[] = [...projects, ...tasks, ...wiki, ...notes];
    return q ? all.filter((item) => [item.type, item.title, objectBody(item), ...item.tags].join(" ").toLowerCase().includes(q)) : all;
  }, [projects, tasks, wiki, notes, query]);
  const quickCreate = async (type: WorkspaceObjectType) => {
    if (type === "project") setDraft(makeDraft("project", await createProject.mutateAsync({ title: "New Project", body: "## Goal\n\n## Tasks\n", status: "backlog", priority: "medium" })));
    if (type === "task") setDraft(makeDraft("task", await createTask.mutateAsync({ title: "New Task", status: "todo", priority: "medium" })));
    if (type === "wiki") setDraft(makeDraft("wiki", await createWiki.mutateAsync({ title: "New Wiki Page", body: "## Overview\n" })));
    if (type === "note") { const note = await createNote.mutateAsync({ title: "New Note", content: "" }); setDraft(makeDraft("note", { ...note, type: "note", body: note.content } as WorkspaceObject)); }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = String(event.over?.id ?? "");
    if (!activeId.startsWith("task:") || !overId.startsWith("status:")) return;
    const taskId = Number(activeId.replace("task:", ""));
    const status = overId.replace("status:", "") as WorkspaceStatus;
    const nextTasks = tasks.map((task) => task.id === taskId ? { ...task, status } : task);
    reorderTasks.mutate(nextTasks.map((task, index) => ({ id: task.id, status: task.status, sort_order: index })));
  };
  const renderDashboard = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={FolderKanban} label="Active projects" value={overview?.stats.activeProjects ?? 0} />
        <StatCard icon={ListChecks} label="Open tasks" value={overview?.stats.openTasks ?? 0} />
        <StatCard icon={Archive} label="Blocked" value={overview?.stats.blockedTasks ?? 0} tone="warn" />
        <StatCard icon={CalendarDays} label="Due" value={overview?.stats.dueTasks ?? 0} />
        <StatCard icon={FileText} label="Wiki" value={overview?.stats.wikiPages ?? 0} />
        <StatCard icon={Layers3} label="Notes" value={overview?.stats.notes ?? 0} tone="ok" />
      </div>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-line/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-t1">Workspace feed</h2><span className="text-[11px] text-t3">{filteredObjects.length}</span></div>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{filteredObjects.slice(0, 9).map((item) => <ObjectCard key={`${item.type}:${item.id}`} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}</div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-line/60 bg-card p-4"><h2 className="mb-3 text-[15px] font-semibold text-t1">Quick capture</h2><div className="grid grid-cols-2 gap-2">{(["project", "task", "wiki", "note"] as WorkspaceObjectType[]).map((type) => <button key={type} onClick={() => quickCreate(type)} className="rounded-xl border border-line/60 bg-surface px-3 py-3 text-left text-sm font-semibold capitalize text-t1 hover:border-accent/35"><Plus size={14} className="mb-1" />{type}</button>)}</div></div>
          <div className="rounded-2xl border border-line/60 bg-card p-4"><h2 className="mb-3 text-[15px] font-semibold text-t1">Due soon</h2><div className="space-y-2">{tasks.filter((task) => task.due_date && task.status !== "done").slice(0, 6).map((task) => <button key={task.id} onClick={() => setDraft(makeDraft("task", task))} className="flex w-full items-center justify-between rounded-lg bg-surface px-3 py-2 text-left text-sm text-t2 hover:text-accent"><span className="truncate">{task.title}</span><span className="text-[11px] text-t3">{formatDate(task.due_date)}</span></button>)}{!tasks.some((task) => task.due_date && task.status !== "done") && <p className="text-sm text-t3">No due tasks.</p>}</div></div>
        </div>
      </section>
    </div>
  );
  const renderBoard = () => <DndContext onDragEnd={handleDragEnd}><div className="grid min-w-[1100px] grid-cols-5 gap-3">{statuses.map((status) => <BoardColumn key={status} status={status} tasks={tasks.filter((task) => task.status === status)} projects={projects} onOpen={(item) => setDraft(makeDraft(item.type, item))} />)}</div></DndContext>;
  const renderList = () => <div className="overflow-hidden rounded-2xl border border-line/60 bg-card"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-t3"><tr><th className="px-4 py-3">Title</th><th>Status</th><th>Priority</th><th>Project</th><th>Due</th><th>Tags</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id} onClick={() => setDraft(makeDraft("task", task))} className="cursor-pointer border-t border-line/50 hover:bg-surface/70"><td className="px-4 py-3 font-medium text-t1">{task.title}</td><td>{statusLabel(task.status)}</td><td><span className={`rounded-full border px-2 py-1 text-[11px] ${priorityClass(task.priority)}`}>{task.priority}</span></td><td className="text-t2">{projects.find((project) => project.id === task.project_id)?.title ?? "-"}</td><td className="text-t2">{formatDate(task.due_date)}</td><td className="text-t3">{task.tags.slice(0, 3).join(", ")}</td></tr>)}</tbody></table></div>;
  const renderCalendar = () => <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[...projects, ...tasks].filter((item) => item.due_date).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))).map((item) => <button key={`${item.type}:${item.id}`} onClick={() => setDraft(makeDraft(item.type, item))} className="rounded-2xl border border-line/60 bg-card p-4 text-left hover:border-accent/35"><div className="text-[11px] uppercase tracking-[0.16em] text-t3">{item.type} - {formatDate(item.due_date)}</div><div className="mt-2 text-[15px] font-semibold text-t1">{item.title}</div></button>)}</div>;
  const renderTimeline = () => <div className="space-y-3 rounded-2xl border border-line/60 bg-card p-4">{[...projects, ...tasks].filter((item) => item.start_date || item.due_date).sort((a, b) => String(a.start_date ?? a.due_date).localeCompare(String(b.start_date ?? b.due_date))).map((item) => <button key={`${item.type}:${item.id}`} onClick={() => setDraft(makeDraft(item.type, item))} className="grid w-full grid-cols-[120px_1fr_120px] items-center gap-3 rounded-xl bg-surface px-3 py-3 text-left text-sm"><span className="text-t3">{formatDate(item.start_date)}</span><span className="font-semibold text-t1">{item.title}</span><span className="text-right text-t3">{formatDate(item.due_date)}</span></button>)}<div className="pt-2 text-[12px] text-t3">Dependencies: {dependencies.length}</div></div>;
  const renderMindmap = () => <div className="relative min-h-[560px] overflow-hidden rounded-2xl border border-line/60 bg-card p-6"><div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3 text-sm font-semibold text-accent">Workspace</div><div className="grid h-full grid-cols-3 gap-8 pt-24"><div className="space-y-3"><h3 className="label-xs">Projects</h3>{projects.slice(0, 8).map((item) => <ObjectCard key={item.id} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}</div><div className="space-y-3"><h3 className="label-xs">Tasks</h3>{tasks.slice(0, 10).map((item) => <ObjectCard key={item.id} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}</div><div className="space-y-3"><h3 className="label-xs">Wiki + Notes</h3>{[...wiki, ...notes].slice(0, 8).map((item) => <ObjectCard key={`${item.type}:${item.id}`} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}</div></div></div>;
  const renderCards = (items: WorkspaceObject[]) => <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{items.map((item) => <ObjectCard key={`${item.type}:${item.id}`} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}</div>;
  const content = activeTab === "dashboard" ? renderDashboard() : activeTab === "board" ? renderBoard() : activeTab === "list" ? renderList() : activeTab === "calendar" ? renderCalendar() : activeTab === "timeline" ? renderTimeline() : activeTab === "mindmap" ? renderMindmap() : activeTab === "projects" ? renderCards(projects) : activeTab === "wiki" ? renderCards(wiki) : renderCards(notes);
  if (isLoading) return <div className="p-6 text-t2">Loading workspace...</div>;
  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="label-xs mb-1">Knowledge + Projects</div><h1 className="text-2xl font-semibold tracking-tight text-t1">Workspace</h1></div><div className="flex flex-wrap gap-2"><button onClick={() => quickCreate("project")} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-bg"><Plus size={14} className="mr-1 inline" />Project</button><button onClick={() => quickCreate("task")} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-t2 hover:text-accent"><Plus size={14} className="mr-1 inline" />Task</button></div></div>
      <div className="flex flex-col gap-3 rounded-2xl border border-line/60 bg-card p-3 xl:flex-row xl:items-center"><div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-line/60 bg-surface px-3 py-2"><Search size={15} className="text-t3" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search type:, tag:, project:, status:, priority:, due:..." className="min-w-0 flex-1 bg-transparent text-sm text-t1 outline-none placeholder:text-t3" /></div><div className="flex gap-1 overflow-x-auto">{tabs.map((tab) => { const Icon = tab === "dashboard" ? BarChart3 : tab === "board" ? Blocks : tab === "list" ? ListChecks : tab === "calendar" ? CalendarDays : tab === "timeline" ? GitBranch : tab === "mindmap" ? Network : tab === "projects" ? FolderKanban : tab === "wiki" ? Link2 : FileText; return <button key={tab} onClick={() => setActiveTab(tab)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? "bg-accent text-bg" : "text-t2 hover:bg-line/30 hover:text-t1"}`}><Icon size={14} />{tab}</button>; })}</div></div>
      <div className="overflow-x-auto">{content}</div>
      {draft && <WorkspaceDrawer draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} overview={overview} />}
    </div>
  );
}
