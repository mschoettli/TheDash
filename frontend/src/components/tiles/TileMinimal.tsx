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
    <div className="tile-glass tile-hover-plane relative flex h-full min-h-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-line/40 px-2.5 py-1.5 text-center">
      <span className="absolute right-2 top-2">
        <StatusDot status={status} size="sm" />
      </span>
      <FaviconImg url={tile.url} name={tile.name} size={28} explicitIconUrl={tile.icon_url} />
      <span className="block w-full truncate text-[10px] font-semibold leading-[1.15] tracking-[-0.01em] text-t1">
        {tile.name}
      </span>
    </div>
  );
}
