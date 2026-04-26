import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

router.get("/", async (req, res) => {
  const url = String(req.query.url ?? "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: "valid image url required" });
    return;
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "TheDash/1.0 (+https://github.com/mschoettli/TheDash)" },
      timeout: 7000,
    } as any);

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/")) {
      res.status(415).json({ error: "url is not an image" });
      return;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    upstream.body.pipe(res);
  } catch {
    res.status(502).json({ error: "image fetch failed" });
  }
});

export default router;
