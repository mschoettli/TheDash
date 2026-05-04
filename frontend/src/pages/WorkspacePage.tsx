import { lazy, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive,
  BarChart3,
  Blocks,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
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
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ConfirmDialog from "../components/ui/ConfirmDialog";
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

const NotesPage = lazy(() => import("./NotesPage"));

const statuses: WorkspaceStatus[] = ["backlog", "todo", "doing", "blocked", "done"];
const priorities: WorkspacePriority[] = ["low", "medium", "high", "urgent"];
const tabs = ["dashboard", "board", "list", "calendar", "timeline", "mindmap", "projects", "wiki", "notes"] as const;

type WorkspaceTab = (typeof tabs)[number];
type SaveState = "idle" | "saving" | "saved" | "error";

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

function objectBody(item: WorkspaceObject): string {
  return item.body;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[*_`>#-]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function makeDraft(type: WorkspaceObjectType, item?: WorkspaceObject): Draft {
  if (!item) {
    return {
      type,
      title: "",
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

function typeTone(type: WorkspaceObjectType): string {
  if (type === "project") return "workspace-tone-project";
  if (type === "task") return "workspace-tone-task";
  if (type === "wiki") return "workspace-tone-wiki";
  return "workspace-tone-note";
}

function priorityClass(priority: WorkspacePriority): string {
  if (priority === "urgent") return "border-rose-400/35 bg-rose-500/12 text-rose-500";
  if (priority === "high") return "border-amber-400/35 bg-amber-500/12 text-amber-500";
  if (priority === "low") return "border-line/60 bg-line/20 text-t3";
  return "border-cyan-400/35 bg-cyan-500/12 text-cyan-600 dark:text-cyan-300";
}

function statusClass(status: WorkspaceStatus): string {
  if (status === "blocked") return "border-rose-400/35 bg-rose-500/12 text-rose-500";
  if (status === "doing") return "border-cyan-400/35 bg-cyan-500/12 text-cyan-600 dark:text-cyan-300";
  if (status === "done") return "border-emerald-400/35 bg-emerald-500/12 text-emerald-600 dark:text-emerald-300";
  if (status === "todo") return "border-blue-400/35 bg-blue-500/12 text-blue-600 dark:text-blue-300";
  return "border-slate-400/30 bg-slate-500/10 text-t2";
}

function parseTags(value: string): string[] {
  return Array.from(new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean)));
}

function useFilteredObjects(items: WorkspaceObject[], query: string, projects: WorkspaceProject[]) {
  return useMemo(() => {
    const parts = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const operators = parts.filter((part) => part.includes(":"));
    const textTerms = parts.filter((part) => !part.includes(":"));

    return items.filter((item) => {
      const haystack = [item.type, item.title, objectBody(item), ...item.tags].join(" ").toLowerCase();
      const textMatch = textTerms.every((term) => haystack.includes(term));
      const operatorMatch = operators.every((operator) => {
        const [key, ...rest] = operator.split(":");
        const value = rest.join(":");
        if (!value) return true;
        if (key === "type") return item.type === value;
        if (key === "tag") return item.tags.some((tag) => tag.toLowerCase().includes(value));
        if (key === "status") return (item.type === "project" || item.type === "task") && item.status === value;
        if (key === "priority") return (item.type === "project" || item.type === "task") && item.priority === value;
        if (key === "project" && item.type === "task") {
          return projects.find((project) => project.id === item.project_id)?.title.toLowerCase().includes(value) ?? false;
        }
        if (key === "due") {
          if (!(item.type === "project" || item.type === "task") || !item.due_date) return false;
          if (value === "overdue") return new Date(item.due_date) < new Date() && item.status !== "done";
          if (value === "set") return true;
          return item.due_date.includes(value);
        }
        return true;
      });
      return textMatch && operatorMatch;
    });
  }, [items, projects, query]);
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`workspace-stat ${tone}`}>
      <div>
        <div className="text-2xl font-semibold text-t1">{value}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-t2">{label}</div>
      </div>
      <span className="workspace-stat-icon">
        <Icon size={18} />
      </span>
    </div>
  );
}

function ObjectCard({
  item,
  onOpen,
}: {
  item: WorkspaceObject;
  onOpen: (item: WorkspaceObject) => void;
}) {
  const { t } = useTranslation();
  const body = stripMarkdown(objectBody(item));

  return (
    <button onClick={() => onOpen(item)} className={`workspace-object-card ${typeTone(item.type)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`workspace-type-label ${typeTone(item.type)}`}>{t(`workspace.type_${item.type}`)}</div>
          <div className="mt-1 truncate text-[15px] font-semibold text-t1">{item.title}</div>
        </div>
        <span className="rounded-full border border-line/50 bg-surface px-2 py-0.5 text-[10px] text-t3">
          {formatDate(item.updated_at)}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-[12px] leading-5 text-t2">
        {body || t("workspace.no_content")}
      </p>
      <div className="mt-3 flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
        {item.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="workspace-tag">
            {tag}
          </span>
        ))}
        {item.tags.length > 3 && <span className="text-[10px] text-t3">+{item.tags.length - 3}</span>}
      </div>
    </button>
  );
}

