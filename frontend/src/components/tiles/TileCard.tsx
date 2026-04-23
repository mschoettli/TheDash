import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot from "../ui/StatusDot";

interface Props {
  tile: Tile;
  online: boolean | null;
  apiData: TileMetrics | null;
}

export default function TileCard({ tile, online, apiData }: Props) {
  const hostname = new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all duration-200 h-full">
      <div className="flex items-start justify-between">
        <FaviconImg url={tile.url} name={tile.name} size={36} explicitIconUrl={tile.icon_url} />
        <StatusDot online={online === true} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
          {tile.name}
        </div>
        <div className="text-xs text-slate-400 truncate mt-0.5">{hostname}</div>
      </div>

      {apiData && apiData.status === "ok" && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs rounded-lg px-2 py-2 bg-slate-50 dark:bg-slate-700/40">
          <div>
            <div className="text-slate-400">Series</div>
            <div className="font-semibold text-slate-700 dark:text-slate-200">{apiData.seriesCount ?? "-"}</div>
          </div>
          <div>
            <div className="text-slate-400">Movies</div>
            <div className="font-semibold text-slate-700 dark:text-slate-200">{apiData.movieCount ?? "-"}</div>
          </div>
          <div>
            <div className="text-slate-400">Streams</div>
            <div className="font-semibold text-slate-700 dark:text-slate-200">{apiData.activeStreams ?? "-"}</div>
          </div>
        </div>
      )}

      {apiData && apiData.status === "error" && (
        <div className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-2 py-1.5 truncate">
          API error
        </div>
      )}
    </div>
  );
}