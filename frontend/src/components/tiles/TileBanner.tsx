import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot, { OnlineStatus } from "../ui/StatusDot";

interface Props {
  tile: Tile;
  status: OnlineStatus;
  apiData: TileMetrics | null;
}

export default function TileBanner({ tile, status, apiData }: Props) {
  const hostname = (() => {
    try {
      return new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname;
    } catch {
      return tile.url;
    }
  })();
  const hasMetrics = apiData?.status === "ok";

  return (
    <div className="tile-glass group relative flex h-full items-center overflow-hidden rounded-xl border border-line/60 px-3.5 py-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10">
      {/* Gradient backgrounds */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/12 via-accent/4 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-xl bg-gradient-to-b from-accent via-accent/80 to-accent/40" />

      {/* Icon */}
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line/50 bg-surface shadow-inner shadow-white/5">
        <FaviconImg url={tile.url} name={tile.name} size={27} explicitIconUrl={tile.icon_url} />
      </div>

      {/* Main info */}
      <div className="relative ml-3 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-bold leading-5 text-t1">{tile.name}</span>
          <StatusDot status={status} size="sm" />
        </div>
        {tile.show_address && (
          <div className="truncate text-[11px] font-medium text-t3">{hostname}</div>
        )}
        {hasMetrics && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[
              { label: "Series", val: apiData.seriesCount },
              { label: "Movies", val: apiData.movieCount },
              { label: "Streams", val: apiData.activeStreams },
            ].filter(({ val }) => val !== null).map(({ label, val }) => (
              <span key={label} className="rounded-lg border border-line/45 bg-surface/80 px-1.5 py-[1px] text-[9px] font-semibold text-t2">
                {label} <span className="text-t1">{val}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="relative ml-3 shrink-0 text-right">
        {status === "offline" && (
          <span className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[10px] font-semibold text-rose-400">
            Offline
          </span>
        )}
        {status === "slow" && (
          <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-400">
            Slow
          </span>
        )}
      </div>
    </div>
  );
}
