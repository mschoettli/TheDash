import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Section, useDeleteSection } from "../../hooks/useSections";
import LinkItem from "./LinkItem";
import LinkEditModal from "./LinkEditModal";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useTranslation } from "react-i18next";

interface Props {
  section: Section;
}

export default function LinkSection({ section }: Props) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteSection = useDeleteSection();

  return (
    <div className="rounded-xl bg-card border border-line/60 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line/40">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-t3 hover:text-t1 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <span className="flex-1 text-[13px] font-semibold text-t1">{section.title}</span>
        <span className="text-[11px] text-t3">{section.links.length}</span>
        <button onClick={() => setAddOpen(true)} className="p-1 rounded text-t3 hover:text-accent transition-colors" title="Link hinzufügen">
          <Plus size={13} />
        </button>
        <button onClick={() => setDeleteOpen(true)} className="p-1 rounded text-t3 hover:text-rose-400 transition-colors" title={t("bookmarks.delete_section")}>
          <Trash2 size={13} />
        </button>
      </div>

      {!collapsed && (
        <div className="divide-y divide-line/30 px-1 py-1">
          {section.links.map((link) => (
            <LinkItem key={link.id} link={link} />
          ))}
          {section.links.length === 0 && (
            <div className="px-3 py-3 text-center text-[12px] text-t3">—</div>
          )}
        </div>
      )}

      <LinkEditModal open={addOpen} onClose={() => setAddOpen(false)} defaultSectionId={section.id} />
      <ConfirmDialog
        open={deleteOpen}
        title={t("bookmarks.delete_section")}
        description={t("bookmarks.delete_section_description", { title: section.title })}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteSection.mutate(section.id, { onSuccess: () => setDeleteOpen(false) })}
        isPending={deleteSection.isPending}
      />
    </div>
  );
}
