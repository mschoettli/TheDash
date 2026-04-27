import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot from "../ui/StatusDot";

interface Props {
  tile: Tile;
  online: boolean | null;
  apiData: TileMetrics | null;
}

export default function TileCard({ tile, online, apiData }: Props) {
  const hostname = (() => {
    try {
      return new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname;
    } catch {
      return tile.url;
    }
  })();
  const hasMetrics = apiData?.status === "ok";

  return (
    <div className="group relative flex min-h-[92px] overflow-hidden rounded-xl border border-line/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-xl hover:shadow-accent/10">
      <div className="absolute inset-y-0 left-0 w-1 bg-accent/70 opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-70" />

      <div className="relative flex min-w-0 flex-1 items-center gap-3 p-3 pl-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line/55 bg-surface shadow-inner shadow-white/5">
          <FaviconImg url={tile.url} name={tile.name} size={30} explicitIconUrl={tile.icon_url} />
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold leading-5 text-t1">{tile.name}</div>
              {tile.show_address && <div className="truncate text-[10px] font-medium text-t3">{hostname}</div>}
            </div>
            <span className="mt-1 shrink-0">
              <StatusDot online={online === true} size="sm" />
            </span>
          </div>

          <div className="mt-2 min-h-[20px]">
            {hasMetrics ? (
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {[
                  { label: "Series", val: apiData.seriesCount },
                  { label: "Movies", val: apiData.movieCount },
                  { label: "Streams", val: apiData.activeStreams },
                ].map(({ label, val }) => (
                  <span key={label} className="rounded-md border border-line/45 bg-surface/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-t3">
                    {label} <span className="text-t1">{val ?? "-"}</span>
                  </span>
                ))}
              </div>
            ) : apiData?.status === "error" ? (
              <span className="rounded-md border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-500">
                API unavailable
              </span>
            ) : (
              <div className="h-5" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
