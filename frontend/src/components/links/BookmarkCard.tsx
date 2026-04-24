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
    </article>
  );
}
