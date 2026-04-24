import http from "http";

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string[];
  labels: Record<string, string>;
}

const dockerHostUrl = process.env.DOCKER_HOST_URL?.trim();

export function dockerGet(path: string): Promise<unknown> {
  return dockerRequest("GET", path);
}

export function dockerPost(path: string): Promise<unknown> {
  return dockerRequest("POST", path);
}

function dockerRequest(method: "GET" | "POST", path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const requestOptions: http.RequestOptions = (() => {
      if (!dockerHostUrl) {
        return {
          socketPath: "/var/run/docker.sock",
          path,
          method,
        };
      }

      const parsed = new URL(dockerHostUrl);
      return {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path,
        method,
      };
    })();

    const req = http.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Invalid JSON from Docker API"));
        }
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Docker API timeout"));
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
    Labels?: Record<string, string>;
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
    labels: c.Labels ?? {},
  }));
}
