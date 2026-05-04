import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import MDEditor from "@uiw/react-md-editor";
import {
  Archive,
  BarChart3,
  BookOpen,
  Blocks,
  CalendarDays,
  CheckSquare,
  Circle,
  Edit3,
  FileText,
  FolderKanban,
  GripHorizontal,
  GripVertical,
  Link2,
  ListChecks,
  Network,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { MarkdownHelpButton } from "../components/ui/MarkdownHelp";
import {
  useCreateWorkspaceBoard,
  useCreateWorkspaceColumn,
  useCreateWorkspaceLabel,
  useCreateWorkspaceProject,
  useCreateWorkspaceTag,
  useCreateWorkspaceTask,
  useCreateWorkspaceWiki,
  useDeleteWorkspaceBoard,
  useDeleteWorkspaceColumn,
  useDeleteWorkspaceLabel,
  useDeleteWorkspaceProject,
  useDeleteWorkspaceTag,
  useDeleteWorkspaceTask,
  useDeleteWorkspaceWiki,
  useReorderWorkspaceBoard,
  useUpdateWorkspaceBoard,
  useUpdateWorkspaceColumn,
  useUpdateWorkspaceDependencies,
  useUpdateWorkspaceLabel,
  useUpdateWorkspaceProject,
  useUpdateWorkspaceTag,
  useUpdateWorkspaceTask,
  useUpdateWorkspaceWiki,
  useWorkspaceAssistant,
  useWorkspaceBacklinks,
  useWorkspaceOverview,
  WorkspaceBoard,
  WorkspaceBoardColumn,
  WorkspaceChecklist,
  WorkspaceDependency,
  WorkspaceLabel,
  WorkspaceObject,
  WorkspaceObjectType,
  WorkspacePriority,
  WorkspaceProject,
  WorkspaceStatus,
  WorkspaceTag,
  WorkspaceTask,
} from "../hooks/useWorkspace";
import { useCreateNote, useDeleteNote, useUpdateNote } from "../hooks/useNotes";

const NotesPage = lazy(() => import("./NotesPage"));

const tabs = ["dashboard", "board", "list", "calendar", "timeline", "mindmap", "projects", "wiki", "notes"] as const;
const priorities: WorkspacePriority[] = ["low", "medium", "high", "urgent"];
const columnLimit = 10;

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
  board_id?: number | null;
  column_id?: number | null;
  project_id?: number | null;
  parent_id?: number | null;
  label_ids: number[];
  tag_ids: number[];
  checklists: WorkspaceChecklist[];
};

function objectBody(item: WorkspaceObject): string {
  return item.body;
}

function objectBadges(item: WorkspaceObject): string[] {
  if (item.type !== "task") return item.tags;
  return Array.from(new Set([...item.labels.map((label) => label.name), ...item.tag_records.map((tag) => tag.name), ...item.tags]));
}

function stripMarkdown(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[*_`>#-]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function extractWikiLinks(value: string): string[] {
  return Array.from(value.matchAll(/\[\[([^\]]+)\]\]/g))
    .map((match) => match[1]?.split("|")[0]?.trim())
    .filter(Boolean);
}

function normalizeWikiTitle(value: string): string {
  return value.trim().toLowerCase();
}

function markdownWithWikiAnchors(value: string): string {
  return value.replace(/\[\[([^\]]+)\]\]/g, (_match, raw) => {
    const [target, label] = String(raw).split("|").map((part) => part.trim());
    return `[${label || target}](#wiki:${encodeURIComponent(target)})`;
  });
}

function parseTags(value: string): string[] {
  return Array.from(new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean)));
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function priorityClass(priority: WorkspacePriority): string {
  if (priority === "urgent") return "border-rose-400/35 bg-rose-500/12 text-rose-500";
  if (priority === "high") return "border-amber-400/35 bg-amber-500/12 text-amber-500";
  if (priority === "low") return "border-line/60 bg-line/20 text-t3";
  return "border-cyan-400/35 bg-cyan-500/12 text-cyan-600 dark:text-cyan-300";
}

function typeTone(type: WorkspaceObjectType): string {
  if (type === "project") return "workspace-tone-project";
  if (type === "task") return "workspace-tone-task";
  if (type === "wiki") return "workspace-tone-wiki";
  return "workspace-tone-note";
}

function columnTone(column: WorkspaceBoardColumn): string {
  if (column.kind === "blocked") return "workspace-tone-danger";
  if (column.kind === "done") return "workspace-tone-note";
  if (column.kind === "doing") return "workspace-tone-task";
  if (column.kind === "backlog") return "workspace-tone-warn";
  return "workspace-tone-project";
}

function makeDraft(type: WorkspaceObjectType, item?: WorkspaceObject, boardId?: number, columnId?: number): Draft {
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
      board_id: boardId ?? null,
      column_id: columnId ?? null,
      project_id: null,
      parent_id: null,
      label_ids: [],
      tag_ids: [],
      checklists: [],
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
    board_id: item.type === "task" ? item.board_id : boardId ?? null,
    column_id: item.type === "task" ? item.column_id : columnId ?? null,
    project_id: item.type === "task" ? item.project_id : null,
    parent_id: item.type === "task" ? item.parent_id : null,
    label_ids: item.type === "task" ? item.labels.map((label) => label.id) : [],
    tag_ids: item.type === "task" ? item.tag_records.map((tag) => tag.id) : [],
    checklists: item.type === "task" ? item.checklists : [],
  };
}

