import { Router } from "express";
import db from "../db/client";
import { fetchLinkMetadata } from "../lib/metadata";
import { suggestAiTags } from "../lib/tagging";

const router = Router();

export interface TagRow {
  id: number;
  name: string;
  source: "manual" | "auto" | "ai";
  created_at: string;
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function fallbackTitle(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isIpLike(value: string): boolean {
  return /^\d+$/.test(value) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value) || /^\d{2,5}$/.test(value);
}

function isTagWord(value: string): boolean {
  return value.length > 2 && !isIpLike(value) && !["com", "net", "org", "local", "lan"].includes(value);
}

function suggestTags(input: { url: string; title?: string; description?: string }) {
  const values = new Map<string, "auto" | "ai">();
  try {
    const host = new URL(normalizeUrl(input.url)).hostname.replace(/^www\./, "");
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
      host.split(".").filter(isTagWord).forEach((part) => values.set(part.toLowerCase(), "auto"));
    }
  } catch {
    // Invalid URLs can still produce title/description based suggestions.
  }

  `${input.title ?? ""} ${input.description ?? ""}`
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .filter((word) => word.length > 4 && !isIpLike(word))
    .slice(0, 8)
    .forEach((word) => values.set(word, "auto"));

  return Array.from(values.entries()).slice(0, 10).map(([name, source]) => ({ name, source }));
}

