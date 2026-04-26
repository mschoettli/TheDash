import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot from "../ui/StatusDot";

interface Props {
  tile: Tile;
  online: boolean | null;
  apiData: TileMetrics | null;
}

export default function TileCompact({ tile, online, apiData }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/60 bg-card px-3 py-2.5 shadow-sm transition-all duration-200 hover:border-accent/35 hover:shadow-lg hover:shadow-accent/5">
      <FaviconImg url={tile.url} name={tile.name} size={22} explicitIconUrl={tile.icon_url} />
      <span className="flex-1 min-w-0">
        <span className="block truncate text-[13px] font-medium text-t1">{tile.name}</span>
        {tile.show_address && <span className="block truncate text-[10px] text-t3">{new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname}</span>}
      </span>
      {apiData?.status === "ok" && (
        <span className="text-[11px] text-t3 whitespace-nowrap tabular-nums">
          ▶ {apiData.activeStreams ?? 0}
        </span>
      )}
      <StatusDot online={online === true} size="sm" />
    </div>
  );
}
