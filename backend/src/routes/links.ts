import { Router } from "express";
import db from "../db/client";
import { fetchLinkMetadata } from "../lib/metadata";

const router = Router();

export interface TagRow {
  id: number;
  name: string;
  source: "manual" | "auto";
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

  const cleanNames = Array.from(
    new Set(
      tags
        .map((tag) => (typeof tag === "string" ? tag : tag?.name))
        .filter((name): name is string => typeof name === "string")
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );

  db.prepare("DELETE FROM link_tags WHERE link_id = ?").run(linkId);

  const insertTag = db.prepare(
    "INSERT OR IGNORE INTO tags (name, source) VALUES (?, 'manual')"
  );
  const selectTag = db.prepare("SELECT id FROM tags WHERE name = ?");
  const insertLinkTag = db.prepare(
    "INSERT OR IGNORE INTO link_tags (link_id, tag_id) VALUES (?, ?)"
  );

  cleanNames.forEach((name) => {
    insertTag.run(name);
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
