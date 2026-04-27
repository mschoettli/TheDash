import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DashboardItemType = "tile" | "widget";

export interface DashboardItem {
  id: number;
  section_id: number;
  item_type: DashboardItemType;
  item_id: number;
  sort_order: number;
  layout: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DashboardSection {
  id: number;
  title: string;
  icon: string | null;
  layout: Record<string, unknown>;
  sort_order: number;
  items: DashboardItem[];
}

const KEY = ["dashboard"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export function useDashboard() {
  return useQuery<{ sections: DashboardSection[] }>({
    queryKey: KEY,
    queryFn: () => fetchJson<{ sections: DashboardSection[] }>("/api/dashboard"),
  });
}

export function useCreateDashboardItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { section_id: number; item_type: "tile" | "widget"; item_id: number; sort_order: number; layout?: Record<string, unknown> }) =>
      fetchJson<DashboardItem>("/api/dashboard/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateDashboardSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; icon?: string | null; layout?: Record<string, unknown> }) =>
      fetchJson<DashboardSection>("/api/dashboard/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateDashboardSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<DashboardSection> & { id: number }) =>
      fetchJson<DashboardSection>(`/api/dashboard/sections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDashboardSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/dashboard/sections/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReorderDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sections: Array<{ id: number; sort_order: number }>;
      items: Array<{ id: number; section_id: number; sort_order: number; layout?: Record<string, unknown> }>;
    }) =>
      fetchJson<{ ok: true }>("/api/dashboard/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
