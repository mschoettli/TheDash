import { create } from "zustand";

export interface DiskInfo {
  fs: string;
  mount: string;
  used: number;
  size: number;
  percent: number;
}

export interface MetricsState {
  cpu: number;
  ram: { used: number; total: number; percent: number };
  disks: DiskInfo[];
  setMetrics: (metrics: Omit<MetricsState, "setMetrics">) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  cpu: 0,
  ram: { used: 0, total: 0, percent: 0 },
  disks: [],
  setMetrics: ({ cpu, ram, disks }) => set({ cpu, ram, disks }),
}));
