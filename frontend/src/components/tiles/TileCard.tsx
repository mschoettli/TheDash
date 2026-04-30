// TileCard — default style
// Clean card: icon in box on the left, name + URL in center, status dot right.
// No accent bar — background itself carries the "card" look.

import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot, { OnlineStatus } from "../ui/StatusDot";

interface Props {
  tile: Tile;
  status: OnlineStatus;
  apiData: TileMetrics | null;
}

export default function TileCard({ tile, status, apiData }: Props) {
  const hostname = (() => {
    try {
      return new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname;
    } catch {
      return tile.url;
    }
  })();

  const hasMetrics = apiData?.status === "ok";
  const metrics = hasMetrics
    ? [
        { label: "Series",  val: apiData.seriesCount },
        { label: "Movies",  val: apiData.movieCount },
        { label: "Streams", val: apiData.activeStreams },
      ].filter(({ val }) => val !== null)
    : [];

  return (
    <div className="tile-glass group relative flex h-full items-center gap-2.5 overflow-hidden rounded-xl border border-line/60 px-3 shadow-sm transition-colors duration-150 hover:border-accent/40">
      {/* Subtle tint */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent" />

      {/* Icon box */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/50 bg-surface">
        <FaviconImg url={tile.url} name={tile.name} size={22} explicitIconUrl={tile.icon_url} />
      </div>

      {/* Text */}
      <div className="relative min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold leading-tight text-t1">{tile.name}</div>
        {tile.show_address && (
          <div className="truncate text-[10px] text-t3">{hostname}</div>
        )}
        {/* API metric badges — only when API data available */}
        {metrics.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {metrics.map(({ label, val }) => (
              <span key={label} className="rounded border border-line/40 bg-surface/80 px-1 py-px text-[8px] font-semibold text-t3">
                {label} <span className="text-t1">{val}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <StatusDot status={status} size="sm" />
    </div>
  );
}
