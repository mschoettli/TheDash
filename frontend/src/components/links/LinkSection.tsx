import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { Section } from "../../hooks/useSections";
import { useDeleteSection } from "../../hooks/useSections";
import LinkItem from "./LinkItem";
import LinkEditModal from "./LinkEditModal";

interface Props {
  section: Section;
}

export default function LinkSection({ section }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const deleteSection = useDeleteSection();

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {section.title}
        </span>
        <span className="text-xs text-slate-400">{section.links.length}</span>
        <button
          onClick={() => setAddOpen(true)}
          className="p-1 rounded text-slate-400 hover:text-indigo-500 transition-colors"
          title="Link hinzufügen"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => deleteSection.mutate(section.id)}
          className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
          title="Sektion löschen"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800 px-1 py-1">
          {section.links.map((link) => (
            <LinkItem key={link.id} link={link} />
          ))}
          {section.links.length === 0 && (
            <div className="px-3 py-3 text-xs text-slate-400 text-center">—</div>
          )}
        </div>
      )}

      <LinkEditModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultSectionId={section.id}
      />
    </div>
  );
}
