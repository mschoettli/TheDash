import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import { useCreateLink, useUpdateLink, useDeleteLink, Link } from "../../hooks/useLinks";
import { useSections, useCreateSection } from "../../hooks/useSections";

const input = "w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 placeholder:text-t3";
const selectCls = `${input} appearance-none`;

interface Props {
  open: boolean;
  onClose: () => void;
  link?: Link;
  defaultSectionId?: number;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-xs mb-1.5">{label}</div>
      {children}
    </div>
  );
}

export default function LinkEditModal({ open, onClose, link, defaultSectionId }: Props) {
  const { t } = useTranslation();
  const isEdit = Boolean(link);
  const { data: sections } = useSections();

  const [name, setName] = useState(link?.name ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [iconUrl, setIconUrl] = useState(link?.icon_url ?? "");
  const [sectionId, setSectionId] = useState<number | "new">(link?.section_id ?? defaultSectionId ?? "new");
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
    const data = { section_id: targetSectionId, name, url, icon_url: iconUrl || null, sort_order: link?.sort_order ?? 0 };
    if (isEdit && link) updateLink.mutate({ id: link.id, ...data }, { onSuccess: onClose });
    else createLink.mutate(data, { onSuccess: onClose });
  };

  const handleDelete = () => {
    if (!link) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteLink.mutate(link.id, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("link.edit_title") : t("link.add_title")}>
      <div className="space-y-4">
        <Field label={`${t("link.name")} *`}>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Mein Link" />
        </Field>

        <Field label={`${t("link.url")} *`}>
          <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://server:8080" />
        </Field>

        <Field label={t("link.icon")}>
          <input className={input} value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://..." />
        </Field>

        <Field label={t("link.section")}>
          <select className={selectCls} value={sectionId} onChange={(e) => setSectionId(e.target.value === "new" ? "new" : Number(e.target.value))}>
            {sections?.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            <option value="new">{t("link.new_section")}</option>
          </select>
        </Field>

        {sectionId === "new" && (
          <Field label={`${t("link.section_name")} *`}>
            <input className={input} value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} placeholder="Meine Sektion" />
          </Field>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!name || !url || (sectionId === "new" && !newSectionTitle.trim())}
            className="flex-1 rounded-lg bg-accent py-2 text-[13px] font-semibold text-bg disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {t("link.save")}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
                confirmDelete ? "bg-rose-500 text-white" : "border border-line text-t2 hover:border-rose-400/40 hover:text-rose-400"
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
