import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type TileStyle = "card" | "compact" | "minimal";
export type TileProvider = "none" | "jellyfin" | "plex" | "emby";

export interface Tile {
  id: number;
  name: string;
  url: string;
  icon_url: string | null;
  style: TileStyle;
  api_url: string | null;
  api_key: string | null;
  provider: TileProvider;
  show_address: boolean;
  sort_order: number;
  created_at: string;
}

export interface TileMetrics {
  status: "ok" | "error" | "unconfigured";
  provider: TileProvider;
  seriesCount: number | null;
  movieCount: number | null;
  activeStreams: number | null;
  lastUpdated: string;
  error?: string;
}

const KEY = ["tiles"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useTiles() {
  return useQuery<Tile[]>({
    queryKey: KEY,
    queryFn: () => fetchJson<Tile[]>("/api/tiles"),
  });
}

export function useCreateTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Tile, "id" | "created_at">) =>
      fetchJson<Tile>("/api/tiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Tile> & { id: number }) =>
      fetchJson<Tile>(`/api/tiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchJson<{ ok: true }>(`/api/tiles/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReorderTiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: number; sort_order: number }>) =>
      fetchJson<{ ok: true }>("/api/tiles/reorder/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export async function fetchTileMetrics(id: number): Promise<TileMetrics> {
  return fetchJson<TileMetrics>(`/api/tiles/${id}/metrics`);
}
