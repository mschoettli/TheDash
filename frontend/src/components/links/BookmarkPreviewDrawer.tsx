import { Archive, ExternalLink, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useDeleteLink, useUpdateLink } from "../../hooks/useLinks";
import FaviconImg from "../ui/FaviconImg";

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
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const [note, setNote] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setNote(link?.note ?? "");
    setTagInput(link?.tags.map((tag) => tag.name).join(", ") ?? "");
  }, [link]);

  const parsedTags = useMemo(
    () =>
      tagInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagInput]
  );

  if (!link) return null;

  const saveDetails = () => {
    updateLink.mutate({
      id: link.id,
      note,
      tags: parsedTags as any,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/30">
      <button className="flex-1 cursor-default" onClick={onClose} aria-label="Close preview" />
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {link.name}
            </div>
            <div className="text-xs text-slate-400 truncate">{getHost(link.url)}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {link.image_url ? (
          <img src={link.image_url} alt="" className="h-56 w-full object-cover bg-slate-100" />
        ) : (
          <div className="h-40 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
            <FaviconImg
              url={link.url}
              name={link.name}
              explicitIconUrl={link.icon_url}
              size={56}
            />
          </div>
        )}

        <div className="space-y-5 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{link.name}</h2>
            {link.description && (
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {link.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
            >
              <ExternalLink size={14} /> Open
            </a>
            <button
              onClick={() => updateLink.mutate({ id: link.id, is_favorite: !link.is_favorite })}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-300"
            >
              <Star size={14} /> Fav
            </button>
            <button
              onClick={() => updateLink.mutate({ id: link.id, is_archived: !link.is_archived })}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-300"
            >
              <Archive size={14} /> Archive
            </button>
            <button
              onClick={() => deleteLink.mutate(link.id, { onSuccess: onClose })}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-500"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Tags
            </label>
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onBlur={saveDetails}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
              placeholder="homelab, docs, ideas"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Note
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onBlur={saveDetails}
              rows={7}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
              placeholder="Private notes for this bookmark..."
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
