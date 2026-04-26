import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

const SIMPLE_ICON_SLUGS: Record<string, string> = {
  jellyfin: "jellyfin",
  plex: "plex",
  emby: "emby",
  sonarr: "sonarr",
  radarr: "radarr",
  lidarr: "lidarr",
  bazarr: "bazarr",
  prowlarr: "prowlarr",
  qbittorrent: "qbittorrent",
  transmission: "transmission",
  portainer: "portainer",
  proxmox: "proxmox",
  grafana: "grafana",
  prometheus: "prometheus",
  "home-assistant": "homeassistant",
  "node-red": "nodered",
  adguard: "adguard",
  pihole: "pihole",
  traefik: "traefikproxy",
  vaultwarden: "vaultwarden",
  nextcloud: "nextcloud",
  immich: "immich",
  gitea: "gitea",
  gitlab: "gitlab",
  unifi: "ubiquiti",
  docker: "docker",
};

router.get("/:key", async (req, res) => {
  const key = String(req.params.key ?? "").toLowerCase();
  const slug = SIMPLE_ICON_SLUGS[key];
  if (!slug) {
    res.status(404).json({ error: "logo not found" });
    return;
  }

  try {
    const response = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`, {
      timeout: 5000,
    } as any);
    if (!response.ok) {
      res.status(404).json({ error: "logo not found" });
      return;
    }
    const svg = await response.text();
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=604800");
    res.send(svg);
  } catch {
    res.status(404).json({ error: "logo unavailable" });
  }
});

export default router;
