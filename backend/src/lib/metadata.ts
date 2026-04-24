import fetch from "node-fetch";

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  iconUrl: string | null;
}

function getMetaContent(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function normalizeUrl(baseUrl: string, value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TheDash/1.0 (+https://github.com/mschoettli/TheDash)",
      },
      timeout: 7000,
    } as any);

    if (!res.ok) {
      throw new Error(`Metadata request failed (${res.status})`);
    }

    const html = await res.text();
    const title =
      getMetaContent(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      ]) ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;

    const description = getMetaContent(html, [
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    ]);

    const image = getMetaContent(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    ]);

    const icon = getMetaContent(html, [
      /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i,
    ]);

    return {
      title,
      description,
      imageUrl: normalizeUrl(url, image),
      iconUrl: normalizeUrl(url, icon) ?? normalizeUrl(url, "/favicon.ico"),
    };
  } catch {
    return {
      title: null,
      description: null,
      imageUrl: null,
      iconUrl: null,
    };
  }
}
