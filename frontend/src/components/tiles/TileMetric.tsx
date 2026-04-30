// TileMetric — data style, designed for 1×2 or 2×2 tiles.
// At 1×1 (72px) only the header is visible — metrics clip cleanly via overflow-hidden.
// Top gradient line as signature element.

import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot, { OnlineStatus } from "../ui/StatusDot";

interface Props {
  tile: Tile;
  status: OnlineStatus;
  apiData: TileMetrics | null;
}

export default function TileMetric({ tile, status, apiData }: Props) {
  const hostname = (() => {
    try {
      return new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname;
    } catch {
      return tile.url;
    }
  })();

  const hasMetrics = apiData?.status === "ok";
  const metricItems = hasMetrics
    ? [
        { label: "Series",  val: apiData.seriesCount },
        { label: "Movies",  val: apiData.movieCount },
        { label: "Streams", val: apiData.activeStreams },
      ].filter(({ val }) => val !== null)
    : [];

  return (
    <div className="tile-glass group relative flex h-full flex-col overflow-hidden rounded-xl border border-line/60 p-3 shadow-sm transition-colors duration-150 hover:border-accent/40">
      {/* Top gradient line — signature of this style */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-accent via-accent/50 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/6 to-transparent" />

      {/* Header — always visible */}
      <div className="relative flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line/50 bg-surface">
            <FaviconImg url={tile.url} name={tile.name} size={18} explicitIconUrl={tile.icon_url} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold leading-tight text-t1">{tile.name}</div>
            {tile.show_address && (
              <div className="truncate text-[9px] text-t3">{hostname}</div>
            )}
          </div>
        </div>
        <StatusDot status={status} size="sm" />
      </div>

      {/* Metric cards — visible only when tile spans ≥2 rows */}
      {metricItems.length > 0 && (
        <div className="relative mt-2.5 grid grid-cols-2 gap-1.5">
          {metricItems.map(({ label, val }) => (
            <div key={label} className="rounded-lg border border-line/40 bg-card/80 px-2.5 py-2">
              <div className="mb-0.5 text-[8px] font-semibold uppercase tracking-widest text-t3">{label}</div>
              <div className="text-[15px] font-bold tabular-nums leading-tight text-t1">{val ?? "–"}</div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {apiData?.status === "error" && (
        <div className="relative mt-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1.5 text-[11px] font-medium text-rose-500">
          API unavailable
        </div>
      )}

      {/* Fallback status text (no metrics, no error) */}
      {!hasMetrics && apiData?.status !== "error" && (
        <div className="relative mt-auto pt-1.5 text-center text-[10px] text-t3">
          {status === "checking" ? "Checking…" : status === "online" ? "Online" : status === "slow" ? "Slow" : "Offline"}
        </div>
      )}
    </div>
  );
}
