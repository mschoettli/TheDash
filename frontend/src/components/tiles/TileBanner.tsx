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

export default function TileBanner({ tile, status, apiData: _ }: Props) {
  return (
    <div className="tile-glass tile-hover-plane group relative flex h-full items-center gap-3 overflow-hidden rounded-2xl border border-line/45 px-3 py-2 pr-8 shadow-sm">
      <span className="tile-status-dot">
        <StatusDot status={status} size="sm" />
      </span>
      <FaviconImg url={tile.url} name={tile.name} size={36} explicitIconUrl={tile.icon_url} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold leading-tight tracking-[-0.01em] text-t1">{tile.name}</div>
        {tile.show_address && <div className="mt-0.5 truncate text-[10px] font-medium text-t3">{hostLabel(tile.url)}</div>}
      </div>
    </div>
  );
}
