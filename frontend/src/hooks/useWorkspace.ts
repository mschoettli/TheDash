import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type WorkspaceObjectType = "project" | "task" | "wiki" | "note";
export type WorkspaceStatus = "backlog" | "todo" | "doing" | "blocked" | "done";
export type WorkspacePriority = "low" | "medium" | "high" | "urgent";

export interface WorkspaceBoard {
  id: number;
  title: string;
  description: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceBoardColumn {
  id: number;
  board_id: number;
  title: string;
  color: string | null;
  kind: string;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceLabel {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceTag {
  id: number;
  name: string;
  source: "manual" | "auto" | "ai";
  created_at: string;
  updated_at: string;
}

export interface WorkspaceChecklistItem {
  id?: number;
  title: string;
  is_done: boolean;
  sort_order?: number;
}

export interface WorkspaceChecklist {
  id?: number;
  title: string;
  sort_order?: number;
  items: WorkspaceChecklistItem[];
}

export interface WorkspaceProject {
  id: number;
  type: "project";
  title: string;
  body: string;
  status: WorkspaceStatus;
  priority: WorkspacePriority;
  start_date: string | null;
  due_date: string | null;
  tags: string[];
  icon: string | null;
  color: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceTask {
  id: number;
  type: "task";
  board_id: number | null;
  column_id: number | null;
  project_id: number | null;
  parent_id: number | null;
  title: string;
  body: string;
  status: WorkspaceStatus;
  priority: WorkspacePriority;
  start_date: string | null;
  due_date: string | null;
  tags: string[];
  labels: WorkspaceLabel[];
  tag_records: WorkspaceTag[];
  checklists: WorkspaceChecklist[];
  custom_fields: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWikiPage {
  id: number;
  type: "wiki";
  title: string;
  body: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceNote {
  id: number;
  type: "note";
  title: string;
  body: string;
  content: string;
  folder_id: number | null;
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceDependency {
  id?: number;
  source_type: "project" | "task";
  source_id: number;
  target_type: "project" | "task";
  target_id: number;
  kind: string;
  created_at?: string;
}

export type WorkspaceObject = WorkspaceProject | WorkspaceTask | WorkspaceWikiPage | WorkspaceNote;

export interface WorkspaceOverview {
  boards: WorkspaceBoard[];
  columns: WorkspaceBoardColumn[];
  labels: WorkspaceLabel[];
  workspace_tags: WorkspaceTag[];
  active_board_id: number;
  projects: WorkspaceProject[];
  tasks: WorkspaceTask[];
  wiki: WorkspaceWikiPage[];
  notes: WorkspaceNote[];
  dependencies: WorkspaceDependency[];
  stats: {
    activeProjects: number;
    openTasks: number;
    blockedTasks: number;
    dueTasks: number;
    wikiPages: number;
    notes: number;
  };
}

export interface AssistantSuggestion {
  kind: string;
  suggestions: {
    tags: Array<{ name: string; source: "auto" | "ai" }>;
    summary: string;
    tasks: string[];
    status_update: string;
  };
  requires_confirmation: boolean;
}

const OVERVIEW_KEY = ["workspace", "overview"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function json(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

function invalidateWorkspace(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
  qc.invalidateQueries({ queryKey: ["notes"] });
  qc.invalidateQueries({ queryKey: ["note-folders"] });
}

export function useWorkspaceOverview() {
  return useQuery<WorkspaceOverview>({
    queryKey: OVERVIEW_KEY,
    queryFn: () => fetchJson<WorkspaceOverview>("/api/workspace/overview"),
  });
}

export function useCreateWorkspaceBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkspaceBoard> & { title: string }) => fetchJson<WorkspaceBoard>("/api/workspace/boards", json("POST", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useUpdateWorkspaceBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkspaceBoard> & { id: number }) => fetchJson<WorkspaceBoard>(`/api/workspace/boards/${id}`, json("PUT", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useDeleteWorkspaceBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/workspace/boards/${id}`, json("DELETE")),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useCreateWorkspaceColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, ...data }: Partial<WorkspaceBoardColumn> & { boardId: number; title: string }) => fetchJson<WorkspaceBoardColumn>(`/api/workspace/boards/${boardId}/columns`, json("POST", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useUpdateWorkspaceColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, id, ...data }: Partial<WorkspaceBoardColumn> & { boardId: number; id: number }) => fetchJson<WorkspaceBoardColumn>(`/api/workspace/boards/${boardId}/columns/${id}`, json("PUT", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useDeleteWorkspaceColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, id, target_column_id }: { boardId: number; id: number; target_column_id?: number }) => fetchJson<{ ok: true }>(`/api/workspace/boards/${boardId}/columns/${id}`, json("DELETE", { target_column_id })),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useReorderWorkspaceBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, columns, tasks }: { boardId: number; columns?: Array<{ id: number; sort_order: number }>; tasks?: Array<{ id: number; board_id: number; column_id: number; sort_order: number }> }) => fetchJson<{ ok: true }>(`/api/workspace/boards/${boardId}/reorder`, json("PUT", { columns, tasks })),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useCreateWorkspaceLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => fetchJson<WorkspaceLabel>("/api/workspace/labels", json("POST", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useUpdateWorkspaceLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkspaceLabel> & { id: number }) => fetchJson<WorkspaceLabel>(`/api/workspace/labels/${id}`, json("PUT", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useDeleteWorkspaceLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/workspace/labels/${id}`, json("DELETE")),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useCreateWorkspaceTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; source?: "manual" | "auto" | "ai" }) => fetchJson<WorkspaceTag>("/api/workspace/tags", json("POST", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useUpdateWorkspaceTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkspaceTag> & { id: number }) => fetchJson<WorkspaceTag>(`/api/workspace/tags/${id}`, json("PUT", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useDeleteWorkspaceTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/workspace/tags/${id}`, json("DELETE")),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useCreateWorkspaceProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkspaceProject> & { title: string }) => fetchJson<WorkspaceProject>("/api/workspace/projects", json("POST", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useUpdateWorkspaceProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkspaceProject> & { id: number }) => fetchJson<WorkspaceProject>(`/api/workspace/projects/${id}`, json("PUT", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useDeleteWorkspaceProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/workspace/projects/${id}`, json("DELETE")),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useCreateWorkspaceTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkspaceTask> & { title: string; label_ids?: number[]; tag_ids?: number[] }) => fetchJson<WorkspaceTask>("/api/workspace/tasks", json("POST", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useUpdateWorkspaceTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkspaceTask> & { id: number; label_ids?: number[]; tag_ids?: number[] }) => fetchJson<WorkspaceTask>(`/api/workspace/tasks/${id}`, json("PUT", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useDeleteWorkspaceTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/workspace/tasks/${id}`, json("DELETE")),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useReorderWorkspaceTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: number; status?: WorkspaceStatus; board_id?: number; column_id?: number; sort_order: number }>) => fetchJson<{ ok: true }>("/api/workspace/tasks/reorder", json("PUT", { items })),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useCreateWorkspaceWiki() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkspaceWikiPage> & { title: string }) => fetchJson<WorkspaceWikiPage>("/api/workspace/wiki", json("POST", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useUpdateWorkspaceWiki() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkspaceWikiPage> & { id: number }) => fetchJson<WorkspaceWikiPage>(`/api/workspace/wiki/${id}`, json("PUT", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useDeleteWorkspaceWiki() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/workspace/wiki/${id}`, json("DELETE")),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useUpdateWorkspaceDependencies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dependencies: WorkspaceDependency[]) => fetchJson<{ ok: true; dependencies: WorkspaceDependency[] }>("/api/workspace/dependencies", json("PUT", { dependencies })),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useWorkspaceAssistant() {
  return useMutation({
    mutationFn: (data: { kind?: string; title?: string; content?: string }) => fetchJson<AssistantSuggestion>("/api/workspace/assistant/suggest", json("POST", data)),
  });
}

export function useWorkspaceBacklinks(type?: WorkspaceObjectType, id?: number) {
  return useQuery<WorkspaceObject[]>({
    queryKey: ["workspace", "backlinks", type, id],
    queryFn: () => fetchJson<WorkspaceObject[]>(`/api/workspace/backlinks/${type}/${id}`),
    enabled: Boolean(type && id),
  });
}
