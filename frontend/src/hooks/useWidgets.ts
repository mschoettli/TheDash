import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export interface WidgetCatalogItem {
  type: string;
  title: string;
  category: string;
  controllable: boolean;
}

export interface WidgetInstance {
  id: number;
  type: string;
  title: string;
  config: Record<string, unknown>;
  layout: Record<string, unknown>;
  section_id: number | null;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const KEY = ["widgets"];

export function useWidgetCatalog() {
  return useQuery<WidgetCatalogItem[]>({
    queryKey: ["widget-catalog"],
    queryFn: () => fetchJson<WidgetCatalogItem[]>("/api/widgets/catalog"),
  });
}

export function useWidgets() {
  return useQuery<WidgetInstance[]>({
    queryKey: KEY,
    queryFn: () => fetchJson<WidgetInstance[]>("/api/widgets"),
  });
}

export function useCreateWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; title: string; section_id?: number | null; config?: Record<string, unknown> }) =>
      fetchJson<WidgetInstance>("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/widgets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
