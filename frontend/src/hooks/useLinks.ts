import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface LinkTag {
  id: number;
  name: string;
  source: "manual" | "auto";
  created_at: string;
}

export interface Link {
  id: number;
  section_id: number;
  name: string;
  url: string;
  icon_url: string | null;
  image_url: string | null;
  description: string | null;
  note: string | null;
  is_favorite: 0 | 1 | boolean;
  is_archived: 0 | 1 | boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tags: LinkTag[];
}

const SECTIONS_KEY = ["sections"];
const TAGS_KEY = ["tags"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function invalidateBookmarks(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: SECTIONS_KEY });
  qc.invalidateQueries({ queryKey: TAGS_KEY });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Link> & { section_id: number; name: string; url: string }) =>
      fetchJson<Link>("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateBookmarks(qc),
  });
}

export function useCaptureLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { section_id: number; url: string; tags?: string[] }) =>
      fetchJson<Link>("/api/links/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateBookmarks(qc),
  });
}

export function useUpdateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Link> & { id: number }) =>
      fetchJson<Link>(`/api/links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateBookmarks(qc),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchJson<{ ok: true }>(`/api/links/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateBookmarks(qc),
  });
}
