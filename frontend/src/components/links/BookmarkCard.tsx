import { Archive, ExternalLink, GripVertical, Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useDeleteLink, useUpdateLink } from "../../hooks/useLinks";
import FaviconImg from "../ui/FaviconImg";
import RemoteImage from "../ui/RemoteImage";
import ConfirmDialog from "../ui/ConfirmDialog";
import LinkEditModal from "./LinkEditModal";

interface BookmarkCardProps {
  link: Link;
  /** Shows drag handle (edit mode) */
  dragHandle?: React.ReactNode;
  /** Whether the card is being dragged */
  isDragging?: boolean;
  /** List variant: horizontal compact layout */
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

          {/* Favicon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line/50 bg-surface">
            <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={20} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold text-t1">{link.name}</span>
              {link.is_favorite && <Star size={11} className="shrink-0 text-amber-400" />}
              {link.is_archived && <Archive size={11} className="shrink-0 text-t3" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-t3 truncate">{getHost(link.url)}</span>
              {link.tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent/80">{tag.name}</span>
              ))}
            </div>
          </div>

          {/* Actions — always visible on hover */}
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

  // ── Grid variant ──────────────────────────────────────────────────────────
  return (
    <>
      <article
        className={`group relative flex flex-col overflow-hidden rounded-xl border border-line/50 bg-card transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/8 ${
          isDragging ? "opacity-40 shadow-2xl" : ""
        } ${link.is_archived ? "opacity-70" : ""}`}
      >
        {/* Drag handle — top-left corner in edit mode */}
        {dragHandle && (
          <div className="absolute left-2 top-2 z-20 opacity-0 transition-opacity group-hover:opacity-100">
            {dragHandle}
          </div>
        )}

        {/* Preview banner */}
        <div className="relative h-28 overflow-hidden bg-gradient-to-br from-accent/8 via-surface to-surface">
          {link.image_url ? (
            <RemoteImage
              src={link.image_url}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              fallback={
                <div className="flex h-full items-center justify-center">
                  <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={44} />
                </div>
              }
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line/50 bg-card shadow-inner shadow-white/5">
                <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={32} />
              </div>
            </div>
          )}

          {/* Hover action overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-bg/70 opacity-0 backdrop-blur-[2px] transition-all duration-200 group-hover:opacity-100">
            <a
              href={link.url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-bg shadow-lg shadow-accent/30 transition-transform hover:scale-105"
              title={t("link.open")}
            >
              <ExternalLink size={15} />
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line/50 bg-surface/90 text-t2 shadow-sm transition-transform hover:scale-105 hover:text-t1"
              title={t("link.edit")}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={toggleFavorite}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border border-line/50 bg-surface/90 shadow-sm transition-transform hover:scale-105 ${link.is_favorite ? "text-amber-400" : "text-t3 hover:text-amber-400"}`}
              title={t("link.favorite")}
            >
              <Star size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line/50 bg-surface/90 text-rose-500/70 shadow-sm transition-transform hover:scale-105 hover:text-rose-500"
              title={t("link.delete")}
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Status badges */}
          <div className="absolute right-2 top-2 flex gap-1">
            {link.is_favorite && (
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/20 backdrop-blur-sm">
                <Star size={11} className="text-amber-400" />
              </span>
            )}
            {link.is_archived && (
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface/80 backdrop-blur-sm">
                <Archive size={11} className="text-t3" />
              </span>
            )}
          </div>
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col p-3">
          {/* Domain */}
          <div className="mb-1 flex items-center gap-1.5">
            <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={12} />
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-t3">{getHost(link.url)}</span>
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-t1">{link.name}</h3>

          {/* Description */}
          {link.description && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-t3">{link.description}</p>
          )}

          {/* Tags */}
          {link.tags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1 pt-2">
              {link.tags.slice(0, 4).map((tag) => (
                <span key={tag.id} className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent/80">
                  {tag.name}
                </span>
              ))}
              {link.tags.length > 4 && (
                <span className="rounded-md px-1 py-0.5 text-[9px] text-t3">+{link.tags.length - 4}</span>
              )}
            </div>
          )}
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
