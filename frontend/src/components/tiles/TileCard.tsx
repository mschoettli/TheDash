import { Tile } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot from "../ui/StatusDot";

interface Props {
  tile: Tile;
  online: boolean | null;
  apiData: unknown;
}

function renderApiData(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "number") return String(data);
  if (typeof data === "object" && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>).slice(0, 3);
    return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
  }
  return null;
}

export default function TileCard({ tile, online, apiData }: Props) {
  const apiText = renderApiData(apiData);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all duration-200 h-full">
      <div className="flex items-start justify-between">
        <FaviconImg url={tile.url} name={tile.name} size={36} />
        <StatusDot online={online === true} />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
          {tile.name}
        </div>
        <div className="text-xs text-slate-400 truncate mt-0.5">
          {new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname}
        </div>
      </div>
      {apiText && (
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2 py-1.5 truncate">
          {apiText}
        </div>
      )}
    </div>
  );
}
