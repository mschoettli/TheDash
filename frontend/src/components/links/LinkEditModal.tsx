import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import { fetchTagSuggestions, useCreateLink, useUpdateLink, useDeleteLink, Link, suggestAutoTags } from "../../hooks/useLinks";
import { useSections, useCreateSection } from "../../hooks/useSections";

const input = "w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 placeholder:text-t3";
const selectCls = `${input} appearance-none`;

interface Props {
  open: boolean;
  onClose: () => void;
  link?: Link;
  initial?: Partial<Link>;
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

export default function LinkEditModal({ open, onClose, link, initial, defaultSectionId }: Props) {
  const { t } = useTranslation();
  const isEdit = Boolean(link);
  const { data: sections } = useSections();

  const [name, setName] = useState(link?.name ?? initial?.name ?? "");
  const [url, setUrl] = useState(link?.url ?? initial?.url ?? "");
  const [description, setDescription] = useState(link?.description ?? initial?.description ?? "");
  const [iconUrl, setIconUrl] = useState(link?.icon_url ?? initial?.icon_url ?? "");
  const [imageUrl, setImageUrl] = useState(link?.image_url ?? initial?.image_url ?? "");
  const [tagInput, setTagInput] = useState(link?.tags.map((tag) => tag.name).join(", ") ?? "");
  const [autoTagNames, setAutoTagNames] = useState<Set<string>>(() => new Set(link?.tags.filter((tag) => tag.source === "auto").map((tag) => tag.name) ?? []));
  const [aiTagNames, setAiTagNames] = useState<Set<string>>(() => new Set(link?.tags.filter((tag) => tag.source === "ai").map((tag) => tag.name) ?? []));
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [isFavorite, setIsFavorite] = useState(Boolean(link?.is_favorite ?? initial?.is_favorite));
  const [isArchived, setIsArchived] = useState(Boolean(link?.is_archived ?? initial?.is_archived));
  const [sectionId, setSectionId] = useState<number | "new">(link?.section_id ?? initial?.section_id ?? defaultSectionId ?? "new");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(link?.name ?? initial?.name ?? "");
      setUrl(link?.url ?? initial?.url ?? "");
      setDescription(link?.description ?? initial?.description ?? "");
      setIconUrl(link?.icon_url ?? initial?.icon_url ?? "");
      setImageUrl(link?.image_url ?? initial?.image_url ?? "");
      setTagInput(link?.tags.map((tag) => tag.name).join(", ") ?? initial?.tags?.map((tag) => tag.name).join(", ") ?? "");
      setAutoTagNames(new Set((link?.tags ?? initial?.tags ?? []).filter((tag) => tag.source === "auto").map((tag) => tag.name)));
      setAiTagNames(new Set((link?.tags ?? initial?.tags ?? []).filter((tag) => tag.source === "ai").map((tag) => tag.name)));
      setSuggestingTags(false);
      setIsFavorite(Boolean(link?.is_favorite ?? initial?.is_favorite));
      setIsArchived(Boolean(link?.is_archived ?? initial?.is_archived));
      setSectionId(link?.section_id ?? initial?.section_id ?? defaultSectionId ?? (sections?.[0]?.id ?? "new"));
      setNewSectionTitle("");
      setConfirmDelete(false);
    }
  }, [open, link, initial, defaultSectionId, sections]);

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
    const tags = tagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((name) => ({ name, source: aiTagNames.has(name) ? "ai" as const : autoTagNames.has(name) ? "auto" as const : "manual" as const }));
    const data = {
      section_id: targetSectionId,
      name,
      url,
      description: description || null,
      icon_url: iconUrl || null,
      image_url: imageUrl || null,
      tags,
      is_favorite: isFavorite,
      is_archived: isArchived,
      sort_order: link?.sort_order ?? 0,
    };
    if (isEdit && link) updateLink.mutate({ id: link.id, ...data }, { onSuccess: onClose });
    else createLink.mutate(data, { onSuccess: onClose });
  };

  const applyAutoTags = () => {
    const current = tagInput.split(",").map((tag) => tag.trim()).filter(Boolean);
    const suggested = suggestAutoTags(url, name, description);
    const merged = Array.from(new Set([...current, ...suggested]));
    setAutoTagNames((values) => new Set([...values, ...suggested]));
    setTagInput(merged.join(", "));
  };

  const applySuggestedTags = async () => {
    setSuggestingTags(true);
    try {
      const suggestions = await fetchTagSuggestions({ url, title: name, description });
      const current = tagInput.split(",").map((tag) => tag.trim()).filter(Boolean);
      const suggestedNames = suggestions.map((tag) => tag.name);
      const merged = Array.from(new Set([...current, ...suggestedNames]));
      setAutoTagNames((values) => new Set([...values, ...suggestions.filter((tag) => tag.source === "auto").map((tag) => tag.name)]));
      setAiTagNames((values) => new Set([...values, ...suggestions.filter((tag) => tag.source === "ai").map((tag) => tag.name)]));
      setTagInput(merged.join(", "));
    } finally {
      setSuggestingTags(false);
    }
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

        <Field label={t("link.description")}>
          <textarea className={`${input} resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("link.description_placeholder")} />
        </Field>

        <Field label={t("link.preview_image")}>
          <input className={input} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </Field>

        <Field label={t("link.tags")}>
          <div className="flex gap-2">
            <input className={input} value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="docs, homelab, media" />
            <button type="button" onClick={applyAutoTags} className="shrink-0 rounded-lg border border-line px-3 py-2 text-[12px] font-medium text-t2 hover:border-accent/40 hover:text-accent">
              {t("link.auto_tags")}
            </button>
            <button type="button" onClick={applySuggestedTags} disabled={suggestingTags} className="shrink-0 rounded-lg border border-line px-3 py-2 text-[12px] font-medium text-t2 hover:border-accent/40 hover:text-accent disabled:opacity-40">
              {suggestingTags ? t("link.suggesting_tags") : t("link.ai_tags")}
            </button>
          </div>
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

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t2">
            <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} />
            {t("link.favorite")}
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t2">
            <input type="checkbox" checked={isArchived} onChange={(e) => setIsArchived(e.target.checked)} />
            {t("link.archive")}
          </label>
        </div>

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
