import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface DashboardCard {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  tile_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardSection {
  id: number;
  title: string;
  sort_order: number;
  cards: DashboardCard[];
}

const KEY = ["dashboard-board"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useDashboardSections() {
  return useQuery<DashboardSection[]>({
    queryKey: KEY,
    queryFn: () => fetchJson<DashboardSection[]>("/api/dashboard/sections"),
  });
}

export function useCreateDashboardSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string }) =>
      fetchJson<DashboardSection>("/api/dashboard/sections", {
        method: "POST",
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

export function useCreateDashboardCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      section_id: number;
      title: string;
      description?: string;
      tile_id?: number | null;
    }) =>
      fetchJson<DashboardCard>("/api/dashboard/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMoveDashboardCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, section_id, sort_order }: { id: number; section_id: number; sort_order: number }) =>
      fetchJson<DashboardCard>(`/api/dashboard/cards/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id, sort_order }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDashboardCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<{ ok: true }>(`/api/dashboard/cards/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}