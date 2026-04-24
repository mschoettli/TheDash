import { useQuery } from "@tanstack/react-query";

export interface TagSummary {
  id: number;
  name: string;
  source: "manual" | "auto";
  created_at: string;
  count: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useTags() {
  return useQuery<TagSummary[]>({
    queryKey: ["tags"],
    queryFn: () => fetchJson<TagSummary[]>("/api/tags"),
  });
}
