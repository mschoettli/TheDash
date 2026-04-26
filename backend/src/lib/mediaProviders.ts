import fetch from "node-fetch";

export type MediaProvider = "none" | "jellyfin" | "plex" | "emby";

export interface TileMetrics {
  status: "ok" | "error" | "unconfigured";
  provider: MediaProvider;
  seriesCount: number | null;
  movieCount: number | null;
  activeStreams: number | null;
  lastUpdated: string;
  error?: string;
}

function normalizeBaseUrl(url: string): string {
  const withScheme = /^https?:\/\//i.test(url) ? url : `http://${url}`;
  const parsed = new URL(withScheme);
  parsed.pathname = parsed.pathname.replace(/\/web\/?$/i, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function parseMediaContainerTotalSize(xml: string): number | null {
  const match = xml.match(/<MediaContainer[^>]*totalSize="(\d+)"/i);
  return match ? Number(match[1]) : null;
}

function parsePlexSections(xml: string): Array<{ key: string; type: "movie" | "show" }> {
  const regex = /<Directory[^>]*key="(\d+)"[^>]*type="(movie|show)"[^>]*>/gi;
  const sections: Array<{ key: string; type: "movie" | "show" }> = [];
  let match = regex.exec(xml);
  while (match) {
    sections.push({ key: match[1], type: match[2] as "movie" | "show" });
    match = regex.exec(xml);
  }
  return sections;
}

async function fetchJson(url: string, headers?: Record<string, string>): Promise<any> {
  const res = await fetch(url, { headers, timeout: 7000 } as any);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json();
}

async function fetchText(url: string, headers?: Record<string, string>): Promise<string> {
  const res = await fetch(url, { headers, timeout: 7000 } as any);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.text();
}

async function fetchJellyfinMetrics(baseUrl: string, apiKey?: string | null): Promise<TileMetrics> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-Emby-Token"] = apiKey;

  const counts = await fetchJson(`${baseUrl}/Items/Counts`, headers);
  const sessions = await fetchJson(`${baseUrl}/Sessions`, headers);

  return {
    status: "ok",
    provider: "jellyfin",
    seriesCount: Number(counts.SeriesCount ?? 0),
    movieCount: Number(counts.MovieCount ?? 0),
    activeStreams: Array.isArray(sessions)
      ? sessions.filter((entry) => entry.NowPlayingItem).length
      : 0,
    lastUpdated: new Date().toISOString(),
  };
}

async function fetchEmbyMetrics(baseUrl: string, apiKey?: string | null): Promise<TileMetrics> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-Emby-Token"] = apiKey;

  const counts = await fetchJson(`${baseUrl}/Items/Counts`, headers);
  const sessions = await fetchJson(`${baseUrl}/Sessions`, headers);

  return {
    status: "ok",
    provider: "emby",
    seriesCount: Number(counts.SeriesCount ?? 0),
    movieCount: Number(counts.MovieCount ?? 0),
    activeStreams: Array.isArray(sessions)
      ? sessions.filter((entry) => entry.NowPlayingItem).length
      : 0,
    lastUpdated: new Date().toISOString(),
  };
}

async function fetchPlexMetrics(baseUrl: string, apiKey?: string | null): Promise<TileMetrics> {
  const tokenSuffix = apiKey ? `?X-Plex-Token=${encodeURIComponent(apiKey)}` : "";
  const sectionsXml = await fetchText(`${baseUrl}/library/sections${tokenSuffix}`);
  const sections = parsePlexSections(sectionsXml);

  let movieCount = 0;
  let seriesCount = 0;

  for (const section of sections) {
    const separator = tokenSuffix ? "&" : "?";
    const url = `${baseUrl}/library/sections/${section.key}/all${tokenSuffix}${separator}X-Plex-Container-Start=0&X-Plex-Container-Size=0`;
    const content = await fetchText(url);
    const totalSize = parseMediaContainerTotalSize(content) ?? 0;
    if (section.type === "movie") movieCount += totalSize;
    if (section.type === "show") seriesCount += totalSize;
  }

  const sessionsXml = await fetchText(`${baseUrl}/status/sessions${tokenSuffix}`);
  const activeStreams = (sessionsXml.match(/<Video\b/gi) ?? []).length;

  return {
    status: "ok",
    provider: "plex",
    seriesCount,
    movieCount,
    activeStreams,
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchProviderMetrics(params: {
  provider: MediaProvider;
  apiUrl?: string | null;
  apiKey?: string | null;
}): Promise<TileMetrics> {
  const { provider, apiUrl, apiKey } = params;

  if (!apiUrl || provider === "none") {
    return {
      status: "unconfigured",
      provider,
      seriesCount: null,
      movieCount: null,
      activeStreams: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  const baseUrl = normalizeBaseUrl(apiUrl);

  try {
    if (provider === "jellyfin") {
      return await fetchJellyfinMetrics(baseUrl, apiKey);
    }
    if (provider === "plex") {
      return await fetchPlexMetrics(baseUrl, apiKey);
    }
    if (provider === "emby") {
      return await fetchEmbyMetrics(baseUrl, apiKey);
    }

    return {
      status: "unconfigured",
      provider,
      seriesCount: null,
      movieCount: null,
      activeStreams: null,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      status: "error",
      provider,
      seriesCount: null,
      movieCount: null,
      activeStreams: null,
      lastUpdated: new Date().toISOString(),
      error: error?.message ?? "Unknown provider error",
    };
  }
}