function useFilteredObjects(items: WorkspaceObject[], query: string, projects: WorkspaceProject[]) {
  return useMemo(() => {
    const parts = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const operators = parts.filter((part) => part.includes(":"));
    const textTerms = parts.filter((part) => !part.includes(":"));

    return items.filter((item) => {
      const labelNames = item.type === "task" ? item.labels.map((label) => label.name) : [];
      const workspaceTagNames = item.type === "task" ? item.tag_records.map((tag) => tag.name) : [];
      const haystack = [item.type, item.title, objectBody(item), ...item.tags, ...labelNames, ...workspaceTagNames].join(" ").toLowerCase();
      const textMatch = textTerms.every((term) => haystack.includes(term));
      const operatorMatch = operators.every((operator) => {
        const [key, ...rest] = operator.split(":");
        const value = rest.join(":");
        if (!value) return true;
        if (key === "type") return item.type === value;
        if (key === "tag") return [...item.tags, ...workspaceTagNames].some((tag) => tag.toLowerCase().includes(value));
        if (key === "label" && item.type === "task") return item.labels.some((label) => label.name.toLowerCase().includes(value));
        if (key === "status") return (item.type === "project" || item.type === "task") && item.status === value;
        if (key === "priority") return (item.type === "project" || item.type === "task") && item.priority === value;
        if (key === "project" && item.type === "task") return projects.find((project) => project.id === item.project_id)?.title.toLowerCase().includes(value) ?? false;
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

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: string }) {
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

function ObjectCard({ item, onOpen }: { item: WorkspaceObject; onOpen: (item: WorkspaceObject) => void }) {
  const { t } = useTranslation();
  const body = stripMarkdown(objectBody(item));
  const badges = objectBadges(item);

  return (
    <button onClick={() => onOpen(item)} className={`workspace-object-card ${typeTone(item.type)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`workspace-type-label ${typeTone(item.type)}`}>{t(`workspace.type_${item.type}`)}</div>
          <div className="mt-1 truncate text-[15px] font-semibold text-t1">{item.title}</div>
        </div>
        <span className="rounded-full border border-line/50 bg-surface px-2 py-0.5 text-[10px] text-t3">{formatDate(item.updated_at)}</span>
      </div>
      <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-left text-[12px] leading-5 text-t2">{body || t("workspace.no_content")}</p>
      <div className="mt-3 flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
        {badges.slice(0, 3).map((tag) => <span key={tag} className="workspace-tag">{tag}</span>)}
        {badges.length > 3 && <span className="text-[10px] text-t3">+{badges.length - 3}</span>}
      </div>
    </button>
  );
}

function SortableTaskCard({ task, project, onOpen }: { task: WorkspaceTask; project?: WorkspaceProject; onOpen: (item: WorkspaceObject) => void }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `task:${task.id}`, data: { type: "task", task } });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`workspace-task-card ${isDragging ? "opacity-40" : ""}`}>
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-t3 active:cursor-grabbing" aria-label={t("workspace.drag_card")}>
        <GripVertical size={14} />
      </button>
      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[13px] font-semibold text-t1">{task.title}</div>
        {project && <div className="mt-0.5 truncate text-[11px] text-t3">{project.title}</div>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.labels.slice(0, 3).map((label) => (
            <span key={label.id} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: label.color }}>
              {label.name}
            </span>
          ))}
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityClass(task.priority)}`}>{t(`workspace.priority_${task.priority}`)}</span>
          {task.due_date && <span className="rounded-full border border-line/50 bg-surface px-2 py-0.5 text-[10px] text-t3">{formatDate(task.due_date)}</span>}
        </div>
      </button>
    </div>
  );
}

function SortableColumn({
  column,
  tasks,
  projects,
  onOpen,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
}: {
  column: WorkspaceBoardColumn;
  tasks: WorkspaceTask[];
  projects: WorkspaceProject[];
  onOpen: (item: WorkspaceObject) => void;
  onAddTask: (column: WorkspaceBoardColumn) => void;
  onEditColumn: (column: WorkspaceBoardColumn) => void;
  onDeleteColumn: (column: WorkspaceBoardColumn) => void;
}) {
  const { t } = useTranslation();
  const sortable = useSortable({ id: `column:${column.id}`, data: { type: "column", column } });
  const droppable = useDroppable({ id: `column-drop:${column.id}`, data: { type: "column-drop", column } });

  return (
    <section
      ref={(node) => {
        sortable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, borderTopColor: column.color ?? undefined }}
      className={`workspace-board-column min-w-[290px] ${columnTone(column)} ${sortable.isDragging ? "opacity-50" : ""} ${droppable.isOver ? "ring-2 ring-accent/40" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button {...sortable.attributes} {...sortable.listeners} className="cursor-grab touch-none text-t3 active:cursor-grabbing" aria-label={t("workspace.drag_column")}>
          <GripHorizontal size={15} />
        </button>
        <button onClick={() => onEditColumn(column)} className="min-w-0 flex-1 text-left">
          <h3 className="truncate text-[12px] font-semibold uppercase tracking-[0.16em] text-t1">{column.title}</h3>
        </button>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-t3">{tasks.length}</span>
        <button onClick={() => onDeleteColumn(column)} className="text-t3 hover:text-rose-400" aria-label={t("workspace.delete_column")}>
          <Trash2 size={13} />
        </button>
      </div>
      <SortableContext items={tasks.map((task) => `task:${task.id}`)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[160px] space-y-2">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} project={projects.find((project) => project.id === task.project_id)} onOpen={onOpen} />
          ))}
          {!tasks.length && <div className="rounded-xl border border-dashed border-line/70 p-4 text-center text-[12px] text-t3">{t("workspace.drop_card_here")}</div>}
        </div>
      </SortableContext>
      <button onClick={() => onAddTask(column)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line/60 bg-surface/70 px-3 py-2 text-[12px] font-semibold text-t2 hover:text-accent">
        <Plus size={13} /> {t("workspace.add_card")}
      </button>
    </section>
  );
}

function MultiToggle<T extends { id: number; name: string }>({
  items,
  selected,
  onChange,
  render,
}: {
  items: T[];
  selected: number[];
  onChange: (selected: number[]) => void;
  render?: (item: T) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(active ? selected.filter((id) => id !== item.id) : [...selected, item.id])}
            className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${active ? "border-accent bg-accent/15 text-accent" : "border-line/60 bg-surface text-t2"}`}
          >
            {render ? render(item) : item.name}
          </button>
        );
      })}
    </div>
  );
}

function WorkspaceDrawer({
  draft,
  setDraft,
  onClose,
  overview,
  activeBoardId,
}: {
  draft: Draft;
  setDraft: (draft: Draft | null) => void;
  onClose: () => void;
  overview: ReturnType<typeof useWorkspaceOverview>["data"];
  activeBoardId: number;
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
  const createLabel = useCreateWorkspaceLabel();
  const updateLabel = useUpdateWorkspaceLabel();
  const deleteLabel = useDeleteWorkspaceLabel();
  const createTag = useCreateWorkspaceTag();
  const updateTag = useUpdateWorkspaceTag();
  const deleteTag = useDeleteWorkspaceTag();
  const updateDependencies = useUpdateWorkspaceDependencies();
  const assistant = useWorkspaceAssistant();
  const backlinksQuery = useWorkspaceBacklinks(draft.id ? draft.type : undefined, draft.id);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
  const [editingLabelName, setEditingLabelName] = useState("");
  const [editingLabelColor, setEditingLabelColor] = useState("#06b6d4");
  const [newTag, setNewTag] = useState("");
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [newChecklistItems, setNewChecklistItems] = useState<Record<number, string>>({});
  const [dependencyTarget, setDependencyTarget] = useState("");
  const [assistantResult, setAssistantResult] = useState<ReturnType<typeof useWorkspaceAssistant>["data"] | null>(null);

  const boards = overview?.boards ?? [];
  const columns = overview?.columns.filter((column) => column.board_id === (draft.board_id ?? activeBoardId) && !column.is_archived) ?? [];
  const projects = overview?.projects ?? [];
  const tasks = overview?.tasks ?? [];
  const labels = overview?.labels ?? [];
  const workspaceTags = overview?.workspace_tags ?? [];
  const dependencies = overview?.dependencies ?? [];
  const backlinks = backlinksQuery.data ?? [];
  const wikiPages = overview?.wiki ?? [];
  const outgoingWikiLinks = Array.from(new Set(extractWikiLinks(draft.body)));
  const missingWikiLinks = outgoingWikiLinks.filter((link) => !wikiPages.some((page) => normalizeWikiTitle(page.title) === normalizeWikiTitle(link)));
  const isExisting = Boolean(draft.id);
  const isTask = draft.type === "task";
  const isWorkItem = draft.type === "project" || draft.type === "task";
  const outline = draft.body.split("\n").filter((line) => /^#{1,4}\s+/.test(line)).slice(0, 8);
  const dependencyOptions = [...projects, ...tasks].filter((item) => !(item.type === draft.type && item.id === draft.id));
  const currentDependencies = dependencies.filter((dep) => dep.source_type === draft.type && dep.source_id === draft.id);

  const patchDraft = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  const save = async () => {
    setSaveState("saving");
    const payload = {
      title: draft.title.trim() || t("workspace.untitled"),
      body: draft.body,
      status: draft.status,
      priority: draft.priority,
      start_date: draft.start_date || null,
      due_date: draft.due_date || null,
      tags: parseTags(draft.tags),
      board_id: draft.board_id ?? activeBoardId,
      column_id: draft.column_id ?? columns[0]?.id,
      project_id: draft.project_id ?? null,
      parent_id: draft.parent_id ?? null,
      label_ids: draft.label_ids,
      tag_ids: draft.tag_ids,
      checklists: draft.checklists,
    };

    try {
      if (draft.type === "project") {
        const saved = draft.id ? await updateProject.mutateAsync({ id: draft.id, ...payload }) : await createProject.mutateAsync(payload);
        setDraft(makeDraft("project", saved, activeBoardId));
      } else if (draft.type === "task") {
        const saved = draft.id ? await updateTask.mutateAsync({ id: draft.id, ...payload }) : await createTask.mutateAsync(payload);
        setDraft(makeDraft("task", saved, activeBoardId));
      } else if (draft.type === "wiki") {
        const saved = draft.id ? await updateWiki.mutateAsync({ id: draft.id, title: payload.title, body: payload.body, tags: payload.tags }) : await createWiki.mutateAsync({ title: payload.title, body: payload.body, tags: payload.tags });
        setDraft(makeDraft("wiki", saved, activeBoardId));
      } else {
        const saved = draft.id
          ? await updateNote.mutateAsync({ id: draft.id, title: payload.title, content: payload.body, tags: payload.tags })
          : await createNote.mutateAsync({ title: payload.title, content: payload.body, tags: payload.tags });
        setDraft(makeDraft("note", { ...saved, type: "note", body: saved.content } as WorkspaceObject, activeBoardId));
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
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
      setDraft(null);
    } catch {
      setSaveState("error");
    }
  };

  const addLabel = async () => {
    const name = newLabel.trim();
    if (!name) return;
    const label = await createLabel.mutateAsync({ name, color: "#06b6d4" });
    patchDraft({ label_ids: Array.from(new Set([...draft.label_ids, label.id])) });
    setNewLabel("");
  };

  const startEditLabel = (label: WorkspaceLabel) => {
    setEditingLabelId(label.id);
    setEditingLabelName(label.name);
    setEditingLabelColor(label.color);
  };

  const saveLabel = async () => {
    if (!editingLabelId || !editingLabelName.trim()) return;
    await updateLabel.mutateAsync({ id: editingLabelId, name: editingLabelName.trim(), color: editingLabelColor });
    setEditingLabelId(null);
    setEditingLabelName("");
    setEditingLabelColor("#06b6d4");
  };

  const removeLabel = async (id: number) => {
    await deleteLabel.mutateAsync(id);
    patchDraft({ label_ids: draft.label_ids.filter((labelId) => labelId !== id) });
  };

  const addTag = async () => {
    const name = newTag.trim();
    if (!name) return;
    const tag = await createTag.mutateAsync({ name, source: "manual" });
    patchDraft({ tag_ids: Array.from(new Set([...draft.tag_ids, tag.id])) });
    setNewTag("");
  };

  const startEditTag = (tag: WorkspaceTag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  };

  const saveTag = async () => {
    if (!editingTagId || !editingTagName.trim()) return;
    await updateTag.mutateAsync({ id: editingTagId, name: editingTagName.trim(), source: "manual" });
    setEditingTagId(null);
    setEditingTagName("");
  };

  const removeTag = async (id: number) => {
    await deleteTag.mutateAsync(id);
    patchDraft({ tag_ids: draft.tag_ids.filter((tagId) => tagId !== id) });
  };

  const addChecklist = () => {
    patchDraft({
      checklists: [...draft.checklists, { title: t("workspace.checklist"), items: [] }],
    });
  };

  const updateChecklist = (checklistIndex: number, patch: Partial<WorkspaceChecklist>) => {
    patchDraft({
      checklists: draft.checklists.map((checklist, index) => index === checklistIndex ? { ...checklist, ...patch } : checklist),
    });
  };

  const removeChecklist = (checklistIndex: number) => {
    patchDraft({
      checklists: draft.checklists.filter((_, index) => index !== checklistIndex),
    });
  };

  const addChecklistItem = (checklistIndex: number) => {
    const title = (newChecklistItems[checklistIndex] ?? "").trim();
    if (!title) return;
    patchDraft({
      checklists: draft.checklists.map((checklist, index) => index === checklistIndex ? { ...checklist, items: [...checklist.items, { title, is_done: false }] } : checklist),
    });
    setNewChecklistItems((current) => ({ ...current, [checklistIndex]: "" }));
  };

  const toggleChecklistItem = (checklistIndex: number, itemIndex: number) => {
    patchDraft({
      checklists: draft.checklists.map((checklist, index) => index === checklistIndex
        ? { ...checklist, items: checklist.items.map((item, currentItemIndex) => currentItemIndex === itemIndex ? { ...item, is_done: !item.is_done } : item) }
        : checklist),
    });
  };

  const addDependency = async () => {
    if (!draft.id || !dependencyTarget) return;
    const [targetType, targetId] = dependencyTarget.split(":");
    const next: WorkspaceDependency[] = [
      ...dependencies,
      {
        source_type: draft.type as "project" | "task",
        source_id: draft.id,
        target_type: targetType as "project" | "task",
        target_id: Number(targetId),
        kind: "blocks",
      },
    ];
    await updateDependencies.mutateAsync(next);
    setDependencyTarget("");
  };

  const runAssistant = async () => {
    const result = await assistant.mutateAsync({ kind: draft.type, title: draft.title, content: draft.body });
    setAssistantResult(result);
  };

  const openOrCreateWikiLink = async (title: string) => {
    const existing = wikiPages.find((page) => normalizeWikiTitle(page.title) === normalizeWikiTitle(title));
    if (existing) {
      setDraft(makeDraft("wiki", existing, activeBoardId));
      return;
    }
    const created = await createWiki.mutateAsync({ title, body: `# ${title}\n` });
    setDraft(makeDraft("wiki", created, activeBoardId));
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="workspace-drawer z-50">
        <div className="flex items-center justify-between border-b border-line/60 p-4">
          <div>
            <div className={`workspace-type-label ${typeTone(draft.type)}`}>{t(`workspace.type_${draft.type}`)}</div>
            <h2 className="text-lg font-semibold text-t1">{draft.id ? t("workspace.edit_item") : t("workspace.create_item")}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-t3 hover:bg-line/20 hover:text-t1"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <section className={`workspace-drawer-section ${typeTone(draft.type)}`}>
            <h3 className="workspace-section-title">{t("workspace.basics")}</h3>
            <div className="mt-3 grid gap-3">
              <label><span className="label-xs mb-1.5 block">{t("workspace.title_field")}</span><input value={draft.title} onChange={(e) => patchDraft({ title: e.target.value })} className="workspace-input" /></label>
              <label>
                <span className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="label-xs">{t("workspace.markdown")}</span>
                  <MarkdownHelpButton />
                </span>
                <textarea value={draft.body} onChange={(e) => patchDraft({ body: e.target.value })} className="workspace-textarea min-h-[180px]" placeholder={t("workspace.markdown_placeholder")} />
              </label>
            </div>
          </section>

          {isWorkItem && (
            <section className="workspace-drawer-section workspace-tone-task">
              <h3 className="workspace-section-title">{t("workspace.planning")}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {isTask && (
                  <>
                    <label><span className="label-xs mb-1.5 block">{t("workspace.board")}</span><select value={draft.board_id ?? activeBoardId} onChange={(e) => patchDraft({ board_id: Number(e.target.value), column_id: overview?.columns.find((column) => column.board_id === Number(e.target.value) && !column.is_archived)?.id ?? null })} className="workspace-input">{boards.map((board) => <option key={board.id} value={board.id}>{board.title}</option>)}</select></label>
                    <label><span className="label-xs mb-1.5 block">{t("workspace.column")}</span><select value={draft.column_id ?? ""} onChange={(e) => patchDraft({ column_id: Number(e.target.value) })} className="workspace-input">{columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}</select></label>
                    <label><span className="label-xs mb-1.5 block">{t("workspace.project")}</span><select value={draft.project_id ?? ""} onChange={(e) => patchDraft({ project_id: e.target.value ? Number(e.target.value) : null })} className="workspace-input"><option value="">{t("workspace.no_project")}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
                    <label><span className="label-xs mb-1.5 block">{t("workspace.parent_task")}</span><select value={draft.parent_id ?? ""} onChange={(e) => patchDraft({ parent_id: e.target.value ? Number(e.target.value) : null })} className="workspace-input"><option value="">{t("workspace.no_parent")}</option>{tasks.filter((task) => task.id !== draft.id).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
                  </>
                )}
                <label><span className="label-xs mb-1.5 block">{t("workspace.priority")}</span><select value={draft.priority} onChange={(e) => patchDraft({ priority: e.target.value as WorkspacePriority })} className="workspace-input">{priorities.map((priority) => <option key={priority} value={priority}>{t(`workspace.priority_${priority}`)}</option>)}</select></label>
                <label><span className="label-xs mb-1.5 block">{t("workspace.start_date")}</span><input type="date" value={draft.start_date} onChange={(e) => patchDraft({ start_date: e.target.value })} className="workspace-input" /></label>
                <label><span className="label-xs mb-1.5 block">{t("workspace.due_date")}</span><input type="date" value={draft.due_date} onChange={(e) => patchDraft({ due_date: e.target.value })} className="workspace-input" /></label>
              </div>
            </section>
          )}

          {isTask && (
            <>
              <section className="workspace-drawer-section workspace-tone-project">
                <h3 className="workspace-section-title">{t("workspace.labels")}</h3>
                <div className="mt-3 space-y-3">
                  <MultiToggle items={labels} selected={draft.label_ids} onChange={(label_ids) => patchDraft({ label_ids })} render={(label: WorkspaceLabel) => <span className="inline-flex items-center gap-1"><Circle size={9} fill={label.color} color={label.color} />{label.name}</span>} />
                  <div className="flex gap-2"><input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="workspace-input" placeholder={t("workspace.new_label")} /><button onClick={addLabel} className="workspace-secondary-button"><Plus size={13} />{t("workspace.add")}</button></div>
                  <div className="space-y-2">
                    <div className="label-xs">{t("workspace.manage_labels")}</div>
                    {labels.map((label) => (
                      <div key={label.id} className="flex items-center gap-2 rounded-xl border border-line/60 bg-surface/70 p-2">
                        {editingLabelId === label.id ? (
                          <>
                            <input type="color" value={editingLabelColor} onChange={(e) => setEditingLabelColor(e.target.value)} className="h-9 w-10 rounded-lg border border-line bg-surface p-1" aria-label={t("workspace.color")} />
                            <input value={editingLabelName} onChange={(e) => setEditingLabelName(e.target.value)} className="workspace-input h-9 flex-1" placeholder={t("workspace.label_name")} />
                            <button onClick={saveLabel} className="workspace-primary-button h-9 px-3">{t("common.save")}</button>
                            <button onClick={() => setEditingLabelId(null)} className="workspace-secondary-button h-9 px-3">{t("common.cancel")}</button>
                          </>
                        ) : (
                          <>
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                            <span className="min-w-0 flex-1 truncate text-sm text-t2">{label.name}</span>
                            <button onClick={() => startEditLabel(label)} className="text-[12px] font-semibold text-accent">{t("workspace.edit_label")}</button>
                            <button onClick={() => removeLabel(label.id)} className="text-[12px] font-semibold text-rose-500">{t("workspace.delete_label")}</button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <section className="workspace-drawer-section workspace-tone-wiki">
                <h3 className="workspace-section-title">{t("workspace.tags")}</h3>
                <div className="mt-3 space-y-3">
                  <MultiToggle items={workspaceTags} selected={draft.tag_ids} onChange={(tag_ids) => patchDraft({ tag_ids })} render={(tag: WorkspaceTag) => <span className="inline-flex items-center gap-1"><Tag size={10} />{tag.name}</span>} />
                  <div className="flex gap-2"><input value={newTag} onChange={(e) => setNewTag(e.target.value)} className="workspace-input" placeholder={t("workspace.new_tag")} /><button onClick={addTag} className="workspace-secondary-button"><Plus size={13} />{t("workspace.add")}</button></div>
                  <div className="space-y-2">
                    <div className="label-xs">{t("workspace.manage_tags")}</div>
                    {workspaceTags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-2 rounded-xl border border-line/60 bg-surface/70 p-2">
                        {editingTagId === tag.id ? (
                          <>
                            <input value={editingTagName} onChange={(e) => setEditingTagName(e.target.value)} className="workspace-input h-9 flex-1" placeholder={t("workspace.tag_name")} />
                            <button onClick={saveTag} className="workspace-primary-button h-9 px-3">{t("common.save")}</button>
                            <button onClick={() => setEditingTagId(null)} className="workspace-secondary-button h-9 px-3">{t("common.cancel")}</button>
                          </>
                        ) : (
                          <>
                            <Tag size={13} className="text-t3" />
                            <span className="min-w-0 flex-1 truncate text-sm text-t2">{tag.name}</span>
                            <span className="rounded-full bg-line/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-t3">{tag.source}</span>
                            <button onClick={() => startEditTag(tag)} className="text-[12px] font-semibold text-accent">{t("workspace.edit_tag")}</button>
                            <button onClick={() => removeTag(tag.id)} className="text-[12px] font-semibold text-rose-500">{t("workspace.delete_tag")}</button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <section className="workspace-drawer-section workspace-tone-note">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="workspace-section-title">{t("workspace.checklist")}</h3>
                  <button onClick={addChecklist} className="workspace-secondary-button"><Plus size={13} />{t("workspace.add_checklist")}</button>
                </div>
                <div className="mt-3 space-y-2">
                  {draft.checklists.map((checklist, checklistIndex) => (
                    <div key={`${checklist.title}-${checklistIndex}`} className="rounded-xl border border-line/60 bg-surface/70 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <input value={checklist.title} onChange={(e) => updateChecklist(checklistIndex, { title: e.target.value })} className="workspace-input h-9 flex-1" placeholder={t("workspace.checklist_title")} />
                        <button onClick={() => removeChecklist(checklistIndex)} className="text-rose-500" aria-label={t("workspace.delete_checklist")}><Trash2 size={14} /></button>
                      </div>
                      <div className="space-y-1.5">
                        {checklist.items.map((item, itemIndex) => (
                          <button key={`${item.title}-${itemIndex}`} onClick={() => toggleChecklistItem(checklistIndex, itemIndex)} className="flex w-full items-center gap-2 rounded-lg bg-card px-3 py-2 text-left text-[13px] text-t2">
                            <CheckSquare size={14} className={item.is_done ? "text-emerald-400" : "text-t3"} />
                            <span className={item.is_done ? "line-through opacity-60" : ""}>{item.title}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input value={newChecklistItems[checklistIndex] ?? ""} onChange={(e) => setNewChecklistItems((current) => ({ ...current, [checklistIndex]: e.target.value }))} className="workspace-input h-9" placeholder={t("workspace.new_checklist_item")} />
                        <button onClick={() => addChecklistItem(checklistIndex)} className="workspace-secondary-button h-9"><Plus size={13} />{t("workspace.add")}</button>
                      </div>
                    </div>
                  ))}
                  {!draft.checklists.length && <button onClick={addChecklist} className="w-full rounded-xl border border-dashed border-line/70 p-4 text-center text-sm font-semibold text-t2 hover:text-accent">{t("workspace.add_checklist")}</button>}
                </div>
              </section>
            </>
          )}

          <section className="workspace-drawer-section">
            <h3 className="workspace-section-title">{t("workspace.legacy_tags")}</h3>
            <input value={draft.tags} onChange={(e) => patchDraft({ tags: e.target.value })} className="workspace-input mt-3" placeholder={t("workspace.tags_placeholder")} />
          </section>

          {isWorkItem && draft.id && (
            <section className="workspace-drawer-section">
              <h3 className="workspace-section-title">{t("workspace.dependencies")}</h3>
              <div className="mt-3 flex gap-2">
                <select value={dependencyTarget} onChange={(e) => setDependencyTarget(e.target.value)} className="workspace-input">
                  <option value="">{t("workspace.select_dependency")}</option>
                  {dependencyOptions.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{t(`workspace.type_${item.type}`)}: {item.title}</option>)}
                </select>
                <button onClick={addDependency} className="workspace-secondary-button">{t("workspace.add")}</button>
              </div>
              <div className="mt-3 space-y-1">
                {currentDependencies.map((dep) => {
                  const target = dependencyOptions.find((item) => item.type === dep.target_type && item.id === dep.target_id);
                  return <div key={`${dep.target_type}:${dep.target_id}`} className="rounded-lg bg-surface px-3 py-2 text-[12px] text-t2">{target?.title ?? `${dep.target_type} #${dep.target_id}`}</div>;
                })}
              </div>
            </section>
          )}

          <section className="workspace-drawer-section workspace-tone-wiki">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="workspace-section-title">{t("workspace.ai_suggestions")}</h3>
              <button onClick={runAssistant} disabled={assistant.isPending} className="workspace-secondary-button"><Sparkles size={12} />{assistant.isPending ? t("workspace.suggesting") : t("workspace.suggest")}</button>
            </div>
            {assistantResult ? (
              <div className="space-y-2 text-[12px] text-t2">
                <p>{assistantResult.suggestions.summary || t("workspace.no_summary")}</p>
                <div className="flex flex-wrap gap-1">{assistantResult.suggestions.tags.map((tag) => <span key={tag.name} className="workspace-tag">{tag.name}</span>)}</div>
              </div>
            ) : <p className="text-[12px] text-t3">{t("workspace.suggestions_manual")}</p>}
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="workspace-drawer-section"><h3 className="workspace-section-title">{t("workspace.outline")}</h3>{outline.length ? outline.map((heading) => <div key={heading} className="truncate text-[12px] text-t2">{heading.replace(/^#+\s+/, "")}</div>) : <div className="text-[12px] text-t3">{t("workspace.no_headings")}</div>}</div>
            <div className="workspace-drawer-section"><h3 className="workspace-section-title">{t("workspace.backlinks")}</h3>{backlinks.length ? backlinks.map((item) => <button key={`${item.type}:${item.id}`} onClick={() => setDraft(makeDraft(item.type, item, activeBoardId))} className="block max-w-full truncate text-[12px] text-t2 hover:text-accent">{t(`workspace.type_${item.type}`)}: {item.title}</button>) : <div className="text-[12px] text-t3">{t("workspace.no_backlinks")}</div>}</div>
            <div className="workspace-drawer-section"><h3 className="workspace-section-title">{t("workspace.outgoing_links")}</h3>{outgoingWikiLinks.length ? outgoingWikiLinks.map((link) => <button key={link} onClick={() => void openOrCreateWikiLink(link)} className="block max-w-full truncate text-[12px] text-t2 hover:text-accent">[[{link}]]</button>) : <div className="text-[12px] text-t3">{t("workspace.no_outgoing_links")}</div>}</div>
            <div className="workspace-drawer-section"><h3 className="workspace-section-title">{t("workspace.missing_links")}</h3>{missingWikiLinks.length ? missingWikiLinks.map((link) => <button key={link} onClick={() => void openOrCreateWikiLink(link)} className="block max-w-full truncate text-[12px] text-amber-500 hover:text-accent">+ [[{link}]]</button>) : <div className="text-[12px] text-t3">{t("workspace.no_missing_links")}</div>}</div>
          </section>
        </div>

        <div className="flex items-center gap-2 border-t border-line/60 p-4">
          <span className="min-w-0 flex-1 text-[12px] text-t3">{saveState === "saving" ? t("workspace.saving") : saveState === "saved" ? t("workspace.saved") : saveState === "error" ? t("workspace.save_error") : ""}</span>
          {isExisting && <button onClick={() => setDeleteOpen(true)} className="workspace-danger-button"><Trash2 size={15} />{t("common.delete")}</button>}
          <button onClick={save} disabled={saveState === "saving"} className="workspace-primary-button min-w-[140px]">{saveState === "saving" ? t("common.saving") : t("common.save")}</button>
        </div>
      </aside>

      <ConfirmDialog open={deleteOpen} title={t("workspace.delete_title")} description={t("workspace.delete_description", { title: draft.title || t("workspace.untitled") })} onCancel={() => setDeleteOpen(false)} onConfirm={remove} isPending={saveState === "saving"} />
    </>
  );
}

function TaskDetailDrawer({
  task,
  overview,
  onClose,
  onEdit,
}: {
  task: WorkspaceTask;
  overview: ReturnType<typeof useWorkspaceOverview>["data"];
  onClose: () => void;
  onEdit: (task: WorkspaceTask) => void;
}) {
  const { t } = useTranslation();
  const updateTask = useUpdateWorkspaceTask();
  const [body, setBody] = useState(task.body);
  const [checklists, setChecklists] = useState(task.checklists);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const project = overview?.projects.find((item) => item.id === task.project_id);
  const column = overview?.columns.find((item) => item.id === task.column_id);

  useEffect(() => {
    setBody(task.body);
    setChecklists(task.checklists);
    setSaveState("idle");
  }, [task.id, task.body, task.checklists]);

  const persist = async (patch: Partial<WorkspaceTask>) => {
    setSaveState("saving");
    try {
      const saved = await updateTask.mutateAsync({ id: task.id, ...patch });
      setBody(saved.body);
      setChecklists(saved.checklists);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const toggleChecklistItem = (checklistIndex: number, itemIndex: number) => {
    const next = checklists.map((checklist, currentChecklistIndex) =>
      currentChecklistIndex === checklistIndex
        ? {
            ...checklist,
            items: checklist.items.map((item, currentItemIndex) =>
              currentItemIndex === itemIndex ? { ...item, is_done: !item.is_done } : item
            ),
          }
        : checklist
    );
    setChecklists(next);
    void persist({ checklists: next });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="workspace-drawer z-50">
        <div className="flex items-start justify-between gap-4 border-b border-line/60 p-5">
          <div className="min-w-0">
            <div className="workspace-type-label workspace-tone-task">{t("workspace.type_task")}</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-t1">{task.title}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-t3">
              {column && <span className="workspace-meta-pill">{column.title}</span>}
              {project && <span className="workspace-meta-pill">{project.title}</span>}
              <span className={`rounded-full border px-2 py-0.5 font-semibold ${priorityClass(task.priority)}`}>{t(`workspace.priority_${task.priority}`)}</span>
              {task.due_date && <span className="workspace-meta-pill">{formatDate(task.due_date)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-t3 hover:bg-line/20 hover:text-t1"><X size={18} /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <section className="workspace-drawer-section workspace-tone-task">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="workspace-section-title">{t("workspace.markdown")}</h3>
              <MarkdownHelpButton />
            </div>
            <div className="rounded-2xl border border-line/60 bg-surface/70 p-3">
              <MDEditor.Markdown source={markdownWithWikiAnchors(body) || t("workspace.no_content")} className="workspace-markdown-preview" />
            </div>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="workspace-textarea mt-3 min-h-[140px]"
              placeholder={t("workspace.markdown_placeholder")}
            />
            <button onClick={() => void persist({ body })} className="workspace-secondary-button mt-3">
              {saveState === "saving" ? t("workspace.saving") : t("workspace.save_markdown")}
            </button>
          </section>

          <section className="workspace-drawer-section workspace-tone-note">
            <h3 className="workspace-section-title">{t("workspace.checklist")}</h3>
            <div className="mt-3 space-y-3">
              {checklists.map((checklist, checklistIndex) => (
                <div key={`${checklist.title}-${checklistIndex}`} className="rounded-xl border border-line/60 bg-surface/70 p-3">
                  <div className="mb-2 text-[13px] font-semibold text-t1">{checklist.title}</div>
                  <div className="space-y-1.5">
                    {checklist.items.map((item, itemIndex) => (
                      <button key={`${item.title}-${itemIndex}`} onClick={() => toggleChecklistItem(checklistIndex, itemIndex)} className="flex w-full items-center gap-2 rounded-lg bg-card px-3 py-2 text-left text-[13px] text-t2">
                        <CheckSquare size={14} className={item.is_done ? "text-emerald-400" : "text-t3"} />
                        <span className={item.is_done ? "line-through opacity-60" : ""}>{item.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!checklists.length && <div className="text-sm text-t3">{t("workspace.no_checklists")}</div>}
            </div>
          </section>

          <section className="workspace-drawer-section">
            <h3 className="workspace-section-title">{t("workspace.tags")}</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[...task.labels.map((label) => label.name), ...task.tag_records.map((tag) => tag.name), ...task.tags].map((label) => <span key={label} className="workspace-tag">{label}</span>)}
              {!task.labels.length && !task.tag_records.length && !task.tags.length && <span className="text-[12px] text-t3">{t("workspace.no_tags")}</span>}
            </div>
          </section>
        </div>
        <div className="flex items-center gap-2 border-t border-line/60 p-4">
          <span className="min-w-0 flex-1 text-[12px] text-t3">{saveState === "saved" ? t("workspace.saved") : saveState === "error" ? t("workspace.save_error") : ""}</span>
          <button onClick={() => onEdit(task)} className="workspace-primary-button"><Edit3 size={14} />{t("workspace.edit_task")}</button>
        </div>
      </aside>
    </>
  );
}

export default function WorkspacePage() {
  const { t } = useTranslation();
  const { data: overview, isLoading } = useWorkspaceOverview();
  const createBoard = useCreateWorkspaceBoard();
  const updateBoard = useUpdateWorkspaceBoard();
  const deleteBoard = useDeleteWorkspaceBoard();
  const createColumn = useCreateWorkspaceColumn();
  const updateColumn = useUpdateWorkspaceColumn();
  const deleteColumn = useDeleteWorkspaceColumn();
  const createProject = useCreateWorkspaceProject();
  const createTask = useCreateWorkspaceTask();
  const createWiki = useCreateWorkspaceWiki();
  const createNote = useCreateNote();
  const reorderBoard = useReorderWorkspaceBoard();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingColumn, setEditingColumn] = useState<WorkspaceBoardColumn | null>(null);
  const [editingBoard, setEditingBoard] = useState<WorkspaceBoard | null>(null);
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<WorkspaceBoardColumn | null>(null);
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<WorkspaceBoard | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<WorkspaceTask | null>(null);

  const boards = overview?.boards ?? [];
  const projects = overview?.projects ?? [];
  const tasks = overview?.tasks ?? [];
  const wiki = overview?.wiki ?? [];
  const notes = overview?.notes ?? [];
  const dependencies = overview?.dependencies ?? [];
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0];
  const boardId = activeBoard?.id ?? overview?.active_board_id ?? 0;
  const boardColumns = (overview?.columns ?? []).filter((column) => column.board_id === boardId && !column.is_archived);
  const boardTasks = tasks.filter((task) => task.board_id === boardId);
  const allObjects = useMemo<WorkspaceObject[]>(() => [...projects, ...tasks, ...wiki, ...notes], [projects, tasks, wiki, notes]);
  const filteredObjects = useFilteredObjects(allObjects, query, projects);
  const activeDragTask = activeDragId?.startsWith("task:") ? tasks.find((task) => `task:${task.id}` === activeDragId) : null;

  const openObject = (item: WorkspaceObject) => {
    if (item.type === "task") {
      setTaskDetail(item);
      return;
    }
    setDraft(makeDraft(item.type, item, boardId));
  };

  useEffect(() => {
    if (!activeBoardId && overview?.active_board_id) setActiveBoardId(overview.active_board_id);
  }, [activeBoardId, overview?.active_board_id]);

  const quickCreate = async (type: WorkspaceObjectType, columnId?: number) => {
    if (type === "project") setDraft(makeDraft("project", await createProject.mutateAsync({ title: t("workspace.new_project"), body: "## Goal\n\n## Tasks\n", status: "backlog", priority: "medium" }), boardId));
    if (type === "task") setDraft(makeDraft("task", await createTask.mutateAsync({ title: t("workspace.new_task"), board_id: boardId, column_id: columnId ?? boardColumns[0]?.id, priority: "medium" }), boardId, columnId));
    if (type === "wiki") setDraft(makeDraft("wiki", await createWiki.mutateAsync({ title: t("workspace.new_wiki"), body: "## Overview\n" }), boardId));
    if (type === "note") {
      const note = await createNote.mutateAsync({ title: t("workspace.new_note"), content: "" });
      setDraft(makeDraft("note", { ...note, type: "note", body: note.content } as WorkspaceObject, boardId));
    }
  };

  const createBoardFromInput = async () => {
    const title = newBoardTitle.trim();
    if (!title) return;
    const board = await createBoard.mutateAsync({ title });
    setActiveBoardId(board.id);
    setNewBoardTitle("");
  };

  const createColumnFromInput = async () => {
    const title = newColumnTitle.trim();
    if (!title || !boardId || boardColumns.length >= columnLimit) return;
    await createColumn.mutateAsync({ boardId, title, color: "#06b6d4", kind: "custom" });
    setNewColumnTitle("");
  };

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = String(event.over?.id ?? "");
    setActiveDragId(null);
    if (!overId || !boardId) return;

    if (activeId.startsWith("column:") && overId.startsWith("column:")) {
      const activeIdNum = Number(activeId.replace("column:", ""));
      const overIdNum = Number(overId.replace("column:", ""));
      const oldIndex = boardColumns.findIndex((column) => column.id === activeIdNum);
      const newIndex = boardColumns.findIndex((column) => column.id === overIdNum);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const reordered = arrayMove(boardColumns, oldIndex, newIndex).map((column, index) => ({ id: column.id, sort_order: index }));
      reorderBoard.mutate({ boardId, columns: reordered });
      return;
    }

    if (!activeId.startsWith("task:")) return;
    const activeTaskId = Number(activeId.replace("task:", ""));
    const activeTask = boardTasks.find((task) => task.id === activeTaskId);
    if (!activeTask) return;

    const overTaskId = overId.startsWith("task:") ? Number(overId.replace("task:", "")) : null;
    const overTask = overTaskId ? boardTasks.find((task) => task.id === overTaskId) : null;
    const targetColumnId = overId.startsWith("column-drop:")
      ? Number(overId.replace("column-drop:", ""))
      : overId.startsWith("column:")
        ? Number(overId.replace("column:", ""))
        : overTask?.column_id;
    if (!targetColumnId) return;

    const sourceColumnId = activeTask.column_id;
    const sourceTasks = boardTasks.filter((task) => task.column_id === sourceColumnId).sort((a, b) => a.sort_order - b.sort_order);
    const targetTasks = boardTasks.filter((task) => task.column_id === targetColumnId && task.id !== activeTaskId).sort((a, b) => a.sort_order - b.sort_order);
    let payload: Array<{ id: number; board_id: number; column_id: number; sort_order: number }> = [];

    if (sourceColumnId === targetColumnId && overTaskId) {
      const changed = arrayMove(sourceTasks, sourceTasks.findIndex((task) => task.id === activeTaskId), sourceTasks.findIndex((task) => task.id === overTaskId));
      payload = changed.map((task, index) => ({ id: task.id, board_id: boardId, column_id: targetColumnId, sort_order: index }));
    } else {
      const targetIndex = overTaskId ? targetTasks.findIndex((task) => task.id === overTaskId) : targetTasks.length;
      targetTasks.splice(targetIndex >= 0 ? targetIndex : targetTasks.length, 0, { ...activeTask, column_id: targetColumnId });
      const sourcePayload = sourceTasks
        .filter((task) => task.id !== activeTaskId && task.column_id)
        .map((task, index) => ({ id: task.id, board_id: boardId, column_id: task.column_id as number, sort_order: index }));
      const targetPayload = targetTasks.map((task, index) => ({ id: task.id, board_id: boardId, column_id: targetColumnId, sort_order: index }));
      payload = [...sourcePayload, ...targetPayload];
    }

    reorderBoard.mutate({
      boardId,
      tasks: payload,
    });
  };

  const renderDashboard = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={FolderKanban} label={t("workspace.active_projects")} value={overview?.stats.activeProjects ?? 0} tone="workspace-tone-project" />
        <StatCard icon={ListChecks} label={t("workspace.open_tasks")} value={overview?.stats.openTasks ?? 0} tone="workspace-tone-task" />
        <StatCard icon={Archive} label={t("workspace.blocked")} value={overview?.stats.blockedTasks ?? 0} tone="workspace-tone-danger" />
        <StatCard icon={CalendarDays} label={t("workspace.due")} value={overview?.stats.dueTasks ?? 0} tone="workspace-tone-warn" />
        <StatCard icon={FileText} label={t("workspace.wiki")} value={overview?.stats.wikiPages ?? 0} tone="workspace-tone-wiki" />
        <StatCard icon={Blocks} label={t("workspace.boards")} value={boards.length} tone="workspace-tone-note" />
      </div>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="workspace-panel">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-t1">{t("workspace.feed")}</h2><span className="text-[11px] text-t3">{filteredObjects.length}</span></div>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{filteredObjects.slice(0, 9).map((item) => <ObjectCard key={`${item.type}:${item.id}`} item={item} onOpen={openObject} />)}</div>
        </div>
        <div className="space-y-4">
          <div className="workspace-panel">
            <h2 className="mb-3 text-[15px] font-semibold text-t1">{t("workspace.thedash_box")}</h2>
            <div className="grid grid-cols-2 gap-2">{(["project", "task", "wiki", "note"] as WorkspaceObjectType[]).map((type) => <button key={type} onClick={() => quickCreate(type)} className={`workspace-create-card ${typeTone(type)}`}><Plus size={14} className="mb-1" />{t(`workspace.type_${type}`)}</button>)}</div>
          </div>
          <div className="workspace-panel">
            <h2 className="mb-3 text-[15px] font-semibold text-t1">{t("workspace.due_soon")}</h2>
            <div className="space-y-2">{tasks.filter((task) => task.due_date && task.status !== "done").slice(0, 6).map((task) => <button key={task.id} onClick={() => setTaskDetail(task)} className="flex w-full items-center justify-between rounded-lg bg-surface px-3 py-2 text-left text-sm text-t2 hover:text-accent"><span className="truncate">{task.title}</span><span className="text-[11px] text-t3">{formatDate(task.due_date)}</span></button>)}{!tasks.some((task) => task.due_date && task.status !== "done") && <p className="text-sm text-t3">{t("workspace.no_due_tasks")}</p>}</div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderBoard = () => (
    <div className="space-y-3">
      <div className="workspace-panel flex flex-wrap items-center gap-2">
        <select value={boardId || ""} onChange={(e) => setActiveBoardId(Number(e.target.value))} className="workspace-input max-w-[260px]">{boards.map((board) => <option key={board.id} value={board.id}>{board.title}</option>)}</select>
        <input value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)} className="workspace-input max-w-[220px]" placeholder={t("workspace.new_board")} />
        <button onClick={createBoardFromInput} className="workspace-secondary-button"><Plus size={13} />{t("workspace.board")}</button>
        {activeBoard && <button onClick={() => setEditingBoard(activeBoard)} className="workspace-secondary-button">{t("workspace.edit_board")}</button>}
        {activeBoard && boards.length > 1 && <button onClick={() => setDeleteBoardTarget(activeBoard)} className="workspace-danger-button">{t("workspace.delete_board")}</button>}
        <div className="ml-auto flex items-center gap-2">
          <input value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} disabled={boardColumns.length >= columnLimit} className="workspace-input max-w-[220px]" placeholder={boardColumns.length >= columnLimit ? t("workspace.column_limit") : t("workspace.new_column")} />
          <button onClick={createColumnFromInput} disabled={boardColumns.length >= columnLimit} className="workspace-primary-button"><Plus size={13} />{t("workspace.column")}</button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragId(null)}>
        <SortableContext items={boardColumns.map((column) => `column:${column.id}`)} strategy={horizontalListSortingStrategy}>
          <div className="flex min-h-[520px] gap-3 overflow-x-auto pb-4">
            {boardColumns.map((column) => <SortableColumn key={column.id} column={column} tasks={boardTasks.filter((task) => task.column_id === column.id).sort((a, b) => a.sort_order - b.sort_order)} projects={projects} onOpen={openObject} onAddTask={() => quickCreate("task", column.id)} onEditColumn={setEditingColumn} onDeleteColumn={setDeleteColumnTarget} />)}
          </div>
        </SortableContext>
        <DragOverlay>{activeDragTask ? <div className="workspace-task-card w-[260px] shadow-xl"><GripVertical size={14} /><div className="font-semibold text-t1">{activeDragTask.title}</div></div> : null}</DragOverlay>
      </DndContext>
    </div>
  );

  const renderList = () => (
    <div className="overflow-hidden rounded-2xl border border-line/60 bg-card">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-surface text-[11px] uppercase tracking-[0.14em] text-t3"><tr><th className="px-4 py-3">{t("workspace.title_field")}</th><th>{t("workspace.board")}</th><th>{t("workspace.column")}</th><th>{t("workspace.priority")}</th><th>{t("workspace.project")}</th><th>{t("workspace.due_date")}</th><th>{t("workspace.labels")}</th></tr></thead>
        <tbody>{tasks.map((task) => <tr key={task.id} onClick={() => setTaskDetail(task)} className="cursor-pointer border-t border-line/50 hover:bg-surface/70"><td className="px-4 py-3 font-medium text-t1">{task.title}</td><td className="text-t2">{boards.find((board) => board.id === task.board_id)?.title ?? "-"}</td><td className="text-t2">{overview?.columns.find((column) => column.id === task.column_id)?.title ?? "-"}</td><td><span className={`rounded-full border px-2 py-1 text-[11px] ${priorityClass(task.priority)}`}>{t(`workspace.priority_${task.priority}`)}</span></td><td className="text-t2">{projects.find((project) => project.id === task.project_id)?.title ?? "-"}</td><td className="text-t2">{formatDate(task.due_date)}</td><td className="text-t3">{task.labels.slice(0, 3).map((label) => label.name).join(", ")}</td></tr>)}</tbody>
      </table>
    </div>
  );

  const renderCalendar = () => {
    const dated = [...projects, ...tasks].filter((item) => item.due_date).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
    return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dated.map((item) => <button key={`${item.type}:${item.id}`} onClick={() => openObject(item)} className={`workspace-date-card ${typeTone(item.type)}`}><div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-t3"><CalendarDays size={13} />{formatDate(item.due_date)}</div><div className="mt-2 text-[15px] font-semibold text-t1">{item.title}</div></button>)}</div>;
  };

  const renderTimeline = () => {
    const items = [...projects, ...tasks].filter((item) => item.start_date || item.due_date).sort((a, b) => String(a.start_date ?? a.due_date).localeCompare(String(b.start_date ?? b.due_date)));
    return <div className="workspace-panel space-y-3">{items.map((item) => <button key={`${item.type}:${item.id}`} onClick={() => openObject(item)} className={`workspace-timeline-row ${typeTone(item.type)}`}><span className="text-t3">{formatDate(item.start_date)}</span><span className="font-semibold text-t1">{item.title}</span><span className="text-right text-t3">{formatDate(item.due_date)}</span></button>)}<div className="pt-2 text-[12px] text-t3">{t("workspace.dependencies")}: {dependencies.length}</div></div>;
  };

  const renderWikiLibrary = () => {
    const allWikiLinks = allObjects.flatMap((item) => extractWikiLinks(objectBody(item)));
    const existingTitles = new Set(wiki.map((page) => normalizeWikiTitle(page.title)));
    const missingLinks = Array.from(new Set(allWikiLinks.filter((link) => !existingTitles.has(normalizeWikiTitle(link)))));
    const orphanPages = wiki.filter((page) => !allObjects.some((item) => item.type !== "wiki" || item.id !== page.id ? extractWikiLinks(objectBody(item)).some((link) => normalizeWikiTitle(link) === normalizeWikiTitle(page.title)) : false));
    const createMissingWiki = async (title: string) => {
      const created = await createWiki.mutateAsync({ title, body: `# ${title}\n` });
      setDraft(makeDraft("wiki", created, boardId));
    };

    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="workspace-panel flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-t1">{t("workspace.wiki_library")}</h2>
              <p className="mt-1 text-sm text-t3">{t("workspace.wiki_library_description")}</p>
            </div>
            <button onClick={() => quickCreate("wiki")} className="workspace-primary-button"><Plus size={13} />{t("workspace.new_wiki")}</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{wiki.map((item) => <ObjectCard key={item.id} item={item} onOpen={openObject} />)}</div>
        </div>
        <aside className="space-y-3">
          <div className="workspace-panel">
            <h3 className="workspace-section-title">{t("workspace.missing_links")}</h3>
            <div className="mt-3 space-y-2">
              {missingLinks.slice(0, 10).map((link) => <button key={link} onClick={() => void createMissingWiki(link)} className="flex w-full items-center justify-between rounded-xl bg-surface px-3 py-2 text-left text-[13px] text-t2 hover:text-accent"><span className="truncate">[[{link}]]</span><Plus size={13} /></button>)}
              {!missingLinks.length && <p className="text-sm text-t3">{t("workspace.no_missing_links")}</p>}
            </div>
          </div>
          <div className="workspace-panel">
            <h3 className="workspace-section-title">{t("workspace.orphan_pages")}</h3>
            <div className="mt-3 space-y-2">
              {orphanPages.slice(0, 8).map((page) => <button key={page.id} onClick={() => openObject(page)} className="block w-full truncate rounded-xl bg-surface px-3 py-2 text-left text-[13px] text-t2 hover:text-accent">{page.title}</button>)}
              {!orphanPages.length && <p className="text-sm text-t3">{t("workspace.no_orphan_pages")}</p>}
            </div>
          </div>
          <div className="workspace-panel">
            <h3 className="workspace-section-title">{t("workspace.templates")}</h3>
            <div className="mt-3 grid gap-2">
              {["runbook", "service_doc", "incident", "how_to", "project_wiki"].map((template) => <button key={template} onClick={() => setDraft(makeDraft("wiki", { id: 0, type: "wiki", title: t(`workspace.template_${template}`), body: `# ${t(`workspace.template_${template}`)}\n\n## ${t("workspace.overview")}\n`, tags: [], custom_fields: {}, created_at: "", updated_at: "" }, boardId))} className="workspace-secondary-button justify-center">{t(`workspace.template_${template}`)}</button>)}
            </div>
          </div>
        </aside>
      </div>
    );
  };

  const renderMindmap = () => {
    const node = (id: string, label: string, x: number, y: number, type: WorkspaceObjectType | "root", onClick?: () => void) => ({ id, label, x, y, type, onClick });
    const projectNodes = projects.slice(0, 4).map((item, index) => node(`project:${item.id}`, item.title, 16, 210 + index * 72, "project", () => openObject(item)));
    const taskNodes = tasks.slice(0, 6).map((item, index) => node(`task:${item.id}`, item.title, 49, 160 + index * 58, "task", () => setTaskDetail(item)));
    const wikiNodes = wiki.slice(0, 4).map((item, index) => node(`wiki:${item.id}`, item.title, 78, 205 + index * 70, "wiki", () => openObject(item)));
    const noteNodes = notes.slice(0, 3).map((item, index) => node(`note:${item.id}`, item.title, 78, 495 + index * 58, "note", () => openObject(item)));
    const branchNodes = [
      node("branch:projects", t("workspace.projects"), 16, 95, "project"),
      node("branch:tasks", t("workspace.tasks"), 49, 95, "task"),
      node("branch:wiki", t("workspace.wiki"), 78, 95, "wiki"),
      node("branch:notes", t("workspace.notes"), 78, 430, "note"),
    ];
    const nodes = [node("root", t("workspace.title"), 49, 30, "root"), ...branchNodes, ...projectNodes, ...taskNodes, ...wikiNodes, ...noteNodes];
    const nodeById = new Map(nodes.map((item) => [item.id, item]));
    const lines = [
      ...branchNodes.map((item) => ["root", item.id]),
      ...projectNodes.map((item) => ["branch:projects", item.id]),
      ...taskNodes.map((item) => [item.label && tasks.find((task) => `task:${task.id}` === item.id)?.project_id ? `project:${tasks.find((task) => `task:${task.id}` === item.id)?.project_id}` : "branch:tasks", item.id]),
      ...wikiNodes.map((item) => ["branch:wiki", item.id]),
      ...noteNodes.map((item) => ["branch:notes", item.id]),
      ...dependencies.map((dep) => [`${dep.source_type}:${dep.source_id}`, `${dep.target_type}:${dep.target_id}`]),
    ].filter(([from, to]) => nodeById.has(from) && nodeById.has(to));

    return (
      <div className="workspace-mindmap">
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          {lines.map(([from, to], index) => {
            const a = nodeById.get(from)!;
            const b = nodeById.get(to)!;
            return <line key={`${from}-${to}-${index}`} x1={`${a.x}%`} y1={a.y} x2={`${b.x}%`} y2={b.y} className="workspace-mindmap-line" />;
          })}
        </svg>
        {nodes.map((item) => (
          <button key={item.id} onClick={item.onClick} disabled={!item.onClick} className={`workspace-mindmap-node ${item.type === "root" ? "workspace-mindmap-root" : typeTone(item.type as WorkspaceObjectType)}`} style={{ left: `${item.x}%`, top: item.y }}>
            {item.type === "root" ? <Network size={15} /> : <BookOpen size={13} />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderCards = (items: WorkspaceObject[]) => <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{items.map((item) => <ObjectCard key={`${item.type}:${item.id}`} item={item} onOpen={openObject} />)}</div>;

  const content =
    activeTab === "dashboard" ? renderDashboard() :
    activeTab === "board" ? renderBoard() :
    activeTab === "list" ? renderList() :
    activeTab === "calendar" ? renderCalendar() :
    activeTab === "timeline" ? renderTimeline() :
    activeTab === "mindmap" ? renderMindmap() :
    activeTab === "projects" ? renderCards(projects) :
    activeTab === "wiki" ? renderWikiLibrary() :
    <Suspense fallback={<div className="workspace-panel text-sm text-t2">{t("workspace.loading_notes")}</div>}><NotesPage /></Suspense>;

  if (isLoading) return <div className="p-6 text-t2">{t("workspace.loading")}</div>;

  return (
    <div className="workspace-page space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="label-xs mb-1">{t("workspace.kicker")}</div><h1 className="text-2xl font-semibold tracking-tight text-t1">{t("workspace.title")}</h1></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => quickCreate("project")} className="workspace-primary-button"><Plus size={14} />{t("workspace.project")}</button><button onClick={() => quickCreate("task")} className="workspace-secondary-button"><Plus size={14} />{t("workspace.task")}</button></div>
      </div>

      <div className="workspace-command-bar">
        <div className="workspace-search"><Search size={15} className="text-t3" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("workspace.search_placeholder")} className="min-w-0 flex-1 bg-transparent text-sm text-t1 outline-none placeholder:text-t3" /></div>
        <div className="flex gap-1 overflow-x-auto">{tabs.map((tab) => { const Icon = tab === "dashboard" ? BarChart3 : tab === "board" ? Blocks : tab === "list" ? ListChecks : tab === "calendar" ? CalendarDays : tab === "timeline" ? CheckSquare : tab === "mindmap" ? Network : tab === "projects" ? FolderKanban : tab === "wiki" ? Link2 : FileText; return <button key={tab} onClick={() => setActiveTab(tab)} className={`workspace-tab ${activeTab === tab ? "workspace-tab-active" : ""}`}><Icon size={14} />{t(`workspace.tab_${tab}`)}</button>; })}</div>
      </div>

      {activeTab !== "notes" && <div className="flex flex-wrap gap-2">{(["project", "task", "wiki", "note"] as WorkspaceObjectType[]).map((type) => <button key={type} onClick={() => setQuery(`type:${type}`)} className="workspace-filter-chip">{t(`workspace.type_${type}`)}</button>)}{priorities.map((priority) => <button key={priority} onClick={() => setQuery(`priority:${priority}`)} className="workspace-filter-chip">{t(`workspace.priority_${priority}`)}</button>)}</div>}

      <div className="overflow-x-auto">{content}</div>
      {draft && <WorkspaceDrawer draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} overview={overview} activeBoardId={boardId} />}
      {taskDetail && <TaskDetailDrawer task={taskDetail} overview={overview} onClose={() => setTaskDetail(null)} onEdit={(task) => { setTaskDetail(null); setDraft(makeDraft("task", task, boardId)); }} />}

      {editingColumn && (
        <WorkspaceColumnEditor
          column={editingColumn}
          onSave={async (patch) => { await updateColumn.mutateAsync({ boardId, id: editingColumn.id, ...patch }); setEditingColumn(null); }}
          onClose={() => setEditingColumn(null)}
        />
      )}
      {editingBoard && (
        <WorkspaceBoardEditor
          board={editingBoard}
          onSave={async (patch) => { await updateBoard.mutateAsync({ id: editingBoard.id, ...patch }); setEditingBoard(null); }}
          onClose={() => setEditingBoard(null)}
        />
      )}
      <ConfirmDialog open={Boolean(deleteColumnTarget)} title={t("workspace.delete_column")} description={t("workspace.delete_column_description", { title: deleteColumnTarget?.title ?? "" })} onCancel={() => setDeleteColumnTarget(null)} onConfirm={async () => { if (deleteColumnTarget) await deleteColumn.mutateAsync({ boardId, id: deleteColumnTarget.id, target_column_id: boardColumns.find((column) => column.id !== deleteColumnTarget.id)?.id }); setDeleteColumnTarget(null); }} />
      <ConfirmDialog open={Boolean(deleteBoardTarget)} title={t("workspace.delete_board")} description={t("workspace.delete_board_description", { title: deleteBoardTarget?.title ?? "" })} onCancel={() => setDeleteBoardTarget(null)} onConfirm={async () => { if (deleteBoardTarget) await deleteBoard.mutateAsync(deleteBoardTarget.id); setDeleteBoardTarget(null); setActiveBoardId(null); }} />
    </div>
  );
}

function WorkspaceColumnEditor({ column, onSave, onClose }: { column: WorkspaceBoardColumn; onSave: (patch: Partial<WorkspaceBoardColumn>) => Promise<void>; onClose: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(column.title);
  const [color, setColor] = useState(column.color ?? "#06b6d4");
  const [kind, setKind] = useState(column.kind);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="workspace-drawer z-50">
        <div className="flex items-center justify-between border-b border-line/60 p-4"><h2 className="text-lg font-semibold text-t1">{t("workspace.edit_column")}</h2><button onClick={onClose} className="rounded-full p-2 text-t3 hover:bg-line/20"><X size={18} /></button></div>
        <div className="space-y-4 p-4">
          <label><span className="label-xs mb-1.5 block">{t("workspace.title_field")}</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="workspace-input" /></label>
          <label><span className="label-xs mb-1.5 block">{t("workspace.color")}</span><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-12 w-full rounded-xl border border-line bg-surface p-1" /></label>
          <label><span className="label-xs mb-1.5 block">{t("workspace.column_type")}</span><select value={kind} onChange={(e) => setKind(e.target.value)} className="workspace-input"><option value="custom">{t("workspace.column_custom")}</option><option value="backlog">{t("workspace.status_backlog")}</option><option value="todo">{t("workspace.status_todo")}</option><option value="doing">{t("workspace.status_doing")}</option><option value="blocked">{t("workspace.status_blocked")}</option><option value="done">{t("workspace.status_done")}</option></select></label>
          <button onClick={() => onSave({ title, color, kind })} className="workspace-primary-button w-full justify-center">{t("common.save")}</button>
        </div>
      </aside>
    </>
  );
}

function WorkspaceBoardEditor({ board, onSave, onClose }: { board: WorkspaceBoard; onSave: (patch: Partial<WorkspaceBoard>) => Promise<void>; onClose: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description ?? "");
  const [color, setColor] = useState(board.color ?? "#06b6d4");
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="workspace-drawer z-50">
        <div className="flex items-center justify-between border-b border-line/60 p-4"><h2 className="text-lg font-semibold text-t1">{t("workspace.edit_board")}</h2><button onClick={onClose} className="rounded-full p-2 text-t3 hover:bg-line/20"><X size={18} /></button></div>
        <div className="space-y-4 p-4">
          <label><span className="label-xs mb-1.5 block">{t("workspace.title_field")}</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="workspace-input" /></label>
          <label><span className="label-xs mb-1.5 block">{t("workspace.description")}</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="workspace-textarea" /></label>
          <label><span className="label-xs mb-1.5 block">{t("workspace.color")}</span><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-12 w-full rounded-xl border border-line bg-surface p-1" /></label>
          <button onClick={() => onSave({ title, description, color })} className="workspace-primary-button w-full justify-center">{t("common.save")}</button>
        </div>
      </aside>
    </>
  );
}
