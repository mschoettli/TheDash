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
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors duration-150 relative">
      <FaviconImg url={tile.url} name={tile.name} size={32} explicitIconUrl={tile.icon_url} />
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 text-center truncate w-full">
        {tile.name}
      </span>
      {apiData?.status === "ok" && (
        <span className="text-[11px] text-slate-400">{apiData.activeStreams ?? 0} streams</span>
      )}
      <span className="absolute top-2 right-2">
        <StatusDot online={online === true} size="sm" />
      </span>
    </div>
  );
}