import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tile } from "./useTiles";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export interface DiscoveredContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string[];
  labels: Record<string, string>;
  app: {
    name: string;
    group: string;
    href: string | null;
    icon: string | null;
    description: string | null;
    is_labeled: boolean;
    suggested: boolean;
    confidence: "label" | "port" | "image";
  };
}

export interface DockerDiscoveryResponse {
  status: "ok" | "disabled";
  containers: DiscoveredContainer[];
  error?: string;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  target_type: string;
  target_id: string | null;
  payload: string | null;
  created_at: string;
}

export function useDockerDiscovery() {
  return useQuery<DockerDiscoveryResponse>({
    queryKey: ["docker-discovery"],
    queryFn: () => fetchJson<DockerDiscoveryResponse>("/api/docker/discovery"),
    refetchInterval: 10000,
  });
}

export function useAdoptContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<Tile>(`/api/docker/discovery/${id}/adopt`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tiles"] });
      qc.invalidateQueries({ queryKey: ["docker-discovery"] });
    },
  });
}

export function useDockerAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "start" | "stop" | "restart" }) =>
      fetchJson<{ ok: true }>(`/api/docker/containers/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["docker-discovery"] });
      qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}

export function useAuditLog() {
  return useQuery<AuditLogEntry[]>({
    queryKey: ["audit-log"],
    queryFn: () => fetchJson<AuditLogEntry[]>("/api/docker/audit"),
  });
}
