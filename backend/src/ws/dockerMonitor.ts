import { listContainers, DockerContainer } from "../lib/docker";

export function startDockerMonitor(
  broadcast: (msg: object) => void
): void {
  const interval = parseInt(process.env.DOCKER_POLL_INTERVAL ?? "5000", 10);
  let lastJson = "";

  const poll = async () => {
    try {
      const containers = await listContainers();
      const json = JSON.stringify(containers);
      if (json !== lastJson) {
        lastJson = json;
        broadcast({ type: "docker:update", payload: containers });
      }
    } catch (err) {
      // Docker socket not available — broadcast empty list once
      if (lastJson !== "[]") {
        lastJson = "[]";
        broadcast({ type: "docker:update", payload: [] });
      }
    }
  };

  poll();
  setInterval(poll, interval);
}
