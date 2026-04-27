import { Router } from "express";
import {
  fetchLogoSvg,
  LogoSource,
  resolveLogo,
} from "../lib/logoResolver";

const router = Router();

function stableValue(result: Awaited<ReturnType<typeof resolveLogo>>): string | null {
  if (result.status !== "found" || !result.slug) return null;
  return `logo:${result.source}:${result.slug}`;
}

router.get("/resolve", async (req, res) => {
  const result = await resolveLogo({
    name: String(req.query.name ?? ""),
    url: String(req.query.url ?? ""),
    image: String(req.query.image ?? ""),
    labels: String(req.query.labels ?? ""),
  });

  res.json({
    ...result,
    value: stableValue(result),
  });
});

router.get("/:source/:slug", async (req, res) => {
  const source = String(req.params.source) as LogoSource;
  const slug = String(req.params.slug ?? "").toLowerCase();
  const svg = await fetchLogoSvg(source, slug);

  if (!svg) {
    res.status(404).json({ error: "logo not found" });
    return;
  }

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=604800");
  res.send(svg);
});

router.get("/:key", async (req, res) => {
  const result = await resolveLogo({ name: String(req.params.key ?? "") });
  if (result.status !== "found" || !result.slug) {
    res.status(404).json({ error: "logo not found" });
    return;
  }

  const svg = await fetchLogoSvg(result.source, result.slug);
  if (!svg) {
    res.status(404).json({ error: "logo unavailable" });
    return;
  }

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=604800");
  res.send(svg);
});

export default router;
