import { Archive, Eye, EyeOff, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useDeleteLink, useUpdateLink } from "../../hooks/useLinks";
import FaviconImg from "../ui/FaviconImg";
import ConfirmDialog from "../ui/ConfirmDialog";
import LinkEditModal from "./LinkEditModal";
import BookmarkPreviewImage from "./BookmarkPreviewImage";

interface BookmarkCardProps {
  link: Link;
  collectionTitle?: string;
  dragHandle?: React.ReactNode;
  isDragging?: boolean;
  variant?: "grid" | "list";
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (checked: boolean) => void;
}

function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function metaLabel(link: Link, collectionTitle?: string): string {
  return collectionTitle || link.tags[0]?.name || "Unsorted";
}

function MoreActions({
  open,
  selectable,
  selected,
  compact = false,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
}: {
  open: boolean;
  selectable?: boolean;
  selected?: boolean;
  compact?: boolean;
  onToggle: (event: React.MouseEvent) => void;
  onSelect?: (checked: boolean) => void;
  onEdit: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative flex items-center">
      {open && (
        <div className="absolute right-10 z-20 flex items-center gap-1 rounded-full border border-line/60 bg-surface/95 p-1 shadow-lg backdrop-blur">
          {selectable && (
            <label
              className="flex h-8 w-8 items-center justify-center rounded-full text-t2 transition-colors hover:bg-line/40 hover:text-accent"
              title={t("bookmarks.selected", "selected")}
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={Boolean(selected)}
                onChange={(event) => onSelect?.(event.target.checked)}
                className="h-3.5 w-3.5"
              />
            </label>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-full text-t2 transition-colors hover:bg-line/40 hover:text-accent"
            title={t("link.edit")}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full text-t2 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
            title={t("link.delete")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onToggle}
        className={`${compact ? "h-7 w-7" : "h-9 w-9"} flex items-center justify-center rounded-full border border-line/50 bg-surface/75 text-t3 shadow-sm backdrop-blur transition-colors hover:border-accent/35 hover:bg-surface/95 hover:text-accent`}
        title={t("link.actions")}
      >
        <MoreHorizontal size={compact ? 13 : 16} />
      </button>
    </div>
  );
}

export default function BookmarkCard({
  link,
  collectionTitle,
  dragHandle,
  isDragging,
  variant = "grid",
  selected = false,
  selectable = false,
  onSelect,
}: BookmarkCardProps) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const host = getHost(link.url);
  const visibleTags = link.tags.slice(0, 5);

  const toggleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();
    updateLink.mutate({ id: link.id, is_favorite: !link.is_favorite });
  };

  const toggleRead = (event: React.MouseEvent) => {
    event.stopPropagation();
    updateLink.mutate({ id: link.id, is_read: !link.is_read });
  };

  const openEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    setActionsOpen(false);
    setEditOpen(true);
  };

  const openDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setActionsOpen(false);
    setDeleteOpen(true);
  };

  const toggleActions = (event: React.MouseEvent) => {
    event.stopPropagation();
    setActionsOpen((value) => !value);
  };

  const openLink = () => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  if (variant === "list") {
    return (
      <>
        <div
          onClick={openLink}
          className={`group flex items-center gap-3 rounded-2xl border border-line/50 bg-card px-3 py-2.5 transition-all hover:border-accent/30 hover:shadow-sm ${
            isDragging ? "opacity-40 shadow-xl" : ""
          } ${link.is_archived ? "opacity-60" : ""} cursor-pointer ${selected ? "ring-2 ring-accent/40" : ""}`}
        >
          {dragHandle && <div className="shrink-0 cursor-grab text-t3 hover:text-accent">{dragHandle}</div>}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line/50 bg-surface">
            <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-t3">{host}</div>
            <div className="flex items-center gap-2">
              <span className="truncate text-[14px] font-semibold text-t1">{link.name}</span>
              {link.is_favorite && <Star size={11} className="shrink-0 text-amber-400" />}
              {link.is_archived && <Archive size={11} className="shrink-0 text-t3" />}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleFavorite}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/60 text-t3 transition-colors hover:text-amber-400"
            title={t("link.favorite")}
          >
            <Star size={14} className={link.is_favorite ? "text-amber-400" : ""} />
          </button>
          <button
            type="button"
            onClick={toggleRead}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/60 text-t3 transition-colors hover:text-accent"
            title={link.is_read ? t("link.mark_unread") : t("link.mark_read")}
          >
            {link.is_read ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} className="text-rose-400" />}
          </button>
          <MoreActions
            open={actionsOpen}
            selectable={selectable}
            selected={selected}
            onSelect={onSelect}
            onToggle={toggleActions}
            onEdit={openEdit}
            onDelete={openDelete}
          />
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

  return (
    <>
      <article
        onClick={openLink}
        className={`group relative overflow-hidden rounded-2xl border border-line/50 bg-card transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 ${
          isDragging ? "opacity-40 shadow-xl" : ""
        } ${link.is_archived ? "opacity-60" : ""} cursor-pointer ${selected ? "ring-2 ring-accent/40" : ""}`}
      >
        <div className="relative">
          {dragHandle && (
            <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 cursor-grab rounded-lg bg-surface/85 p-1 text-t3 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-80 hover:!opacity-100">
              {dragHandle}
            </div>
          )}
          <BookmarkPreviewImage link={link} />
          <div className="absolute left-3 top-3 z-10 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur">
            {metaLabel(link, collectionTitle)}
          </div>
          <div className="absolute bottom-3 left-3 z-10 max-w-[70%] truncate rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur">
            {host}
          </div>
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleFavorite}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-sm backdrop-blur transition-colors hover:text-amber-300"
              title={t("link.favorite")}
            >
              <Star size={15} className={link.is_favorite ? "text-amber-300" : ""} />
            </button>
            <button
              type="button"
              onClick={toggleRead}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-sm backdrop-blur transition-colors hover:text-accent"
              title={link.is_read ? t("link.mark_unread") : t("link.mark_read")}
            >
              {link.is_read ? <Eye size={15} className="text-emerald-300" /> : <EyeOff size={15} className="text-rose-300" />}
            </button>
          </div>
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start gap-3 pb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line/50 bg-surface">
              <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[16px] font-semibold leading-5 text-t1">{link.name}</h3>
              {link.description && (
                <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-t2">{link.description}</p>
              )}
            </div>
          </div>

          <div className="absolute bottom-3 right-3">
            <MoreActions
              open={actionsOpen}
              selectable={selectable}
              selected={selected}
              compact
              onSelect={onSelect}
              onToggle={toggleActions}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          </div>

          {visibleTags.length > 0 && (
            <div className="mr-9 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
              {visibleTags.map((tag) => (
                <span key={tag.id} className="shrink-0 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent/90 leading-none">
                  {tag.name}
                </span>
              ))}
              {link.tags.length > visibleTags.length && (
                <span className="shrink-0 rounded-full border border-line/50 px-2 py-1 text-[10px] font-semibold text-t3 leading-none">
                  +{link.tags.length - visibleTags.length}
                </span>
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
