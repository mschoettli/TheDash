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
    <div className="relative flex min-h-[58px] items-center gap-2.5 overflow-hidden rounded-xl border border-line/60 bg-card px-3 py-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-lg hover:shadow-accent/5">
      <div className="absolute inset-y-0 left-0 w-0.5 bg-accent/70" />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/50 bg-surface">
        <FaviconImg url={tile.url} name={tile.name} size={22} explicitIconUrl={tile.icon_url} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-5 text-t1">{tile.name}</span>
        {tile.show_address && <span className="block truncate text-[10px] font-medium text-t3">{hostname}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {apiData?.status === "ok" && (
          <span className="rounded-md border border-line/45 bg-surface px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-t2">
            {apiData.activeStreams ?? 0}
          </span>
        )}
        <StatusDot online={online === true} size="sm" />
      </span>
    </div>
  );
}
