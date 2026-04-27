import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot from "../ui/StatusDot";

interface Props {
  tile: Tile;
  online: boolean | null;
  apiData: TileMetrics | null;
}

export default function TileMinimal({ tile, online, apiData }: Props) {
  const hostname = (() => {
    try {
      return new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname;
    } catch {
      return tile.url;
    }
  })();

  return (
    <div className="relative flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-[1.15rem] border border-line/45 bg-card/65 p-4 text-center shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-card hover:shadow-xl hover:shadow-accent/5">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line/50 bg-surface">
        <FaviconImg url={tile.url} name={tile.name} size={30} explicitIconUrl={tile.icon_url} />
      </span>
      <span className="w-full truncate text-[12px] font-semibold text-t1">{tile.name}</span>
      {tile.show_address && <span className="w-full truncate text-[9px] font-medium text-t3">{hostname}</span>}
      {apiData?.status === "ok" && (
        <span className="rounded-full border border-line/45 bg-surface px-2 py-0.5 text-[10px] font-medium tabular-nums text-t3">{apiData.activeStreams ?? 0} streams</span>
      )}
      <span className="absolute top-2 right-2">
        <StatusDot online={online === true} size="sm" />
      </span>
    </div>
  );
}
