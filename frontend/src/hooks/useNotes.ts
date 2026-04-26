import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface NoteFolder {
  id: number;
  parent_id: number | null;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  folder_id: number | null;
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NoteTagSuggestion {
  name: string;
  source: "auto" | "ai";
}

const KEY = ["notes"];
const FOLDERS_KEY = ["note-folders"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useNotes() {
  return useQuery<Note[]>({
    queryKey: KEY,
    queryFn: () => fetchJson<Note[]>("/api/notes"),
  });
}

export function useNoteFolders() {
  return useQuery<NoteFolder[]>({
    queryKey: FOLDERS_KEY,
    queryFn: () => fetchJson<NoteFolder[]>("/api/notes/folders"),
  });
}

export function useCreateNoteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; parent_id?: number | null }) =>
      fetchJson<NoteFolder>("/api/notes/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useUpdateNoteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<NoteFolder> & { id: number }) =>
      fetchJson<NoteFolder>(`/api/notes/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useDeleteNoteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/notes/folders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FOLDERS_KEY });
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useReorderNoteFolders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: number; parent_id: number | null; sort_order: number }>) =>
      fetchJson<{ ok: true }>("/api/notes/reorder/folders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { title?: string; content?: string; folder_id?: number | null; tags?: string[] }) =>
      fetchJson<Note>("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data ?? {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Note> & { id: number }) =>
      fetchJson<Note>(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchJson<{ ok: true }>(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export async function fetchNoteTagSuggestions(data: { title: string; content: string }): Promise<NoteTagSuggestion[]> {
  const response = await fetchJson<{ provider: "auto" | "ai"; suggestions: NoteTagSuggestion[] }>("/api/notes/tag-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.suggestions;
}
