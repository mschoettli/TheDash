import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Link } from "./useLinks";

export interface Section {
  id: number;
  title: string;
  sort_order: number;
  links: Link[];
}

const KEY = ["sections"];

export function useSections() {
  return useQuery<Section[]>({
    queryKey: KEY,
    queryFn: () => fetch("/api/sections").then((r) => r.json()),
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string }) =>
      fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; title?: string }) =>
      fetch(`/api/sections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/sections/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
