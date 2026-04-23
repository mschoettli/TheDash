import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Note {
  id: number;
  title: string;
  content: string;
  updated_at: string;
}

const KEY = ["notes"];

export function useNotes() {
  return useQuery<Note[]>({
    queryKey: KEY,
    queryFn: () => fetch("/api/notes").then((r) => r.json()),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { title?: string; content?: string }) =>
      fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data ?? {}),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Note> & { id: number }) =>
      fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/notes/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
