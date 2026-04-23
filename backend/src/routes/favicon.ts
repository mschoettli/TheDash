import { Router } from "express";
import fetch from "node-fetch";

const router = Router();
const cache = new Map<string, string | null>();

async function findFavicon(urlStr: string): Promise<string | null> {
  let origin: string;
  try {
    origin = new URL(urlStr).origin;
  } catch {
    return null;
  }

  if (cache.has(origin)) return cache.get(origin)!;

  // Try /favicon.ico directly
  const directUrl = `${origin}/favicon.ico`;
  try {
    const res = await fetch(directUrl, { method: "HEAD", timeout: 3000 } as any);
    if (res.ok) {
      cache.set(origin, directUrl);
      return directUrl;
    }
  } catch {
    // continue
  }

  // Parse HTML for <link rel="icon">
  try {
    const res = await fetch(origin, { timeout: 3000 } as any);
    if (res.ok) {
      const html = await res.text();
      const match = html.match(
        /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i
      ) ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
      if (match) {
        const href = match[1];
        const iconUrl = href.startsWith("http") ? href : `${origin}${href.startsWith("/") ? "" : "/"}${href}`;
        cache.set(origin, iconUrl);
        return iconUrl;
      }
    }
  } catch {
    // continue
  }

  cache.set(origin, null);
  return null;
}

router.get("/", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: "url required" });
    return;
  }
  const faviconUrl = await findFavicon(url);
  res.json({ faviconUrl });
});

export default router;
