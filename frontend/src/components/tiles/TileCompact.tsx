import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot from "../ui/StatusDot";

interface Props {
  tile: Tile;
  online: boolean | null;
  apiData: TileMetrics | null;
}

export default function TileCompact({ tile, online, apiData }: Props) {
  const hostname = (() => {
    try {
      return new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname;
    } catch {
      return tile.url;
    }
  })();

  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-[1.15rem] border border-line/60 bg-card px-3.5 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-xl hover:shadow-accent/5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line/50 bg-surface">
        <FaviconImg url={tile.url} name={tile.name} size={25} explicitIconUrl={tile.icon_url} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-5 text-t1">{tile.name}</span>
        {tile.show_address && <span className="block truncate text-[10px] font-medium text-t3">{hostname}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {apiData?.status === "ok" && (
          <span className="rounded-lg border border-line/45 bg-surface px-2 py-1 text-[11px] font-semibold tabular-nums text-t2">
            {apiData.activeStreams ?? 0}
          </span>
        )}
        <StatusDot online={online === true} size="sm" />
      </span>
    </div>
  );
}
