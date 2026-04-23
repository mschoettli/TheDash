import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface Link {
  id: number;
  section_id: number;
  name: string;
  url: string;
  icon_url: string | null;
  sort_order: number;
}

const SECTIONS_KEY = ["sections"];

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Link, "id">) =>
      fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: SECTIONS_KEY }),
  });
}

export function useUpdateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Link> & { id: number }) =>
      fetch(`/api/links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: SECTIONS_KEY }),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/links/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: SECTIONS_KEY }),
  });
}
