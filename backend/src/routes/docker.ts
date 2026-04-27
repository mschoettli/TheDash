import { Request, Router } from "express";
import db from "../db/client";
import { DockerContainer, dockerPost, listContainers } from "../lib/docker";
import { resolveLogo } from "../lib/logoResolver";

const router = Router();

function firstLabel(labels: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = labels[key];
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function cleanImageName(image: string): string {
  const withoutRegistry = image.split("/").pop() ?? image;
  return withoutRegistry.split(":")[0]?.replace(/[-_]+/g, " ") ?? image;
}

function publicHostFromRequest(req: Request): string {
  const configured = process.env.THEDASH_DOCKER_HOST?.trim();
  if (configured) return configured.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return String(req.get("host") ?? "localhost").split(":")[0];
}

function hrefFromContainer(container: DockerContainer, publicHost: string): string | null {
  const labelHref = firstLabel(container.labels, [
    "thedash.href",
    "thedash.url",
    "homepage.href",
  ]);
  if (labelHref) return labelHref;

  const firstPort = container.ports[0]?.split(":")[0];
  return firstPort ? `http://${publicHost}:${firstPort}` : null;
}

function mapDiscovery(container: DockerContainer, publicHost: string) {
  const labels = container.labels ?? {};
  const name = firstLabel(labels, ["thedash.name", "homepage.name"]) ?? cleanImageName(container.image) ?? container.name;
  const group = firstLabel(labels, ["thedash.group", "homepage.group"]) ?? "Discovered";
  const icon = firstLabel(labels, ["thedash.icon", "homepage.icon"]);
  const description = firstLabel(labels, ["thedash.description", "homepage.description"]);
  const href = hrefFromContainer(container, publicHost);
  const isLabeled = Object.keys(labels).some(
    (label) => label.startsWith("thedash.") || label.startsWith("homepage.")
  );

  return {
    ...container,
    app: {
      name,
      group,
      href,
      icon,
      description,
      is_labeled: isLabeled,
      suggested: !isLabeled,
      confidence: isLabeled ? "label" : href ? "port" : "image",
    },
  };
}

function writeAudit(action: string, targetType: string, targetId: string, payload?: unknown): void {
  db.prepare(
    "INSERT INTO audit_log (action, target_type, target_id, payload) VALUES (?, ?, ?, ?)"
  ).run(action, targetType, targetId, payload ? JSON.stringify(payload) : null);
}

router.get("/discovery", async (req, res) => {
  try {
    const containers = await listContainers();
    const publicHost = publicHostFromRequest(req);
    res.json({ status: "ok", containers: containers.map((container) => mapDiscovery(container, publicHost)) });
  } catch (err: any) {
    res.status(200).json({
      status: "disabled",
      containers: [],
      error: err.message,
      hint: "Start TheDash with the docker-monitoring profile and ensure the Docker socket proxy can access /var/run/docker.sock.",
    });
  }
});

router.post("/containers/:id/:action", async (req, res) => {
  const action = String(req.params.action);
  if (!["start", "stop", "restart"].includes(action)) {
    res.status(400).json({ error: "unsupported action" });
    return;
  }

  try {
    await dockerPost(`/containers/${encodeURIComponent(req.params.id)}/${action}`);
    writeAudit(`docker.${action}`, "container", req.params.id, { confirmed: Boolean(req.body?.confirmed) });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/discovery/:id/adopt", async (req, res) => {
  try {
    const containers = await listContainers();
    const publicHost = publicHostFromRequest(req);
    const discovered = containers.map((container) => mapDiscovery(container, publicHost)).find((container) => container.id === req.params.id);
    if (!discovered || !discovered.app.href) {
      res.status(404).json({ error: "discoverable container not found" });
      return;
    }

    const resolvedLogo = await resolveLogo({
      name: discovered.app.name,
      url: discovered.app.href ?? "",
      image: discovered.image,
      labels: JSON.stringify(discovered.labels ?? {}),
    });
    const logo = discovered.app.icon ?? (
      resolvedLogo.status === "found" && resolvedLogo.slug
        ? `logo:${resolvedLogo.source}:${resolvedLogo.slug}`
        : null
    );

    const result = db
      .prepare(
        "INSERT INTO tiles (name, url, icon_url, style, api_url, api_key, provider, sort_order) VALUES (?, ?, ?, 'card', NULL, NULL, 'none', ?)"
      )
      .run(
        discovered.app.name,
        discovered.app.href,
        logo,
        Date.now()
      );
    writeAudit("docker.adopt", "container", discovered.id, discovered.app);
    res.status(201).json(db.prepare("SELECT * FROM tiles WHERE id = ?").get(result.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/audit", (_req, res) => {
  res.json(db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC, id DESC LIMIT 100").all());
});

export default router;
