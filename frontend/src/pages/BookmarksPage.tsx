import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, LayoutGrid, Columns3 } from "lucide-react";
import { useSections, useCreateSection } from "../hooks/useSections";
import { useUpdateLink } from "../hooks/useLinks";
import LinkSection from "../components/links/LinkSection";
import LinkItem from "../components/links/LinkItem";

export default function BookmarksPage() {
  const { t } = useTranslation();
  const { data: sections, isLoading } = useSections();
  const createSection = useCreateSection();
  const updateLink = useUpdateLink();

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"sections" | "kanban">("sections");
  const [dragLinkId, setDragLinkId] = useState<number | null>(null);

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {t("bookmarks.title")}
        </h1>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setView("sections")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                view === "sections"
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <LayoutGrid size={14} /> {t("bookmarks.view_sections")}
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                view === "kanban"
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <Columns3 size={14} /> {t("bookmarks.view_kanban")}
            </button>
          </div>

          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Plus size={15} /> {t("bookmarks.add_section")}
          </button>
        </div>
      </div>

      {adding && (
        <div className="flex gap-2 max-w-xl">
          <input
            autoFocus
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {t("link.save")}
          </button>
        </div>
      )}

      {(!sections || sections.length === 0) && !adding && (
        <div className="text-center py-12 text-slate-400 text-sm">{t("bookmarks.no_sections")}</div>
      )}

      {view === "sections" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sections?.map((section) => (
            <LinkSection key={section.id} section={section} />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {sections?.map((section) => (
            <div
              key={section.id}
              className="w-[320px] shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragLinkId) return;
                updateLink.mutate({ id: dragLinkId, section_id: section.id });
                setDragLinkId(null);
              }}
            >
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {section.title}
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {section.links.map((link) => (
                  <div key={link.id} draggable onDragStart={() => setDragLinkId(link.id)}>
                    <LinkItem link={link} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}