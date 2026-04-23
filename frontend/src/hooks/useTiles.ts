import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Tile {
  id: number;
  name: string;
  url: string;
  icon_url: string | null;
  style: "card" | "compact" | "minimal";
  api_endpoint: string | null;
  sort_order: number;
  created_at: string;
}

const KEY = ["tiles"];

export function useTiles() {
  return useQuery<Tile[]>({
    queryKey: KEY,
    queryFn: () => fetch("/api/tiles").then((r) => r.json()),
  });
}

export function useCreateTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Tile, "id" | "created_at">) =>
      fetch("/api/tiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Tile> & { id: number }) =>
      fetch(`/api/tiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/tiles/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
