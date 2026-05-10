import crypto from "crypto";
import express, { Router } from "express";
import fs from "fs/promises";
import path from "path";
import db from "../db/client";
import { getPreviewRoot } from "../lib/previews";

const router = Router();
const BACKGROUND_DIR = path.join(getPreviewRoot(), "backgrounds");
const BACKGROUND_TYPES: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const result: Record<string, string> = {};
  rows.forEach((r) => (result[r.key] = r.value));
  res.json(result);
});

router.get("/runtime", (_req, res) => {
  res.json({
    aiTagging: {
      enabled: Boolean(process.env.AI_TAGGING_PROVIDER && (process.env.AI_TAGGING_API_KEY || process.env.OPENAI_API_KEY)),
      provider: process.env.AI_TAGGING_PROVIDER || "local",
      model: process.env.AI_TAGGING_MODEL || null,
    },
    logos: {
      provider: "simple-icons",
      proxy: "/api/logos/:key",
    },
  });
});

router.post(
  "/background",
  express.raw({ type: Object.keys(BACKGROUND_TYPES), limit: "8mb" }),
  async (req, res) => {
    const contentType = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    const extension = BACKGROUND_TYPES[contentType];
    const body = req.body as Buffer | undefined;

    if (!extension || !Buffer.isBuffer(body) || body.length === 0) {
      res.status(415).json({ error: "valid image upload required" });
      return;
    }

    await fs.mkdir(BACKGROUND_DIR, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
    await fs.writeFile(path.join(BACKGROUND_DIR, filename), body);
    res.status(201).json({ url: `/api/previews/backgrounds/${filename}` });
  }
);

router.put("/", (req, res) => {
  const allowed = ["theme", "language", "widgetStyle", "backgroundMode", "backgroundImage"];
  const upsert = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
  );
  const update = db.transaction((data: Record<string, string>) => {
    for (const key of allowed) {
      if (key in data) upsert.run(key, data[key]);
    }
  });
  update(req.body);
  res.json({ ok: true });
});

export default router;
