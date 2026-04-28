import { Archive, ExternalLink, GripVertical, Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useDeleteLink, useUpdateLink } from "../../hooks/useLinks";
import FaviconImg from "../ui/FaviconImg";
import ConfirmDialog from "../ui/ConfirmDialog";
import LinkEditModal from "./LinkEditModal";

interface BookmarkCardProps {
  link: Link;
  dragHandle?: React.ReactNode;
  isDragging?: boolean;
  variant?: "grid" | "list";
}

function getHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

export default function BookmarkCard({ link, dragHandle, isDragging, variant = "grid" }: BookmarkCardProps) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateLink.mutate({ id: link.id, is_favorite: !link.is_favorite });
  };
  const toggleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateLink.mutate({ id: link.id, is_archived: !link.is_archived });
  };

  // ── List variant ──────────────────────────────────────────────────────────
  if (variant === "list") {
    return (
      <>
        <div
          className={`group flex items-center gap-3 rounded-xl border border-line/50 bg-card px-3 py-2.5 transition-all hover:border-accent/30 hover:shadow-sm ${
            isDragging ? "opacity-40 shadow-xl" : ""
          } ${link.is_archived ? "opacity-60" : ""}`}
        >
          {dragHandle && <div className="shrink-0 cursor-grab text-t3 hover:text-accent">{dragHandle}</div>}

          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line/50 bg-surface">
            <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold text-t1">{link.name}</span>
              {link.is_favorite && <Star size={10} className="shrink-0 text-amber-400" />}
              {link.is_archived && <Archive size={10} className="shrink-0 text-t3" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-t3 truncate">{getHost(link.url)}</span>
              {link.tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent/80">{tag.name}</span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="rounded-lg p-1.5 text-t3 transition-colors hover:bg-line/30 hover:text-accent" title={t("link.open")}>
              <ExternalLink size={13} />
            </a>
            <button onClick={() => setEditOpen(true)}
              className="rounded-lg p-1.5 text-t3 transition-colors hover:bg-line/30 hover:text-accent" title={t("link.edit")}>
              <Pencil size={13} />
            </button>
            <button onClick={toggleFavorite}
              className={`rounded-lg p-1.5 transition-colors hover:bg-line/30 ${link.is_favorite ? "text-amber-400 hover:text-amber-500" : "text-t3 hover:text-amber-400"}`}
              title={t("link.favorite")}>
              <Star size={13} />
            </button>
            <button onClick={toggleArchive}
              className={`rounded-lg p-1.5 transition-colors hover:bg-line/30 ${link.is_archived ? "text-accent" : "text-t3 hover:text-accent"}`}
              title={t("link.archive")}>
              <Archive size={13} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
              className="rounded-lg p-1.5 text-t3 transition-colors hover:bg-rose-500/10 hover:text-rose-500" title={t("link.delete")}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <LinkEditModal open={editOpen} onClose={() => setEditOpen(false)} link={link} />
        <ConfirmDialog
          open={deleteOpen}
          title={t("link.delete_title")}
          description={t("link.delete_description", { name: link.name })}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteLink.mutate(link.id, { onSuccess: () => setDeleteOpen(false) })}
          isPending={deleteLink.isPending}
        />
      </>
    );
  }

  // ── Grid variant — compact ────────────────────────────────────────────────
  return (
    <>
      <article
        className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border border-line/50 bg-card px-3 py-2.5 transition-all hover:border-accent/30 hover:shadow-md hover:shadow-accent/5 ${
          isDragging ? "opacity-40 shadow-xl" : ""
        } ${link.is_archived ? "opacity-60" : ""}`}
      >
        {/* Drag handle */}
        {dragHandle && (
          <div className="shrink-0 cursor-grab text-t3 opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100">
            {dragHandle}
          </div>
        )}

        {/* Favicon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/50 bg-surface shadow-inner shadow-black/5">
          <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={22} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-t1 leading-5">{link.name}</span>
            {link.is_favorite && <Star size={10} className="shrink-0 text-amber-400" />}
            {link.is_archived && <Archive size={10} className="shrink-0 text-t3" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[11px] text-t3 truncate max-w-[120px]">{getHost(link.url)}</span>
            {link.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent/80 leading-none">
                {tag.name}
              </span>
            ))}
            {link.tags.length > 3 && (
              <span className="text-[9px] text-t3">+{link.tags.length - 3}</span>
            )}
          </div>
          {link.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-t3">{link.description}</p>
          )}
        </div>

        {/* Hover actions */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <a
            href={link.url} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-1.5 text-t3 transition-colors hover:bg-accent hover:text-bg"
            title={t("link.open")}
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
            className="rounded-lg p-1.5 text-t3 transition-colors hover:bg-line/30 hover:text-t1"
            title={t("link.edit")}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={toggleFavorite}
            className={`rounded-lg p-1.5 transition-colors hover:bg-line/30 ${link.is_favorite ? "text-amber-400" : "text-t3 hover:text-amber-400"}`}
            title={t("link.favorite")}
          >
            <Star size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
            className="rounded-lg p-1.5 text-t3 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
            title={t("link.delete")}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </article>

      <LinkEditModal open={editOpen} onClose={() => setEditOpen(false)} link={link} />
      <ConfirmDialog
        open={deleteOpen}
        title={t("link.delete_title")}
        description={t("link.delete_description", { name: link.name })}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteLink.mutate(link.id, { onSuccess: () => setDeleteOpen(false) })}
        isPending={deleteLink.isPending}
      />
    </>
  );
}