function SortableTaskCard({
  task,
  project,
  onOpen,
}: {
  task: WorkspaceTask;
  project?: WorkspaceProject;
  onOpen: (item: WorkspaceObject) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task:${task.id}`,
    data: { status: task.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`workspace-task-card ${isDragging ? "opacity-40" : ""}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-t3 active:cursor-grabbing">
        <GripVertical size={14} />
      </button>
      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[13px] font-semibold text-t1">{task.title}</div>
        {project && <div className="mt-0.5 truncate text-[11px] text-t3">{project.title}</div>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityClass(task.priority)}`}>
            {t(`workspace.priority_${task.priority}`)}
          </span>
          {task.due_date && (
            <span className="rounded-full border border-line/50 bg-surface px-2 py-0.5 text-[10px] text-t3">
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

function BoardColumn({
  status,
  tasks,
  projects,
  onOpen,
  label,
}: {
  status: WorkspaceStatus;
  tasks: WorkspaceTask[];
  projects: WorkspaceProject[];
  onOpen: (item: WorkspaceObject) => void;
  label: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `status:${status}` });

  return (
    <section ref={setNodeRef} className={`workspace-board-column ${statusClass(status)} ${isOver ? "ring-2 ring-accent/30" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em]">{label}</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-t3">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((task) => `task:${task.id}`)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              project={projects.find((project) => project.id === task.project_id)}
              onOpen={onOpen}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

function FilterChip({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: (value: string) => void;
}) {
  return (
    <button onClick={() => onClick(value)} className="workspace-filter-chip">
      {label}
    </button>
  );
}

function WorkspaceDrawer({
  draft,
  setDraft,
  onClose,
  overview,
}: {
  draft: Draft;
  setDraft: (draft: Draft | null) => void;
  onClose: () => void;
  overview: ReturnType<typeof useWorkspaceOverview>["data"];
}) {
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
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isExisting = Boolean(draft.id);
  const isPlanning = draft.type === "project" || draft.type === "task";
  const tags = parseTags(draft.tags);
  const dependencies = overview?.dependencies ?? [];
  const dependencyOptions = [
    ...(overview?.projects ?? []).map((project) => ({ type: "project" as const, id: project.id, title: project.title })),
    ...(overview?.tasks ?? []).map((task) => ({ type: "task" as const, id: task.id, title: task.title })),
  ].filter((item) => !(item.type === draft.type && item.id === draft.id));
  const currentDependencies = isExisting && (draft.type === "project" || draft.type === "task")
    ? dependencies.filter((dep) => dep.source_type === draft.type && dep.source_id === draft.id)
    : [];
  const outline = draft.body.match(/^#{1,6}\s+.+$/gm) ?? [];

  const save = async () => {
    setSaveState("saving");
    setError("");
    try {
      const payload = {
        title: draft.title.trim() || t("workspace.untitled"),
        body: draft.body,
        status: draft.status,
        priority: draft.priority,
        start_date: draft.start_date || null,
        due_date: draft.due_date || null,
        tags,
        project_id: draft.project_id ?? null,
        parent_id: draft.parent_id ?? null,
      };

      if (draft.type === "project") {
        setDraft(makeDraft("project", draft.id ? await updateProject.mutateAsync({ id: draft.id, ...payload }) : await createProject.mutateAsync(payload)));
      }
      if (draft.type === "task") {
        setDraft(makeDraft("task", draft.id ? await updateTask.mutateAsync({ id: draft.id, ...payload }) : await createTask.mutateAsync(payload)));
      }
      if (draft.type === "wiki") {
        const wikiPayload = { title: payload.title, body: payload.body, tags };
        setDraft(makeDraft("wiki", draft.id ? await updateWiki.mutateAsync({ id: draft.id, ...wikiPayload }) : await createWiki.mutateAsync(wikiPayload)));
      }
      if (draft.type === "note") {
        const saved = draft.id
          ? await updateNote.mutateAsync({ id: draft.id, title: payload.title, content: payload.body, tags })
          : await createNote.mutateAsync({ title: payload.title, content: payload.body, tags });
        setDraft(makeDraft("note", { ...saved, type: "note", body: saved.content } as WorkspaceObject));
      }
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : t("workspace.save_error"));
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    setSaveState("saving");
    try {
      if (draft.type === "project") await deleteProject.mutateAsync(draft.id);
      if (draft.type === "task") await deleteTask.mutateAsync(draft.id);
      if (draft.type === "wiki") await deleteWiki.mutateAsync(draft.id);
      if (draft.type === "note") await deleteNote.mutateAsync(draft.id);
      onClose();
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : t("workspace.delete_error"));
    }
  };

  const addDependency = async () => {
    if (!draft.id || !(draft.type === "project" || draft.type === "task") || !dependencyTarget) return;
    const [target_type, target_id] = dependencyTarget.split(":") as ["project" | "task", string];
    await updateDependencies.mutateAsync([
      ...dependencies,
      { source_type: draft.type, source_id: draft.id, target_type, target_id: Number(target_id), kind: "blocks" },
    ]);
    setDependencyTarget("");
  };

  const removeDependency = async (target: WorkspaceDependency) => {
    await updateDependencies.mutateAsync(
      dependencies.filter(
        (dep) =>
          !(dep.source_type === target.source_type &&
            dep.source_id === target.source_id &&
            dep.target_type === target.target_type &&
            dep.target_id === target.target_id),
      ),
    );
  };

  const runAssistant = async () => {
    setAssistantResult(await assistant.mutateAsync({ kind: "workspace", title: draft.title, content: draft.body }));
  };

  return (
    <>
      <aside className="workspace-drawer">
        <div className="flex items-center justify-between border-b border-line/60 px-5 py-4">
          <div>
            <div className={`workspace-type-label ${typeTone(draft.type)}`}>{t(`workspace.type_${draft.type}`)}</div>
            <h2 className="text-lg font-semibold text-t1">
              {isExisting ? draft.title : t("workspace.create_item")}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-t3 hover:bg-line/30 hover:text-t1">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div>}

          <section className="workspace-drawer-section workspace-tone-project">
            <h3 className="workspace-section-title">{t("workspace.basics")}</h3>
            <label className="block">
              <span className="label-xs mb-1.5 block">{t("workspace.title_field")}</span>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="workspace-input" />
            </label>
          </section>

          {isPlanning && (
            <section className="workspace-drawer-section workspace-tone-task">
              <h3 className="workspace-section-title">{t("workspace.planning")}</h3>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label-xs mb-1.5 block">{t("workspace.status")}</span>
                  <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as WorkspaceStatus })} className="workspace-input">
                    {statuses.map((status) => <option key={status} value={status}>{t(`workspace.status_${status}`)}</option>)}
                  </select>
                </label>
                <label>
                  <span className="label-xs mb-1.5 block">{t("workspace.priority")}</span>
                  <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as WorkspacePriority })} className="workspace-input">
                    {priorities.map((priority) => <option key={priority} value={priority}>{t(`workspace.priority_${priority}`)}</option>)}
                  </select>
                </label>
                <label>
                  <span className="label-xs mb-1.5 block">{t("workspace.start_date")}</span>
                  <input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} className="workspace-input" />
                </label>
                <label>
                  <span className="label-xs mb-1.5 block">{t("workspace.due_date")}</span>
                  <input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} className="workspace-input" />
                </label>
              </div>
              {draft.type === "task" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label>
                    <span className="label-xs mb-1.5 block">{t("workspace.project")}</span>
                    <select value={draft.project_id ?? ""} onChange={(e) => setDraft({ ...draft, project_id: e.target.value ? Number(e.target.value) : null })} className="workspace-input">
                      <option value="">{t("workspace.no_project")}</option>
                      {overview?.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="label-xs mb-1.5 block">{t("workspace.parent_task")}</span>
                    <select value={draft.parent_id ?? ""} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value ? Number(e.target.value) : null })} className="workspace-input">
                      <option value="">{t("workspace.no_parent")}</option>
                      {overview?.tasks.filter((task) => task.id !== draft.id).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                    </select>
                  </label>
                </div>
              )}
            </section>
          )}

          <section className="workspace-drawer-section workspace-tone-note">
            <h3 className="workspace-section-title">{t("workspace.markdown")}</h3>
            <label className="block">
              <span className="label-xs mb-1.5 block">{t("workspace.tags")}</span>
              <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder={t("workspace.tags_placeholder")} className="workspace-input" />
            </label>
            <label className="mt-3 block">
              <span className="label-xs mb-1.5 block">{t("workspace.body")}</span>
              <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={12} className="workspace-textarea" placeholder={t("workspace.markdown_placeholder")} />
            </label>
          </section>

          {isPlanning && isExisting && (
            <section className="workspace-drawer-section workspace-tone-wiki">
              <h3 className="workspace-section-title">{t("workspace.relations")}</h3>
              <div className="flex gap-2">
                <select value={dependencyTarget} onChange={(e) => setDependencyTarget(e.target.value)} className="workspace-input min-w-0 flex-1">
                  <option value="">{t("workspace.blocks")}</option>
                  {dependencyOptions.map((item) => (
                    <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>
                      {t(`workspace.type_${item.type}`)}: {item.title}
                    </option>
                  ))}
                </select>
                <button onClick={addDependency} className="workspace-primary-button px-3">{t("workspace.add")}</button>
              </div>
              <div className="mt-3 space-y-1">
                {currentDependencies.map((dep) => {
                  const target = dependencyOptions.find((item) => item.type === dep.target_type && item.id === dep.target_id);
                  return (
                    <div key={`${dep.target_type}:${dep.target_id}`} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-[12px] text-t2">
                      <span>{target?.title ?? `${dep.target_type} #${dep.target_id}`}</span>
                      <button onClick={() => removeDependency(dep)} className="text-t3 hover:text-rose-400"><X size={13} /></button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="workspace-drawer-section workspace-tone-wiki">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="workspace-section-title">{t("workspace.ai_suggestions")}</h3>
              <button onClick={runAssistant} disabled={assistant.isPending} className="workspace-secondary-button">
                <Sparkles size={12} /> {assistant.isPending ? t("workspace.suggesting") : t("workspace.suggest")}
              </button>
            </div>
            {assistantResult ? (
              <div className="space-y-2 text-[12px] text-t2">
                <p>{assistantResult.suggestions.summary || t("workspace.no_summary")}</p>
                {assistantResult.suggestions.tasks.length > 0 && (
                  <div className="rounded-lg bg-surface p-2">
                    <strong className="text-t1">{t("workspace.tasks")}:</strong> {assistantResult.suggestions.tasks.join(" - ")}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {assistantResult.suggestions.tags.map((tag) => <span key={tag.name} className="workspace-tag">{tag.name}</span>)}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-t3">{t("workspace.suggestions_manual")}</p>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="workspace-drawer-section">
              <h3 className="workspace-section-title">{t("workspace.outline")}</h3>
              {outline.length ? outline.map((heading) => <div key={heading} className="truncate text-[12px] text-t2">{heading.replace(/^#+\s+/, "")}</div>) : <div className="text-[12px] text-t3">{t("workspace.no_headings")}</div>}
            </div>
            <div className="workspace-drawer-section">
              <h3 className="workspace-section-title">{t("workspace.backlinks")}</h3>
              {backlinks.length ? backlinks.map((item) => (
                <button key={`${item.type}:${item.id}`} onClick={() => setDraft(makeDraft(item.type, item))} className="block max-w-full truncate text-[12px] text-t2 hover:text-accent">
                  {t(`workspace.type_${item.type}`)}: {item.title}
                </button>
              )) : <div className="text-[12px] text-t3">{t("workspace.no_backlinks")}</div>}
            </div>
          </section>
        </div>

        <div className="flex items-center gap-2 border-t border-line/60 p-4">
          <span className="min-w-0 flex-1 text-[12px] text-t3">
            {saveState === "saving" ? t("workspace.saving") : saveState === "saved" ? t("workspace.saved") : saveState === "error" ? t("workspace.save_error") : ""}
          </span>
          {isExisting && (
            <button onClick={() => setDeleteOpen(true)} className="workspace-danger-button">
              <Trash2 size={15} /> {t("common.delete")}
            </button>
          )}
          <button onClick={save} disabled={saveState === "saving"} className="workspace-primary-button min-w-[140px]">
            {saveState === "saving" ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={deleteOpen}
        title={t("workspace.delete_title")}
        description={t("workspace.delete_description", { title: draft.title || t("workspace.untitled") })}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={remove}
        isPending={saveState === "saving"}
      />
    </>
  );
}

export default function WorkspacePage() {
  const { t } = useTranslation();
  const { data: overview, isLoading } = useWorkspaceOverview();
  const createProject = useCreateWorkspaceProject();
  const createTask = useCreateWorkspaceTask();
  const createWiki = useCreateWorkspaceWiki();
  const createNote = useCreateNote();
  const reorderTasks = useReorderWorkspaceTasks();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const projects = overview?.projects ?? [];
  const tasks = overview?.tasks ?? [];
  const wiki = overview?.wiki ?? [];
  const notes = overview?.notes ?? [];
  const dependencies = overview?.dependencies ?? [];
  const allObjects = useMemo<WorkspaceObject[]>(() => [...projects, ...tasks, ...wiki, ...notes], [projects, tasks, wiki, notes]);
  const filteredObjects = useFilteredObjects(allObjects, query, projects);

  const quickCreate = async (type: WorkspaceObjectType) => {
    if (type === "project") setDraft(makeDraft("project", await createProject.mutateAsync({ title: t("workspace.new_project"), body: "## Goal\n\n## Tasks\n", status: "backlog", priority: "medium" })));
    if (type === "task") setDraft(makeDraft("task", await createTask.mutateAsync({ title: t("workspace.new_task"), status: "todo", priority: "medium" })));
    if (type === "wiki") setDraft(makeDraft("wiki", await createWiki.mutateAsync({ title: t("workspace.new_wiki"), body: "## Overview\n" })));
    if (type === "note") {
      const note = await createNote.mutateAsync({ title: t("workspace.new_note"), content: "" });
      setDraft(makeDraft("note", { ...note, type: "note", body: note.content } as WorkspaceObject));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = String(event.over?.id ?? "");
    if (!activeId.startsWith("task:") || !overId) return;

    const activeTaskId = Number(activeId.replace("task:", ""));
    const activeTask = tasks.find((task) => task.id === activeTaskId);
    if (!activeTask) return;

    const overTaskId = overId.startsWith("task:") ? Number(overId.replace("task:", "")) : null;
    const overTask = overTaskId ? tasks.find((task) => task.id === overTaskId) : null;
    const targetStatus = overId.startsWith("status:")
      ? overId.replace("status:", "") as WorkspaceStatus
      : overTask?.status;
    if (!targetStatus) return;

    const sourceStatus = activeTask.status;
    const sourceTasks = tasks.filter((task) => task.status === sourceStatus);
    const targetTasks = tasks.filter((task) => task.status === targetStatus);

    let changed: WorkspaceTask[];
    if (sourceStatus === targetStatus && overTaskId) {
      changed = arrayMove(
        sourceTasks,
        sourceTasks.findIndex((task) => task.id === activeTaskId),
        sourceTasks.findIndex((task) => task.id === overTaskId),
      );
    } else {
      changed = targetTasks.filter((task) => task.id !== activeTaskId);
      const targetIndex = overTaskId ? changed.findIndex((task) => task.id === overTaskId) : changed.length;
      changed.splice(targetIndex >= 0 ? targetIndex : changed.length, 0, { ...activeTask, status: targetStatus });
    }

    reorderTasks.mutate(changed.map((task, index) => ({ id: task.id, status: targetStatus, sort_order: index })));
  };

  const renderDashboard = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={FolderKanban} label={t("workspace.active_projects")} value={overview?.stats.activeProjects ?? 0} tone="workspace-tone-project" />
        <StatCard icon={ListChecks} label={t("workspace.open_tasks")} value={overview?.stats.openTasks ?? 0} tone="workspace-tone-task" />
        <StatCard icon={Archive} label={t("workspace.blocked")} value={overview?.stats.blockedTasks ?? 0} tone="workspace-tone-danger" />
        <StatCard icon={CalendarDays} label={t("workspace.due")} value={overview?.stats.dueTasks ?? 0} tone="workspace-tone-warn" />
        <StatCard icon={FileText} label={t("workspace.wiki")} value={overview?.stats.wikiPages ?? 0} tone="workspace-tone-wiki" />
        <StatCard icon={Layers3} label={t("workspace.notes")} value={overview?.stats.notes ?? 0} tone="workspace-tone-note" />
      </div>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="workspace-panel">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-t1">{t("workspace.feed")}</h2>
            <span className="text-[11px] text-t3">{filteredObjects.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filteredObjects.slice(0, 9).map((item) => <ObjectCard key={`${item.type}:${item.id}`} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="workspace-panel">
            <h2 className="mb-3 text-[15px] font-semibold text-t1">{t("workspace.quick_capture")}</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["project", "task", "wiki", "note"] as WorkspaceObjectType[]).map((type) => (
                <button key={type} onClick={() => quickCreate(type)} className={`workspace-create-card ${typeTone(type)}`}>
                  <Plus size={14} className="mb-1" />{t(`workspace.type_${type}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="workspace-panel">
            <h2 className="mb-3 text-[15px] font-semibold text-t1">{t("workspace.due_soon")}</h2>
            <div className="space-y-2">
              {tasks.filter((task) => task.due_date && task.status !== "done").slice(0, 6).map((task) => (
                <button key={task.id} onClick={() => setDraft(makeDraft("task", task))} className="flex w-full items-center justify-between rounded-lg bg-surface px-3 py-2 text-left text-sm text-t2 hover:text-accent">
                  <span className="truncate">{task.title}</span>
                  <span className="text-[11px] text-t3">{formatDate(task.due_date)}</span>
                </button>
              ))}
              {!tasks.some((task) => task.due_date && task.status !== "done") && <p className="text-sm text-t3">{t("workspace.no_due_tasks")}</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderBoard = () => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid min-w-[1100px] grid-cols-5 gap-3">
        {statuses.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            label={t(`workspace.status_${status}`)}
            tasks={tasks.filter((task) => task.status === status)}
            projects={projects}
            onOpen={(item) => setDraft(makeDraft(item.type, item))}
          />
        ))}
      </div>
    </DndContext>
  );

  const renderList = () => (
    <div className="overflow-hidden rounded-2xl border border-line/60 bg-card">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-t3">
          <tr><th className="px-4 py-3">{t("workspace.title_field")}</th><th>{t("workspace.status")}</th><th>{t("workspace.priority")}</th><th>{t("workspace.project")}</th><th>{t("workspace.due_date")}</th><th>{t("workspace.tags")}</th></tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} onClick={() => setDraft(makeDraft("task", task))} className="cursor-pointer border-t border-line/50 hover:bg-surface/70">
              <td className="px-4 py-3 font-medium text-t1">{task.title}</td>
              <td><span className={`rounded-full border px-2 py-1 text-[11px] ${statusClass(task.status)}`}>{t(`workspace.status_${task.status}`)}</span></td>
              <td><span className={`rounded-full border px-2 py-1 text-[11px] ${priorityClass(task.priority)}`}>{t(`workspace.priority_${task.priority}`)}</span></td>
              <td className="text-t2">{projects.find((project) => project.id === task.project_id)?.title ?? "-"}</td>
              <td className="text-t2">{formatDate(task.due_date)}</td>
              <td className="text-t3">{task.tags.slice(0, 3).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCalendar = () => {
    const dated = [...projects, ...tasks].filter((item) => item.due_date).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dated.map((item) => (
          <button key={`${item.type}:${item.id}`} onClick={() => setDraft(makeDraft(item.type, item))} className={`workspace-date-card ${typeTone(item.type)}`}>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-t3"><CalendarDays size={13} />{formatDate(item.due_date)}</div>
            <div className="mt-2 text-[15px] font-semibold text-t1">{item.title}</div>
          </button>
        ))}
      </div>
    );
  };

  const renderTimeline = () => {
    const items = [...projects, ...tasks].filter((item) => item.start_date || item.due_date).sort((a, b) => String(a.start_date ?? a.due_date).localeCompare(String(b.start_date ?? b.due_date)));
    return (
      <div className="workspace-panel space-y-3">
        {items.map((item) => (
          <button key={`${item.type}:${item.id}`} onClick={() => setDraft(makeDraft(item.type, item))} className={`workspace-timeline-row ${typeTone(item.type)}`}>
            <span className="text-t3">{formatDate(item.start_date)}</span>
            <span className="font-semibold text-t1">{item.title}</span>
            <span className="text-right text-t3">{formatDate(item.due_date)}</span>
          </button>
        ))}
        <div className="pt-2 text-[12px] text-t3">{t("workspace.dependencies")}: {dependencies.length}</div>
      </div>
    );
  };

  const renderMindmap = () => (
    <div className="workspace-mindmap">
      <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3 text-sm font-semibold text-accent">
        {t("workspace.title")}
      </div>
      <div className="grid h-full grid-cols-3 gap-8 pt-24">
        <div className="space-y-3"><h3 className="label-xs">{t("workspace.projects")}</h3>{projects.slice(0, 8).map((item) => <ObjectCard key={item.id} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}</div>
        <div className="space-y-3"><h3 className="label-xs">{t("workspace.tasks")}</h3>{tasks.slice(0, 10).map((item) => <ObjectCard key={item.id} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}</div>
        <div className="space-y-3"><h3 className="label-xs">{t("workspace.wiki_notes")}</h3>{[...wiki, ...notes].slice(0, 8).map((item) => <ObjectCard key={`${item.type}:${item.id}`} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}</div>
      </div>
    </div>
  );

  const renderCards = (items: WorkspaceObject[]) => (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((item) => <ObjectCard key={`${item.type}:${item.id}`} item={item} onOpen={(target) => setDraft(makeDraft(target.type, target))} />)}
    </div>
  );

  const content =
    activeTab === "dashboard" ? renderDashboard() :
    activeTab === "board" ? renderBoard() :
    activeTab === "list" ? renderList() :
    activeTab === "calendar" ? renderCalendar() :
    activeTab === "timeline" ? renderTimeline() :
    activeTab === "mindmap" ? renderMindmap() :
    activeTab === "projects" ? renderCards(projects) :
    activeTab === "wiki" ? renderCards(wiki) :
    <Suspense fallback={<div className="workspace-panel text-sm text-t2">{t("workspace.loading_notes")}</div>}>
      <NotesPage />
    </Suspense>;

  if (isLoading) return <div className="p-6 text-t2">{t("workspace.loading")}</div>;

  return (
    <div className="workspace-page space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-xs mb-1">{t("workspace.kicker")}</div>
          <h1 className="text-2xl font-semibold tracking-tight text-t1">{t("workspace.title")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => quickCreate("project")} className="workspace-primary-button"><Plus size={14} />{t("workspace.project")}</button>
          <button onClick={() => quickCreate("task")} className="workspace-secondary-button"><Plus size={14} />{t("workspace.task")}</button>
        </div>
      </div>

      <div className="workspace-command-bar">
        <div className="workspace-search">
          <Search size={15} className="text-t3" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("workspace.search_placeholder")} className="min-w-0 flex-1 bg-transparent text-sm text-t1 outline-none placeholder:text-t3" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab === "dashboard" ? BarChart3 : tab === "board" ? Blocks : tab === "list" ? ListChecks : tab === "calendar" ? CalendarDays : tab === "timeline" ? GitBranch : tab === "mindmap" ? Network : tab === "projects" ? FolderKanban : tab === "wiki" ? Link2 : FileText;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`workspace-tab ${activeTab === tab ? "workspace-tab-active" : ""}`}>
                <Icon size={14} />{t(`workspace.tab_${tab}`)}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab !== "notes" && (
        <div className="flex flex-wrap gap-2">
          {(["project", "task", "wiki", "note"] as WorkspaceObjectType[]).map((type) => <FilterChip key={type} label={t(`workspace.type_${type}`)} value={`type:${type}`} onClick={setQuery} />)}
          {statuses.map((status) => <FilterChip key={status} label={t(`workspace.status_${status}`)} value={`status:${status}`} onClick={setQuery} />)}
          {priorities.map((priority) => <FilterChip key={priority} label={t(`workspace.priority_${priority}`)} value={`priority:${priority}`} onClick={setQuery} />)}
        </div>
      )}

      <div className="overflow-x-auto">{content}</div>
      {draft && <WorkspaceDrawer draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} overview={overview} />}
    </div>
  );
}
