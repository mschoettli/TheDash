import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot, { OnlineStatus } from "../ui/StatusDot";

interface Props {
  tile: Tile;
  status: OnlineStatus;
  apiData: TileMetrics | null;
}

export default function TileMinimal({ tile, status, apiData: _ }: Props) {
  return (
    <div className="tile-glass tile-hover-plane relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-line/40 px-3 py-2 text-center">
      <span className="tile-status-dot">
        <StatusDot status={status} size="sm" />
      </span>
      <div className="flex min-w-0 -translate-y-0.5 flex-col items-center justify-center gap-1">
        <FaviconImg url={tile.url} name={tile.name} size={28} explicitIconUrl={tile.icon_url} />
        <span className="block max-w-full truncate text-[11px] font-semibold leading-[1.1] tracking-[-0.01em] text-t1">
          {tile.name}
        </span>
      </div>
    </div>
  );
}
