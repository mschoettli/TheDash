import { Router } from "express";
import db from "../db/client";

const router = Router();

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

router.put("/", (req, res) => {
  const allowed = ["theme", "language", "widgetStyle"];
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
