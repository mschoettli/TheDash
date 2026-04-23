import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import { useCreateLink, useUpdateLink, useDeleteLink, Link } from "../../hooks/useLinks";
import { useSections, useCreateSection } from "../../hooks/useSections";

interface Props {
  open: boolean;
  onClose: () => void;
  link?: Link;
  defaultSectionId?: number;
}

export default function LinkEditModal({ open, onClose, link, defaultSectionId }: Props) {
  const { t } = useTranslation();
  const isEdit = Boolean(link);
  const { data: sections } = useSections();

  const [name, setName] = useState(link?.name ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [iconUrl, setIconUrl] = useState(link?.icon_url ?? "");
  const [sectionId, setSectionId] = useState<number | "new">(
    link?.section_id ?? defaultSectionId ?? "new"
  );
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(link?.name ?? "");
      setUrl(link?.url ?? "");
      setIconUrl(link?.icon_url ?? "");
      setSectionId(link?.section_id ?? defaultSectionId ?? (sections?.[0]?.id ?? "new"));
      setNewSectionTitle("");
      setConfirmDelete(false);
    }
  }, [open, link, defaultSectionId, sections]);

  const createLink = useCreateLink();
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const createSection = useCreateSection();

  const handleSave = async () => {
    let targetSectionId = sectionId as number;

    if (sectionId === "new") {
      if (!newSectionTitle.trim()) return;
      const newSection = await createSection.mutateAsync({ title: newSectionTitle.trim() });
      targetSectionId = newSection.id;
    }

    const data = {
      section_id: targetSectionId,
      name,
      url,
      icon_url: iconUrl || null,
      sort_order: link?.sort_order ?? 0,
    };

    if (isEdit && link) {
      updateLink.mutate({ id: link.id, ...data }, { onSuccess: onClose });
    } else {
      createLink.mutate(data, { onSuccess: onClose });
    }
  };

  const handleDelete = () => {
    if (!link) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteLink.mutate(link.id, { onSuccess: onClose });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t("link.edit_title") : t("link.add_title")}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("link.name")} *
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mein Link"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("link.url")} *
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://server:8080"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("link.icon")}
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("link.section")}
          </label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value === "new" ? "new" : Number(e.target.value))}
          >
            {sections?.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
            <option value="new">{t("link.new_section")}</option>
          </select>
        </div>
        {sectionId === "new" && (
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t("link.section_name")} *
            </label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Meine Sektion"
            />
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!name || !url || (sectionId === "new" && !newSectionTitle.trim())}
            className="flex-1 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {t("link.save")}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                confirmDelete
                  ? "bg-rose-500 hover:bg-rose-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500"
              }`}
            >
              {confirmDelete ? t("common.yes") : t("link.delete")}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
