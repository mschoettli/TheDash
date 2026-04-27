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
        { label: "Series", val: apiData.seriesCount },
        { label: "Movies", val: apiData.movieCount },
        { label: "Streams", val: apiData.activeStreams },
      ].filter(({ val }) => val !== null)
    : [];

  return (
    <div className="tile-glass group relative flex min-h-[160px] flex-col overflow-hidden rounded-xl border border-line/60 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-xl hover:shadow-accent/10">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent via-accent/60 to-transparent" />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line/55 bg-surface shadow-inner shadow-white/5">
            <FaviconImg url={tile.url} name={tile.name} size={27} explicitIconUrl={tile.icon_url} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold text-t1">{tile.name}</div>
            {tile.show_address && (
              <div className="truncate text-[10px] font-medium text-t3">{hostname}</div>
            )}
          </div>
        </div>
        <StatusDot status={status} size="md" />
      </div>

      {/* Metrics grid */}
      {metricItems.length > 0 ? (
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          {metricItems.map(({ label, val }) => (
            <div key={label} className="rounded-xl border border-line/45 bg-card/60 px-3 py-2.5">
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-t3">{label}</div>
              <div className="text-[18px] font-bold tabular-nums text-t1">{val ?? "–"}</div>
            </div>
          ))}
        </div>
      ) : apiData?.status === "error" ? (
        <div className="relative mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[12px] font-medium text-rose-500">
          API unavailable
        </div>
      ) : (
        <div className="relative mt-auto pt-3 text-center text-[12px] text-t3">
          {status === "checking" ? "Checking..." : status === "online" ? "Online" : status === "slow" ? "Slow response" : "Offline"}
        </div>
      )}
    </div>
  );
}
