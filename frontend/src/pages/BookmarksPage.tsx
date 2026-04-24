import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Columns3, LayoutGrid, Plus, Search, Send, Rows3 } from "lucide-react";
import { useSections, useCreateSection } from "../hooks/useSections";
import { Link, useCaptureLink, useUpdateLink } from "../hooks/useLinks";
import { useTags } from "../hooks/useTags";
import LinkSection from "../components/links/LinkSection";
import LinkItem from "../components/links/LinkItem";
import BookmarkCard from "../components/links/BookmarkCard";
import BookmarkPreviewDrawer from "../components/links/BookmarkPreviewDrawer";

function matchesSearch(link: Link, query: string): boolean {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [
    link.name,
    link.url,
    link.description ?? "",
    link.note ?? "",
    ...link.tags.map((tag) => tag.name),
  ]
    .join(" ")
    .toLowerCase()
    .includes(value);
}

export default function BookmarksPage() {
  const { t } = useTranslation();
  const { data: sections, isLoading } = useSections();
  const { data: tags } = useTags();
  const createSection = useCreateSection();
  const captureLink = useCaptureLink();
  const updateLink = useUpdateLink();

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"feed" | "sections" | "kanban">("feed");
  const [dragLinkId, setDragLinkId] = useState<number | null>(null);
  const [captureUrl, setCaptureUrl] = useState("");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);

  const allLinks = useMemo(() => sections?.flatMap((section) => section.links) ?? [], [sections]);
  const filteredLinks = useMemo(
    () =>
      allLinks.filter((link) => {
        const tagMatch = activeTag ? link.tags.some((tag) => tag.name === activeTag) : true;
        return tagMatch && matchesSearch(link, query);
      }),
    [activeTag, allLinks, query]
  );

  const defaultSectionId = sections?.[0]?.id;

  const handleAddSection = () => {
    if (!newTitle.trim()) return;
    createSection.mutate(
      { title: newTitle.trim() },
      {
        onSuccess: () => {
          setNewTitle("");
          setAdding(false);
        },
      }
    );
  };

  const handleCapture = () => {
    if (!defaultSectionId || !captureUrl.trim()) return;
    captureLink.mutate(
      { section_id: defaultSectionId, url: captureUrl.trim() },
      { onSuccess: () => setCaptureUrl("") }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-100">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/85 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
              Resource Library
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">{t("bookmarks.title")}</h1>
          </div>

          <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            {[
              { id: "feed", icon: Rows3, label: t("bookmarks.view_feed") },
              { id: "sections", icon: LayoutGrid, label: t("bookmarks.view_sections") },
              { id: "kanban", icon: Columns3, label: t("bookmarks.view_kanban") },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id as typeof view)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                  view === id
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-sm font-medium text-cyan-100 hover:bg-cyan-400/20"
          >
            <Plus size={15} /> {t("bookmarks.add_section")}
          </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
          <Send size={16} className="text-cyan-300" />
          <input
            value={captureUrl}
            onChange={(event) => setCaptureUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCapture();
            }}
            placeholder={t("bookmarks.capture_placeholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
          <button
            disabled={!defaultSectionId || !captureUrl.trim() || captureLink.isPending}
            onClick={handleCapture}
            className="rounded-xl bg-cyan-300 px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            {t("bookmarks.capture")}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("bookmarks.search")}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>
      </div>

      {adding && (
        <div className="flex max-w-xl gap-2">
          <input
            autoFocus
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {t("link.save")}
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTag(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs ${
            activeTag === null
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {t("bookmarks.all_tags")} {allLinks.length}
        </button>
        {tags?.map((tag) => (
          <button
            key={tag.id}
            onClick={() => setActiveTag(tag.name)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              activeTag === tag.name
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {tag.name} {tag.count}
          </button>
        ))}
      </div>

      {(!sections || sections.length === 0) && !adding && (
        <div className="py-12 text-center text-sm text-slate-400">
          {t("bookmarks.no_sections")}
        </div>
      )}

      {view === "feed" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredLinks.map((link) => (
            <BookmarkCard key={link.id} link={link} onOpen={setSelectedLink} />
          ))}
        </div>
      )}

      {view === "sections" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {sections?.map((section) => (
            <LinkSection key={section.id} section={section} />
          ))}
        </div>
      )}

      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {sections?.map((section) => (
            <div
              key={section.id}
              className="w-[320px] shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragLinkId) return;
                updateLink.mutate({ id: dragLinkId, section_id: section.id });
                setDragLinkId(null);
              }}
            >
              <div className="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {section.title}
              </div>
              <div className="min-h-[120px] space-y-2 p-2">
                {section.links
                  .filter((link) => filteredLinks.some((filtered) => filtered.id === link.id))
                  .map((link) => (
                    <div key={link.id} draggable onDragStart={() => setDragLinkId(link.id)}>
                      <LinkItem link={link} onPreview={setSelectedLink} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <BookmarkPreviewDrawer link={selectedLink} onClose={() => setSelectedLink(null)} />
    </div>
  );
}
