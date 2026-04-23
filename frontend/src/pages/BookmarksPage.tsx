import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useSections, useCreateSection } from "../hooks/useSections";
import LinkSection from "../components/links/LinkSection";

export default function BookmarksPage() {
  const { t } = useTranslation();
  const { data: sections, isLoading } = useSections();
  const createSection = useCreateSection();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAddSection = () => {
    if (!newTitle.trim()) return;
    createSection.mutate({ title: newTitle.trim() }, {
      onSuccess: () => { setNewTitle(""); setAdding(false); },
    });
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
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {t("bookmarks.title")}
        </h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <Plus size={15} /> {t("bookmarks.add_section")}
        </button>
      </div>

      {adding && (
        <div className="flex gap-2">
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
        <div className="text-center py-12 text-slate-400 text-sm">
          {t("bookmarks.no_sections")}
        </div>
      )}

      <div className="space-y-3">
        {sections?.map((section) => (
          <LinkSection key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
