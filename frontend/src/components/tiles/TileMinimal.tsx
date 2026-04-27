import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot, { OnlineStatus } from "../ui/StatusDot";

interface Props {
  tile: Tile;
  status: OnlineStatus;
  apiData: TileMetrics | null;
}

export default function TileMinimal({ tile, status, apiData }: Props) {
  const hostname = (() => {
    try {
      return new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname;
    } catch {
      return tile.url;
    }
  })();

  return (
    <div className="tile-glass relative flex min-h-[98px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-line/45 p-3 text-center shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-accent/70" />
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line/50 bg-surface">
        <FaviconImg url={tile.url} name={tile.name} size={27} explicitIconUrl={tile.icon_url} />
      </span>
      <span className="w-full truncate text-[12px] font-semibold text-t1">{tile.name}</span>
      {tile.show_address && <span className="w-full truncate text-[9px] font-medium text-t3">{hostname}</span>}
      {apiData?.status === "ok" && (
        <span className="rounded-full border border-line/45 bg-surface px-2 py-0.5 text-[10px] font-medium tabular-nums text-t3">
          {apiData.activeStreams ?? 0} streams
        </span>
      )}
      <span className="absolute top-2 right-2">
        <StatusDot status={status} size="sm" />
      </span>
    </div>
  );
}
