import { create } from "zustand";

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string[];
  labels?: Record<string, string>;
}

interface DockerState {
  containers: DockerContainer[];
  setContainers: (containers: DockerContainer[]) => void;
}

export const useDockerStore = create<DockerState>((set) => ({
  containers: [],
  setContainers: (containers) => set({ containers }),
}));
