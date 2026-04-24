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
    <div className="group flex flex-col gap-3 p-4 rounded-xl bg-card border border-line/60 hover:border-accent/30 hover:bg-card/80 transition-all duration-200 h-full">
      <div className="flex items-start justify-between">
        <FaviconImg url={tile.url} name={tile.name} size={34} explicitIconUrl={tile.icon_url} />
        <StatusDot online={online === true} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[13px] text-t1 truncate">{tile.name}</div>
        <div className="text-[11px] text-t3 truncate mt-0.5">{hostname}</div>
      </div>

      {apiData?.status === "ok" && (
        <div className="grid grid-cols-3 gap-1 text-center rounded-lg px-2 py-1.5 bg-surface border border-line/40">
          {[
            { label: "Series", val: apiData.seriesCount },
            { label: "Movies", val: apiData.movieCount },
            { label: "Streams", val: apiData.activeStreams },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="text-[10px] text-t3">{label}</div>
              <div className="text-xs font-semibold text-t1">{val ?? "–"}</div>
            </div>
          ))}
        </div>
      )}

      {apiData?.status === "error" && (
        <div className="text-[11px] text-rose-400 bg-rose-500/10 rounded-lg px-2 py-1 border border-rose-500/20">
          API unavailable
        </div>
      )}
    </div>
  );
}