function getTagsForLinks(linkIds: number[]): Map<number, TagRow[]> {
  const result = new Map<number, TagRow[]>();
  if (linkIds.length === 0) return result;

  const placeholders = linkIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT lt.link_id, t.id, t.name, t.source, t.created_at
       FROM link_tags lt
       JOIN tags t ON t.id = lt.tag_id
       WHERE lt.link_id IN (${placeholders})
       ORDER BY t.name ASC`
    )
    .all(...linkIds) as Array<TagRow & { link_id: number }>;

  rows.forEach((row) => {
    const current = result.get(row.link_id) ?? [];
    current.push({
      id: row.id,
      name: row.name,
      source: row.source,
      created_at: row.created_at,
    });
    result.set(row.link_id, current);
  });

  return result;
}

export function attachTags<T extends { id: number }>(links: T[]): Array<T & { tags: TagRow[] }> {
  const tagsByLink = getTagsForLinks(links.map((link) => link.id));
  return links.map((link) => ({
    ...link,
    tags: tagsByLink.get(link.id) ?? [],
  }));
}

function syncLinkTags(linkId: number, tags: unknown): void {
  if (!Array.isArray(tags)) return;

  const cleanTags = new Map<string, "manual" | "auto" | "ai">();
  tags.forEach((tag) => {
    const value = tag as any;
    const name = typeof value === "string" ? value : value?.name;
    if (typeof name !== "string") return;
    const source = typeof value === "object" && value && ["manual", "auto", "ai"].includes(value.source)
      ? (value.source as "manual" | "auto" | "ai")
      : "manual";
    const cleanName = name.trim();
    if (cleanName && !isIpLike(cleanName)) cleanTags.set(cleanName, source);
  });

  db.prepare("DELETE FROM link_tags WHERE link_id = ?").run(linkId);

  const insertTag = db.prepare(
    "INSERT OR IGNORE INTO tags (name, source) VALUES (?, ?)"
  );
  const selectTag = db.prepare("SELECT id FROM tags WHERE name = ?");
  const insertLinkTag = db.prepare(
    "INSERT OR IGNORE INTO link_tags (link_id, tag_id) VALUES (?, ?)"
  );

  cleanTags.forEach((source, name) => {
    insertTag.run(name, source);
    const row = selectTag.get(name) as { id: number } | undefined;
    if (row) insertLinkTag.run(linkId, row.id);
  });
}

router.post("/", (req, res) => {
  const {
    section_id,
    name,
    url,
    icon_url,
    image_url,
    description,
    note,
    is_favorite,
    is_archived,
    sort_order,
    tags,
  } = req.body;

  if (!section_id || !name || !url) {
    res.status(400).json({ error: "section_id, name and url required" });
    return;
  }

  const insert = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO links
          (section_id, name, url, icon_url, image_url, description, note, is_favorite, is_archived, sort_order, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        section_id,
        name,
        normalizeUrl(url),
        icon_url ?? null,
        image_url ?? null,
        description ?? null,
        note ?? null,
        is_favorite ? 1 : 0,
        is_archived ? 1 : 0,
        sort_order ?? 0
      );
    syncLinkTags(Number(result.lastInsertRowid), tags);
    return result.lastInsertRowid;
  });

  const id = insert();
  const link = db.prepare("SELECT * FROM links WHERE id = ?").get(id) as any;
  res.status(201).json(attachTags([link])[0]);
});

router.post("/capture", async (req, res) => {
  const sectionId = Number(req.body?.section_id);
  const url = String(req.body?.url ?? "").trim();
  const tags = req.body?.tags ?? [];

  if (!sectionId || !url) {
    res.status(400).json({ error: "section_id and url required" });
    return;
  }

  const normalizedUrl = normalizeUrl(url);
  const metadata = await fetchLinkMetadata(normalizedUrl);
  const name = metadata.title ?? fallbackTitle(normalizedUrl);

  const insert = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO links
          (section_id, name, url, icon_url, image_url, description, sort_order, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        sectionId,
        name,
        normalizedUrl,
        metadata.iconUrl,
        metadata.imageUrl,
        metadata.description,
        0
      );
    syncLinkTags(Number(result.lastInsertRowid), tags);
    return result.lastInsertRowid;
  });

  const id = insert();
  const link = db.prepare("SELECT * FROM links WHERE id = ?").get(id) as any;
  res.status(201).json(attachTags([link])[0]);
});

router.post("/tag-suggestions", async (req, res) => {
  const url = String(req.body?.url ?? "").trim();
  const title = String(req.body?.title ?? "").trim();
  const description = String(req.body?.description ?? "").trim();

  if (!url && !title && !description) {
    res.status(400).json({ error: "url, title or description required" });
    return;
  }

  const autoSuggestions = suggestTags({ url, title, description });
  const aiSuggestions = await suggestAiTags({ kind: "bookmark", url, title, description });
  res.json({
    provider: aiSuggestions ? "ai" : "auto",
    suggestions: aiSuggestions ?? autoSuggestions,
    fallback: aiSuggestions ? autoSuggestions : undefined,
  });
});

router.put("/reorder/batch", (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) {
    res.status(400).json({ error: "items required" });
    return;
  }

  db.transaction(() => {
    const update = db.prepare("UPDATE links SET section_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?");
    items.forEach((item: any) => {
      const id = Number(item.id);
      const sectionId = Number(item.section_id);
      const sortOrder = Number(item.sort_order);
      if (Number.isFinite(id) && Number.isFinite(sectionId) && Number.isFinite(sortOrder)) {
        update.run(sectionId, sortOrder, id);
      }
    });
  })();

  res.json({ ok: true });
});

router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM links WHERE id = ?")
    .get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const {
    section_id,
    name,
    url,
    icon_url,
    image_url,
    description,
    note,
    is_favorite,
    is_archived,
    sort_order,
    tags,
  } = req.body;

  db.transaction(() => {
    db.prepare(
      `UPDATE links
       SET section_id=?, name=?, url=?, icon_url=?, image_url=?, description=?, note=?,
           is_favorite=?, is_archived=?, sort_order=?, updated_at=datetime('now')
       WHERE id=?`
    ).run(
      section_id ?? existing.section_id,
      name ?? existing.name,
      url !== undefined ? normalizeUrl(url) : existing.url,
      icon_url !== undefined ? icon_url : existing.icon_url,
      image_url !== undefined ? image_url : existing.image_url,
      description !== undefined ? description : existing.description,
      note !== undefined ? note : existing.note,
      is_favorite !== undefined ? (is_favorite ? 1 : 0) : existing.is_favorite,
      is_archived !== undefined ? (is_archived ? 1 : 0) : existing.is_archived,
      sort_order ?? existing.sort_order,
      req.params.id
    );

    if (tags !== undefined) syncLinkTags(Number(req.params.id), tags);
  })();

  const link = db.prepare("SELECT * FROM links WHERE id = ?").get(req.params.id) as any;
  res.json(attachTags([link])[0]);
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM links WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
