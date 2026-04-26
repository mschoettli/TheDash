import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot from "../ui/StatusDot";

interface Props {
  tile: Tile;
  online: boolean | null;
  apiData: TileMetrics | null;
}

export default function TileMinimal({ tile, online, apiData }: Props) {
  return (
    <div className="relative flex flex-col items-center gap-2 rounded-2xl border border-transparent p-4 transition-all duration-150 hover:border-line/60 hover:bg-card hover:shadow-sm">
      <FaviconImg url={tile.url} name={tile.name} size={30} explicitIconUrl={tile.icon_url} />
      <span className="text-[11px] font-medium text-t2 text-center truncate w-full">{tile.name}</span>
      {tile.show_address && <span className="w-full truncate text-center text-[9px] text-t3">{new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname}</span>}
      {apiData?.status === "ok" && (
        <span className="text-[10px] text-t3 tabular-nums">{apiData.activeStreams ?? 0} streams</span>
      )}
      <span className="absolute top-2 right-2">
        <StatusDot online={online === true} size="sm" />
      </span>
    </div>
  );
}
