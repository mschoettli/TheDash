import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type WorkspaceObjectType = "project" | "task" | "wiki" | "note";
export type WorkspaceStatus = "backlog" | "todo" | "doing" | "blocked" | "done";
export type WorkspacePriority = "low" | "medium" | "high" | "urgent";

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
  project_id: number | null;
  parent_id: number | null;
  title: string;
  body: string;
  status: WorkspaceStatus;
  priority: WorkspacePriority;
  start_date: string | null;
  due_date: string | null;
  tags: string[];
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
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
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
    mutationFn: (data: Partial<WorkspaceTask> & { title: string }) => fetchJson<WorkspaceTask>("/api/workspace/tasks", json("POST", data)),
    onSuccess: () => invalidateWorkspace(qc),
  });
}

export function useUpdateWorkspaceTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkspaceTask> & { id: number }) => fetchJson<WorkspaceTask>(`/api/workspace/tasks/${id}`, json("PUT", data)),
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
    mutationFn: (items: Array<{ id: number; status: WorkspaceStatus; sort_order: number }>) => fetchJson<{ ok: true }>("/api/workspace/tasks/reorder", json("PUT", { items })),
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
