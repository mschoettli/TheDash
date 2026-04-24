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
    <article className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-[0_16px_40px_rgba(2,8,23,0.2)] transition hover:border-cyan-400/40 hover:bg-slate-900/90">
      <button onClick={() => onOpen(link)} className="block w-full text-left">
        <div className="flex gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            {link.image_url ? (
              <img src={link.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={28} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-300/80">
              {getHost(link.url)}
            </div>
            <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-100">
              {link.name}
            </h3>
            {link.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{link.description}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-1">
            {link.tags.slice(0, 4).map((tag) => (
              <span key={tag.id} className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-400">
                {tag.name}
              </span>
            ))}
          </div>
          <span className="flex shrink-0 items-center gap-2 text-slate-500">
            {Boolean(link.is_archived) && <Archive size={13} />}
            {Boolean(link.is_favorite) && <Star size={13} className="text-amber-300" />}
            <ExternalLink size={13} className="opacity-70 group-hover:text-cyan-300" />
          </span>
        </div>
      </button>
    </article>
  );
}
