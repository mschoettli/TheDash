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
    <div className="tile-glass relative flex h-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border border-line/40 px-3 py-2 text-center transition-colors duration-150 hover:border-accent/30">
      <span className="absolute right-2 top-2">
        <StatusDot status={status} size="sm" />
      </span>
      <FaviconImg url={tile.url} name={tile.name} size={34} explicitIconUrl={tile.icon_url} />
      <span className="w-full truncate text-[11px] font-semibold leading-tight tracking-[-0.01em] text-t1">
        {tile.name}
      </span>
    </div>
  );
}
