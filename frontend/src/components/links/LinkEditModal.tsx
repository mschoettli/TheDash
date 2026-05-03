import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ExternalLink } from "lucide-react";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import { fetchTagSuggestions, useCreateLink, useUpdateLink, useDeleteLink, Link, suggestAutoTags } from "../../hooks/useLinks";
import { useSections, useCreateSection, SectionsData } from "../../hooks/useSections";
import BookmarkPreviewImage from "./BookmarkPreviewImage";

const input = "w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 placeholder:text-t3";

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

function sectionValueLabel(
  value: number | null | "new",
  sections: SectionsData["sections"] | undefined,
  t: ReturnType<typeof useTranslation>["t"]
) {
  if (value === null) return t("link.no_section", "Keine Sektion");
  if (value === "new") return t("link.new_section");
  return sections?.find((section) => section.id === value)?.title ?? t("link.no_section", "Keine Sektion");
}

export default function LinkEditModal({ open, onClose, link, initial, defaultSectionId }: Props) {
  const { t } = useTranslation();
  const isEdit = Boolean(link);
  const { data: sectionsData } = useSections();
  const sections = (sectionsData as SectionsData | undefined)?.sections;

  const [name, setName] = useState(link?.name ?? initial?.name ?? "");
  const [url, setUrl] = useState(link?.url ?? initial?.url ?? "");
  const [description, setDescription] = useState(link?.description ?? initial?.description ?? "");
  const [note, setNote] = useState(link?.note ?? initial?.note ?? "");
  const [iconUrl, setIconUrl] = useState(link?.icon_url ?? initial?.icon_url ?? "");
  const [imageUrl, setImageUrl] = useState(link?.image_url ?? initial?.image_url ?? "");
  const [tagInput, setTagInput] = useState(link?.tags.map((tag) => tag.name).join(", ") ?? "");
  const [autoTagNames, setAutoTagNames] = useState<Set<string>>(() => new Set(link?.tags.filter((tag) => tag.source === "auto").map((tag) => tag.name) ?? []));
  const [aiTagNames, setAiTagNames] = useState<Set<string>>(() => new Set(link?.tags.filter((tag) => tag.source === "ai").map((tag) => tag.name) ?? []));
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [isFavorite, setIsFavorite] = useState(Boolean(link?.is_favorite ?? initial?.is_favorite));
  const [isArchived, setIsArchived] = useState(Boolean(link?.is_archived ?? initial?.is_archived));
  const [isRead, setIsRead] = useState(Boolean(link?.is_read ?? initial?.is_read));
  const [sectionId, setSectionId] = useState<number | null | "new">(
    link !== undefined ? (link.section_id ?? null) : (initial?.section_id ?? defaultSectionId ?? null)
  );
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(link?.name ?? initial?.name ?? "");
      setUrl(link?.url ?? initial?.url ?? "");
      setDescription(link?.description ?? initial?.description ?? "");
      setNote(link?.note ?? initial?.note ?? "");
      setIconUrl(link?.icon_url ?? initial?.icon_url ?? "");
      setImageUrl(link?.image_url ?? initial?.image_url ?? "");
      setTagInput(link?.tags.map((tag) => tag.name).join(", ") ?? initial?.tags?.map((tag) => tag.name).join(", ") ?? "");
      setAutoTagNames(new Set((link?.tags ?? initial?.tags ?? []).filter((tag) => tag.source === "auto").map((tag) => tag.name)));
      setAiTagNames(new Set((link?.tags ?? initial?.tags ?? []).filter((tag) => tag.source === "ai").map((tag) => tag.name)));
      setSuggestingTags(false);
      setIsFavorite(Boolean(link?.is_favorite ?? initial?.is_favorite));
      setIsArchived(Boolean(link?.is_archived ?? initial?.is_archived));
      setIsRead(Boolean(link?.is_read ?? initial?.is_read));
      setSectionId(
        link !== undefined
          ? (link.section_id ?? null)
          : (initial?.section_id ?? defaultSectionId ?? null)
      );
      setNewSectionTitle("");
      setSectionMenuOpen(false);
      setDeleteOpen(false);
    }
  }, [open, link, initial, defaultSectionId, sections]);

  const createLink = useCreateLink();
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const createSection = useCreateSection();

  const handleSave = async () => {
    let targetSectionId: number | null = null;
    if (sectionId === "new") {
      if (!newSectionTitle.trim()) return;
      const newSection = await createSection.mutateAsync({ title: newSectionTitle.trim() });
      targetSectionId = newSection.id;
    } else {
      targetSectionId = sectionId;
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
      note: note || null,
      icon_url: iconUrl || null,
      image_url: imageUrl || null,
      tags,
      is_favorite: isFavorite,
      is_archived: isArchived,
      is_read: isRead,
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
    deleteLink.mutate(link.id, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("link.edit_title") : t("link.add_title")}>
      <div className="space-y-4">
        {link && (
          <div className="overflow-hidden rounded-xl border border-line/60 bg-card">
            <BookmarkPreviewImage link={link} variant="drawer" showRefresh />
          </div>
        )}

        <Field label={`${t("link.name")} *`}>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Mein Link" />
        </Field>

        <Field label={`${t("link.url")} *`}>
          <div className="flex gap-2">
            <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://server:8080" />
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12px] font-medium text-t2 hover:border-accent/40 hover:text-accent"
              >
                <ExternalLink size={13} />
                {t("link.open")}
              </a>
            )}
          </div>
        </Field>

        <Field label={t("link.icon")}>
          <input className={input} value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://..." />
        </Field>

        <Field label={t("link.description")}>
          <textarea className={`${input} resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("link.description_placeholder")} />
        </Field>

        <Field label={t("link.note")}>
          <textarea className={`${input} resize-none`} rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private notes for this bookmark..." />
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setSectionMenuOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-lg border border-line/60 bg-card px-3 py-2 text-left text-[13px] text-t1 outline-none transition-colors hover:border-accent/40 focus:border-accent/50"
            >
              <span className="truncate">{sectionValueLabel(sectionId, sections, t)}</span>
              <ChevronDown size={15} className={`shrink-0 text-t3 transition-transform ${sectionMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {sectionMenuOpen && (
              <div className="absolute z-[80] mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line/70 bg-surface p-1 shadow-xl shadow-black/20">
                {[
                  { value: null, label: t("link.no_section", "Keine Sektion") },
                  ...(sections ?? []).map((section) => ({ value: section.id, label: section.title })),
                  { value: "new" as const, label: t("link.new_section") },
                ].map((option) => {
                  const selected = option.value === sectionId;
                  return (
                    <button
                      key={option.value === null ? "none" : String(option.value)}
                      type="button"
                      onClick={() => {
                        setSectionId(option.value);
                        setSectionMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                        selected
                          ? "bg-accent/12 text-accent"
                          : "text-t2 hover:bg-accent/8 hover:text-t1"
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {selected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Field>

        {sectionId === "new" && (
          <Field label={`${t("link.section_name")} *`}>
            <input className={input} value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} placeholder="Meine Sektion" />
          </Field>
        )}

        <div className="grid grid-cols-3 gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t2">
            <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} />
            {t("link.favorite")}
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t2">
            <input type="checkbox" checked={isArchived} onChange={(e) => setIsArchived(e.target.checked)} />
            {t("link.archive")}
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t2">
            <input type="checkbox" checked={isRead} onChange={(e) => setIsRead(e.target.checked)} />
            {t("link.read")}
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
              onClick={() => setDeleteOpen(true)}
              className="rounded-lg border border-line px-4 py-2 text-[13px] font-medium text-t2 transition-colors hover:border-rose-400/40 hover:text-rose-400"
            >
              {t("link.delete")}
            </button>
          )}
        </div>
      </div>
      {link && (
        <ConfirmDialog
          open={deleteOpen}
          title={t("link.delete_title")}
          description={t("link.delete_description", { name: link.name })}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          isPending={deleteLink.isPending}
        />
      )}
    </Modal>
  );
}
