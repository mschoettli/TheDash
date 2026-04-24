import { Archive, ExternalLink, Star } from "lucide-react";
import { Link } from "../../hooks/useLinks";
import FaviconImg from "../ui/FaviconImg";

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
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
      <button onClick={() => onOpen(link)} className="block w-full text-left">
        {link.image_url ? (
          <img
            src={link.image_url}
            alt=""
            className="h-36 w-full object-cover bg-slate-100 dark:bg-slate-700"
            loading="lazy"
          />
        ) : (
          <div className="h-24 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <FaviconImg
              url={link.url}
              name={link.name}
              explicitIconUrl={link.icon_url}
              size={42}
            />
          </div>
        )}

        <div className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <FaviconImg
              url={link.url}
              name={link.name}
              explicitIconUrl={link.icon_url}
              size={20}
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                {link.name}
              </h3>
              <p className="text-xs text-slate-400 truncate">{getHost(link.url)}</p>
            </div>
          </div>

          {link.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
              {link.description}
            </p>
          )}

          {link.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {link.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[11px] text-slate-500 dark:text-slate-300"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{link.created_at ? new Date(link.created_at).toLocaleDateString() : ""}</span>
            <span className="flex items-center gap-2">
              {Boolean(link.is_archived) && <Archive size={13} />}
              {Boolean(link.is_favorite) && <Star size={13} className="text-amber-400" />}
              <ExternalLink size={13} />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
