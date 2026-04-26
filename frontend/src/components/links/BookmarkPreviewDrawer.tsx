import { Archive, ExternalLink, Pencil, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useDeleteLink, useUpdateLink } from "../../hooks/useLinks";
import FaviconImg from "../ui/FaviconImg";
import RemoteImage from "../ui/RemoteImage";
import ConfirmDialog from "../ui/ConfirmDialog";
import LinkEditModal from "./LinkEditModal";

interface BookmarkPreviewDrawerProps {
  link: Link | null;
  onClose: () => void;
}

function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function BookmarkPreviewDrawer({ link, onClose }: BookmarkPreviewDrawerProps) {
  const { t } = useTranslation();
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const [note, setNote] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setNote(link?.note ?? "");
    setTagInput(link?.tags.map((t) => t.name).join(", ") ?? "");
  }, [link]);

  const parsedTags = useMemo(
    () => tagInput.split(",").map((t) => t.trim()).filter(Boolean),
    [tagInput]
  );

  if (!link) return null;

  const saveDetails = () => {
    updateLink.mutate({ id: link.id, note, tags: parsedTags as any });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <button className="flex-1 cursor-default" onClick={onClose} aria-label="Close preview" />
      <aside className="h-full w-full max-w-lg overflow-y-auto border-l border-line/60 bg-surface shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line/40 bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-t1 truncate">{link.name}</div>
            <div className="text-[11px] text-t3 truncate">{getHost(link.url)}</div>
          </div>
          <button onClick={onClose} className="rounded p-1.5 text-t3 hover:bg-line/30 hover:text-t1 transition-colors">
            <X size={16} />
          </button>
        </div>

        <RemoteImage
          src={link.image_url}
          className="h-52 w-full object-cover bg-card"
          fallback={(
            <div className="h-36 flex items-center justify-center bg-card border-b border-line/40">
              <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={52} />
            </div>
          )}
        />

        <div className="space-y-5 p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-t1">{link.name}</h2>
            {link.description && (
              <p className="mt-1.5 text-[13px] leading-6 text-t2">{link.description}</p>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-bg hover:opacity-90 transition-opacity"
            >
              <ExternalLink size={13} /> {t("link.open")}
            </a>
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] text-t2 hover:border-accent/30 hover:text-accent transition-colors"
            >
              <Pencil size={13} /> {t("link.edit")}
            </button>
            <button
              onClick={() => updateLink.mutate({ id: link.id, is_favorite: !link.is_favorite })}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] transition-colors ${link.is_favorite ? "border-amber-400/40 bg-amber-400/10 text-amber-400" : "border-line text-t2 hover:border-amber-400/30"}`}
            >
              <Star size={13} /> {t("link.favorite_short")}
            </button>
            <button
              onClick={() => updateLink.mutate({ id: link.id, is_archived: !link.is_archived })}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] transition-colors ${link.is_archived ? "border-accent/30 bg-accent/10 text-accent" : "border-line text-t2 hover:border-accent/30"}`}
            >
              <Archive size={13} /> {t("link.archive_short")}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-400/20 px-3 py-2 text-[13px] text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={13} /> {t("link.delete")}
            </button>
          </div>

          <div>
            <div className="label-xs mb-1.5">{t("link.tags")}</div>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onBlur={saveDetails}
              className="w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50"
              placeholder="homelab, docs, ideas"
            />
          </div>

          <div>
            <div className="label-xs mb-1.5">{t("link.note")}</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveDetails}
              rows={6}
              className="w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 resize-none"
              placeholder="Private notes for this bookmark..."
            />
          </div>
        </div>
      </aside>
      <LinkEditModal open={editOpen} onClose={() => setEditOpen(false)} link={link} />
      <ConfirmDialog
        open={deleteOpen}
        title={t("link.delete_title")}
        description={t("link.delete_description", { name: link.name })}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteLink.mutate(link.id, { onSuccess: onClose })}
        isPending={deleteLink.isPending}
      />
    </div>
  );
}
