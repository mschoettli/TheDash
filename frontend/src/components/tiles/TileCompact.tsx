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
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all duration-200">
      <FaviconImg url={tile.url} name={tile.name} size={24} explicitIconUrl={tile.icon_url} />
      <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
        {tile.name}
      </span>
      {apiData?.status === "ok" && (
        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          ▶ {apiData.activeStreams ?? 0}
        </span>
      )}
      <StatusDot online={online === true} size="sm" />
    </div>
  );
}