import fetch from "node-fetch";
import db from "../db/client";

export type LogoSource =
  | "selfhst"
  | "dashboard-icons"
  | "simple-icons"
  | "favicon"
  | "fallback";

export interface LogoResult {
  status: "found" | "not_found";
  source: LogoSource;
  slug: string | null;
  format: string | null;
  url: string | null;
  confidence: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const POSITIVE_TTL_MS = 30 * DAY_MS;
const NEGATIVE_TTL_MS = 7 * DAY_MS;

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

const ALIASES: Record<string, string> = {
  adguardhome: "adguard-home",
  adguard: "adguard-home",
  bitwarden: "vaultwarden",
  code: "code-server",
  codeserver: "code-server",
  homeassistant: "home-assistant",
  jellyseerr: "jellyseerr",
  npm: "nginx-proxy-manager",
  pihole: "pi-hole",
  qbittorrent: "qbittorrent",
  qbit: "qbittorrent",
  unifi: "unifi",
  ubiquiti: "unifi",
};

const GENERIC_TERMS = new Set([
  "app",
  "apps",
  "container",
  "dashboard",
  "docker",
  "home",
  "host",
  "http",
  "https",
  "latest",
  "linuxserver",
  "lscr",
  "server",
  "service",
  "web",
]);

function cacheKey(parts: string[]): string {
  return parts.filter(Boolean).join("|").toLowerCase().slice(0, 500);
}

function readCache(key: string): LogoResult | null {
  const row = db.prepare("SELECT result_json, expires_at FROM logo_cache WHERE cache_key = ?").get(key) as
    | { result_json: string; expires_at: string }
    | undefined;
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;

  try {
    return JSON.parse(row.result_json) as LogoResult;
  } catch {
    return null;
  }
}

function writeCache(key: string, result: LogoResult): void {
  const ttl = result.status === "found" ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl).toISOString();
  db.prepare(
    `INSERT INTO logo_cache (cache_key, result_json, expires_at, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(cache_key) DO UPDATE SET
       result_json = excluded.result_json,
       expires_at = excluded.expires_at,
       updated_at = datetime('now')`
  ).run(key, JSON.stringify(result), expiresAt);
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/^ghcr\.io\//, "")
    .replace(/^docker\.io\//, "")
    .replace(/^lscr\.io\//, "")
    .replace(/:[a-z0-9._-]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tokensFromUrl(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = new URL(value.startsWith("http") ? value : `http://${value}`);
    return parsed.hostname
      .split(".")
      .filter((part) => !/^\d+$/.test(part))
      .map(normalizeToken);
  } catch {
    return [];
  }
}

function tokensFromLabels(labels?: string): string[] {
  if (!labels) return [];
  try {
    const parsed = JSON.parse(labels);
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>).flatMap(([key, value]) => [
        normalizeToken(key),
        normalizeToken(String(value ?? "")),
      ]);
    }
  } catch {
    // Plain label strings are handled below.
  }
  return labels.split(/[,\s;]+/).map(normalizeToken);
}

export function logoUrl(source: LogoSource, slug: string, format = "svg"): string | null {
  if (source === "selfhst") {
    return `https://cdn.jsdelivr.net/gh/selfhst/icons/${format}/${slug}.${format}`;
  }
  if (source === "dashboard-icons") {
    return `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/${slug}.svg`;
  }
  if (source === "simple-icons") {
    return `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`;
  }
  return null;
}

export function candidateSlugs(input: {
  name?: string;
  url?: string;
  image?: string;
  labels?: string;
}): string[] {
  const rawTokens = [
    ...(input.name ?? "").split(/[\s/|:._-]+/),
    ...(input.image ?? "").split(/[\s/|:._-]+/),
    ...tokensFromUrl(input.url),
    ...tokensFromLabels(input.labels),
  ];

  const normalized = rawTokens
    .map(normalizeToken)
    .filter((token) => token && token.length > 1)
    .filter((token) => !GENERIC_TERMS.has(token))
    .filter((token) => !/^\d+$/.test(token))
    .map((token) => ALIASES[token] ?? token);

  const combined = normalizeToken([input.name, input.image].filter(Boolean).join(" "));
  if (combined && !GENERIC_TERMS.has(combined)) normalized.unshift(ALIASES[combined] ?? combined);

  return Array.from(new Set(normalized)).slice(0, 24);
}

async function isReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", timeout: 3500 } as any);
    if (response.ok) return true;
    const fallback = await fetch(url, { timeout: 3500 } as any);
    return fallback.ok;
  } catch {
    return false;
  }
}

async function findFromSource(
  source: Extract<LogoSource, "selfhst" | "dashboard-icons" | "simple-icons">,
  slugs: string[]
): Promise<LogoResult | null> {
  for (const slug of slugs) {
    const mappedSlug = source === "simple-icons" ? SIMPLE_ICON_SLUGS[slug] : slug;
    if (!mappedSlug) continue;
    const url = logoUrl(source, mappedSlug, "svg");
    if (url && await isReachable(url)) {
      return {
        status: "found",
        source,
        slug: mappedSlug,
        format: "svg",
        url,
        confidence: source === "selfhst" ? 0.95 : source === "dashboard-icons" ? 0.9 : 0.8,
      };
    }
  }
  return null;
}

export async function resolveLogo(input: {
  name?: string;
  url?: string;
  image?: string;
  labels?: string;
}): Promise<LogoResult> {
  const slugs = candidateSlugs(input);
  const key = cacheKey([input.name ?? "", input.url ?? "", input.image ?? "", input.labels ?? "", slugs.join(",")]);
  const cached = readCache(key);
  if (cached) return cached;

  const result =
    (await findFromSource("selfhst", slugs)) ??
    (await findFromSource("dashboard-icons", slugs)) ??
    (await findFromSource("simple-icons", slugs)) ?? {
      status: "not_found" as const,
      source: "fallback" as const,
      slug: null,
      format: null,
      url: null,
      confidence: 0,
    };

  writeCache(key, result);
  return result;
}

export async function fetchLogoSvg(source: LogoSource, slug: string): Promise<string | null> {
  const url = logoUrl(source, slug, "svg");
  if (!url) return null;
  try {
    const response = await fetch(url, { timeout: 5000 } as any);
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}
