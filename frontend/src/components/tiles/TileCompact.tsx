// TileCompact — dense list style
// Pure flat row: favicon directly (no box), name, status dot.
// No border decoration, no accent bar — maximum information density.

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
    <div className="tile-glass relative flex h-full items-center gap-2 overflow-hidden rounded-xl border border-line/45 px-3 transition-colors duration-150 hover:border-accent/35">
      {/* Favicon — no box/border, just the icon */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center opacity-90">
        <FaviconImg url={tile.url} name={tile.name} size={20} explicitIconUrl={tile.icon_url} />
      </span>

      {/* Name — slightly muted, compact weight */}
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-t1">
        {tile.name}
      </span>

      {/* Active stream count */}
      {apiData?.status === "ok" && apiData.activeStreams != null && (
        <span className="shrink-0 text-[9px] font-semibold tabular-nums text-t3">
          {apiData.activeStreams}▶
        </span>
      )}

      {/* Status */}
      <StatusDot status={status} size="sm" />
    </div>
  );
}
