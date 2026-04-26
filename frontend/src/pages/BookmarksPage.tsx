import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Columns3, LayoutGrid, Plus, Search, Send, Rows3 } from "lucide-react";
import { useSections, useCreateSection } from "../hooks/useSections";
import { Link, suggestAutoTags, useReorderLinks } from "../hooks/useLinks";
import { useTags } from "../hooks/useTags";
import LinkSection from "../components/links/LinkSection";
import LinkItem from "../components/links/LinkItem";
import BookmarkCard from "../components/links/BookmarkCard";
import BookmarkPreviewDrawer from "../components/links/BookmarkPreviewDrawer";
import LinkEditModal from "../components/links/LinkEditModal";

function matchesSearch(link: Link, query: string): boolean {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [link.name, link.url, link.description ?? "", link.note ?? "", ...link.tags.map((t) => t.name)]
    .join(" ")
    .toLowerCase()
    .includes(value);
}

export default function BookmarksPage() {
  const { t } = useTranslation();
  const { data: sections, isLoading } = useSections();
  const { data: tags } = useTags();
  const createSection = useCreateSection();
  const reorderLinks = useReorderLinks();

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"feed" | "sections" | "kanban">("feed");
  const [dragLinkId, setDragLinkId] = useState<number | null>(null);
  const [dragOverLinkId, setDragOverLinkId] = useState<number | null>(null);
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureDraft, setCaptureDraft] = useState<Partial<Link> | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);

  const allLinks = useMemo(() => sections?.flatMap((s) => s.links) ?? [], [sections]);
  const filteredLinks = useMemo(
    () =>
      allLinks.filter((link) => {
        const tagMatch = activeTag ? link.tags.some((t) => t.name === activeTag) : true;
        return tagMatch && matchesSearch(link, query);
      }),
    [activeTag, allLinks, query]
  );

  const defaultSectionId = sections?.[0]?.id;

  const handleAddSection = () => {
    if (!newTitle.trim()) return;
    createSection.mutate({ title: newTitle.trim() }, { onSuccess: () => { setNewTitle(""); setAdding(false); } });
  };

  const handleCapture = () => {
    if (!defaultSectionId || !captureUrl.trim()) return;
    const url = captureUrl.trim();
    let name = url;
    try {
      name = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
    } catch {
      name = url;
    }
    setCaptureDraft({
      section_id: defaultSectionId,
      url,
      name,
      tags: suggestAutoTags(url, name).map((tag, index) => ({
        id: -index - 1,
        name: tag,
        source: "auto",
        created_at: new Date().toISOString(),
      })),
    } as Partial<Link>);
  };

  const moveLinkToSection = (sectionId: number, beforeLinkId?: number) => {
    if (!dragLinkId) return;
    const section = sections?.find((item) => item.id === sectionId);
    const dragged = allLinks.find((link) => link.id === dragLinkId);
    if (!section || !dragged) return;
    const ordered = [...section.links]
      .filter((link) => link.id !== dragLinkId)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    const targetIndex = beforeLinkId ? ordered.findIndex((link) => link.id === beforeLinkId) : -1;
    const insertAt = targetIndex >= 0 ? targetIndex : ordered.length;
    ordered.splice(insertAt, 0, dragged);
    reorderLinks.mutate(ordered.map((link, index) => ({ id: link.id, section_id: sectionId, sort_order: index })));
    setDragLinkId(null);
    setDragOverLinkId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  const views = [
    { id: "feed", icon: Rows3, label: t("bookmarks.view_feed") },
    { id: "sections", icon: LayoutGrid, label: t("bookmarks.view_sections") },
    { id: "kanban", icon: Columns3, label: t("bookmarks.view_kanban") },
  ] as const;

  return (
    <div className="space-y-4 text-t1">

      {/* ── Header + Controls ────────────────────────────── */}
      <div className="rounded-xl bg-card border border-line/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="label-xs mb-1">Resource Library</div>
            <h1 className="text-xl font-semibold text-t1">{t("bookmarks.title")}</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-line/60">
              {views.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    view === id ? "bg-accent text-bg" : "text-t2 hover:bg-line/30 hover:text-t1"
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {view === "sections" && (
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-t2 hover:text-t1 hover:border-accent/40 transition-colors"
              >
                <Plus size={13} /> {t("bookmarks.add_section")}
              </button>
            )}
          </div>
        </div>

        {/* Capture + Search */}
        <div className="grid gap-2 lg:grid-cols-[1fr_300px]">
          <div className="flex items-center gap-2 rounded-lg border border-line/60 bg-surface px-3 py-2">
            <Send size={14} className="text-accent shrink-0" />
            <input
              value={captureUrl}
              onChange={(e) => setCaptureUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCapture(); }}
              placeholder={t("bookmarks.capture_placeholder")}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t3"
            />
            <button
              disabled={!defaultSectionId || !captureUrl.trim()}
              onClick={handleCapture}
              className="rounded-lg bg-accent px-3 py-1 text-[13px] font-semibold text-bg disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {t("bookmarks.capture")}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-line/60 bg-surface px-3 py-2">
            <Search size={14} className="text-t3 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("bookmarks.search")}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t3"
            />
          </div>
        </div>
      </div>

      {/* ── Add section form ─────────────────────────────── */}
      {adding && view === "sections" && (
        <div className="flex max-w-sm gap-2">
          <input
            autoFocus
            className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50"
            placeholder={t("bookmarks.section_title")}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSection();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <button
            onClick={handleAddSection}
            disabled={!newTitle.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-bg disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {t("link.save")}
          </button>
        </div>
      )}

      {/* ── Tag filter ───────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTag(null)}
          className={`shrink-0 rounded-lg px-3 py-1 text-[12px] font-medium transition-colors ${
            activeTag === null
              ? "bg-accent text-bg"
              : "bg-surface border border-line/50 text-t2 hover:text-t1"
          }`}
        >
          {t("bookmarks.all_tags")} {allLinks.length}
        </button>
        {tags?.map((tag) => (
          <button
            key={tag.id}
            onClick={() => setActiveTag(tag.name)}
            className={`shrink-0 rounded-lg px-3 py-1 text-[12px] font-medium transition-colors ${
              activeTag === tag.name
                ? "bg-accent text-bg"
                : "bg-surface border border-line/50 text-t2 hover:text-t1"
            }`}
          >
            {tag.name} {tag.count}
          </button>
        ))}
      </div>

      {/* ── Empty state ──────────────────────────────────── */}
      {(!sections || sections.length === 0) && !adding && (
        <div className="py-12 text-center text-[13px] text-t3">
          {t("bookmarks.no_sections")}
        </div>
      )}

      {/* ── Feed view ────────────────────────────────────── */}
      {view === "feed" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredLinks.map((link) => (
            <BookmarkCard key={link.id} link={link} onOpen={setSelectedLink} />
          ))}
        </div>
      )}

      {/* ── Sections view ────────────────────────────────── */}
      {view === "sections" && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {sections?.map((section) => (
            <LinkSection key={section.id} section={section} />
          ))}
        </div>
      )}

      {/* ── Kanban view ──────────────────────────────────── */}
      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {sections?.map((section) => (
            <div
              key={section.id}
              className="w-[280px] shrink-0 rounded-xl bg-card border border-line/60"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                moveLinkToSection(section.id);
              }}
            >
              <div className="border-b border-line/40 px-3 py-2 text-[13px] font-semibold text-t1">
                {section.title}
              </div>
              <div className="min-h-[100px] space-y-1 p-2">
                {[...section.links]
                  .filter((link) => filteredLinks.some((f) => f.id === link.id))
                  .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
                  .map((link) => (
                    <div
                      key={link.id}
                      draggable
                      onDragStart={() => setDragLinkId(link.id)}
                      onDragEnter={() => setDragOverLinkId(link.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.stopPropagation();
                        moveLinkToSection(section.id, link.id);
                      }}
                      className={dragOverLinkId === link.id ? "rounded-lg ring-2 ring-accent/40" : ""}
                    >
                      <LinkItem link={link} onPreview={setSelectedLink} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <BookmarkPreviewDrawer link={selectedLink} onClose={() => setSelectedLink(null)} />
      <LinkEditModal
        open={Boolean(captureDraft)}
        onClose={() => {
          setCaptureDraft(null);
          setCaptureUrl("");
        }}
        initial={captureDraft ?? undefined}
        defaultSectionId={defaultSectionId}
      />
    </div>
  );
}
