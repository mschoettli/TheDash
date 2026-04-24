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
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-line/60 hover:border-accent/30 transition-all duration-200">
      <FaviconImg url={tile.url} name={tile.name} size={22} explicitIconUrl={tile.icon_url} />
      <span className="flex-1 text-[13px] font-medium text-t1 truncate">{tile.name}</span>
      {apiData?.status === "ok" && (
        <span className="text-[11px] text-t3 whitespace-nowrap tabular-nums">
          ▶ {apiData.activeStreams ?? 0}
        </span>
      )}
      <StatusDot online={online === true} size="sm" />
    </div>
  );
}
