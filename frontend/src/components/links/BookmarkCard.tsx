import { Archive, ExternalLink, MoreHorizontal, Pencil, Star, Tags, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useDeleteLink, useUpdateLink } from "../../hooks/useLinks";
import FaviconImg from "../ui/FaviconImg";
import LinkEditModal from "./LinkEditModal";

interface BookmarkCardProps {
  link: Link;
  onOpen: (link: Link) => void;
}

function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function BookmarkCard({ link, onOpen }: BookmarkCardProps) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();

  return (
    <article className="group rounded-xl bg-card border border-line/60 p-3 transition-all hover:border-accent/30 hover:bg-card/70">
      <button onClick={() => onOpen(link)} className="block w-full text-left">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line/50 bg-surface">
            {link.image_url ? (
              <img src={link.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={26} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-accent/80">
              {getHost(link.url)}
            </div>
            <h3 className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-5 text-t1">
              {link.name}
            </h3>
            {link.description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-t3">{link.description}</p>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            {link.tags.slice(0, 4).map((tag) => (
              <span key={tag.id} className="rounded-md border border-line/50 bg-surface px-1.5 py-0.5 text-[10px] text-t3">
                {tag.name}
              </span>
            ))}
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-t3">
            {Boolean(link.is_archived) && <Archive size={12} />}
            {Boolean(link.is_favorite) && <Star size={12} className="text-amber-400" />}
            <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 group-hover:text-accent transition-all" />
          </span>
        </div>
      </button>
      <div className="mt-2.5 flex items-center justify-between border-t border-line/40 pt-2">
        <div className="flex items-center gap-1 text-[11px] text-t3">
          <Tags size={12} />
          <span>{link.tags.length}</span>
        </div>
        <div className="flex min-h-7 items-center gap-1">
          {actionsOpen ? (
            <>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="rounded-md p-1.5 text-t3 hover:bg-line/30 hover:text-accent"
                aria-label={t("link.open")}
              >
                <ExternalLink size={13} />
              </a>
              <button onClick={() => setEditOpen(true)} className="rounded-md p-1.5 text-t3 hover:bg-line/30 hover:text-accent" aria-label={t("link.edit")}>
                <Pencil size={13} />
              </button>
              <button
                onClick={() => updateLink.mutate({ id: link.id, is_favorite: !link.is_favorite })}
                className={`rounded-md p-1.5 hover:bg-line/30 ${link.is_favorite ? "text-amber-500" : "text-t3 hover:text-amber-500"}`}
                aria-label={t("link.favorite")}
              >
                <Star size={13} />
              </button>
              <button
                onClick={() => updateLink.mutate({ id: link.id, is_archived: !link.is_archived })}
                className={`rounded-md p-1.5 hover:bg-line/30 ${link.is_archived ? "text-accent" : "text-t3 hover:text-accent"}`}
                aria-label={t("link.archive")}
              >
                <Archive size={13} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm(t("link.confirm_delete"))) deleteLink.mutate(link.id);
                }}
                className="rounded-md p-1.5 text-t3 hover:bg-rose-500/10 hover:text-rose-500"
                aria-label={t("link.delete")}
              >
                <Trash2 size={13} />
              </button>
              <button onClick={() => setActionsOpen(false)} className="rounded-md p-1.5 text-t3 hover:bg-line/30 hover:text-t1" aria-label={t("common.cancel")}>
                <X size={13} />
              </button>
            </>
          ) : (
            <button onClick={() => setActionsOpen(true)} className="rounded-md p-1.5 text-t3 hover:bg-line/30 hover:text-accent" aria-label={t("link.actions")}>
              <MoreHorizontal size={15} />
            </button>
          )}
        </div>
      </div>
      <LinkEditModal open={editOpen} onClose={() => setEditOpen(false)} link={link} />
    </article>
  );
}
