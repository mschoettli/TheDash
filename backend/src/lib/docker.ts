import http from "http";

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string[];
}

export function dockerGet(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: "/var/run/docker.sock",
        path,
        method: "GET",
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Invalid JSON from Docker socket"));
          }
        });
      }
    );
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Docker socket timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

export async function listContainers(): Promise<DockerContainer[]> {
  const raw = (await dockerGet("/containers/json?all=1")) as Array<{
    Id: string;
    Names: string[];
    Image: string;
    Status: string;
    State: string;
    Ports: Array<{ PublicPort?: number; PrivatePort: number; Type: string }>;
  }>;

  return raw.map((c) => ({
    id: c.Id.slice(0, 12),
    name: (c.Names[0] ?? "").replace(/^\//, ""),
    image: c.Image,
    status: c.Status,
    state: c.State,
    ports: c.Ports.filter((p) => p.PublicPort).map(
      (p) => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`
    ),
  }));
}
