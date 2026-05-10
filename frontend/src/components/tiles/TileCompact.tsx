import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot, { OnlineStatus } from "../ui/StatusDot";

interface Props {
  tile: Tile;
  status: OnlineStatus;
  apiData: TileMetrics | null;
}

export default function TileCompact({ tile, status, apiData }: Props) {
  return (
    <div className="tile-glass tile-hover-plane relative flex h-full items-center gap-2.5 overflow-hidden rounded-2xl border border-line/40 px-3 py-2">
      <FaviconImg url={tile.url} name={tile.name} size={26} explicitIconUrl={tile.icon_url} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold tracking-[-0.01em] text-t1">
        {tile.name}
      </span>
      {apiData?.status === "ok" && apiData.activeStreams != null && (
        <span className="shrink-0 rounded-full border border-line/35 bg-surface/45 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-t3">
          {apiData.activeStreams}
        </span>
      )}
      <StatusDot status={status} size="sm" />
    </div>
  );
}
