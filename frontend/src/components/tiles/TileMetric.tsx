import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot, { OnlineStatus } from "../ui/StatusDot";

interface Props {
  tile: Tile;
  status: OnlineStatus;
  apiData: TileMetrics | null;
}

function hostLabel(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `http://${url}`).hostname;
  } catch {
    return url;
  }
}

export default function TileMetric({ tile, status, apiData }: Props) {
  const metricItems = apiData?.status === "ok"
    ? [
        { label: "Series", val: apiData.seriesCount },
        { label: "Movies", val: apiData.movieCount },
        { label: "Streams", val: apiData.activeStreams },
      ].filter(({ val }) => val !== null)
    : [];

  return (
    <div className="tile-glass tile-hover-plane group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line/45 p-3 shadow-sm">
      <span className="tile-status-dot">
        <StatusDot status={status} size="sm" />
      </span>
      <div className="flex shrink-0 items-center gap-2.5 pr-5">
        <FaviconImg url={tile.url} name={tile.name} size={32} explicitIconUrl={tile.icon_url} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight tracking-[-0.01em] text-t1">{tile.name}</div>
          {tile.show_address && <div className="truncate text-[9px] font-medium text-t3">{hostLabel(tile.url)}</div>}
        </div>
      </div>

      {metricItems.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {metricItems.map(({ label, val }) => (
            <div key={label} className="rounded-xl border border-line/35 bg-surface/45 px-2 py-1.5">
              <div className="truncate text-[8px] font-semibold uppercase tracking-[0.14em] text-t3">{label}</div>
              <div className="text-[14px] font-semibold tabular-nums leading-tight text-t1">{val}</div>
            </div>
          ))}
        </div>
      )}

      {apiData?.status === "error" && (
        <div className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2 py-1.5 text-[11px] font-medium text-rose-500">
          API unavailable
        </div>
      )}
    </div>
  );
}
