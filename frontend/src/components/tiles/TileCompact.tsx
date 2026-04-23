import { Tile } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot from "../ui/StatusDot";

interface Props {
  tile: Tile;
  online: boolean | null;
  apiData: unknown;
}

export default function TileCompact({ tile, online }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all duration-200">
      <FaviconImg url={tile.url} name={tile.name} size={24} />
      <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
        {tile.name}
      </span>
      <StatusDot online={online === true} size="sm" />
    </div>
  );
}
