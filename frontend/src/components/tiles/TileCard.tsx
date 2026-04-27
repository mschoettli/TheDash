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
  const statusLabel = online === null ? "Check" : online ? "Online" : "Offline";

  return (
    <div className="group relative flex h-full min-h-[184px] flex-col overflow-hidden rounded-[1.35rem] border border-line/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-2xl hover:shadow-accent/10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-accent/10 to-transparent opacity-70" />

      <div className="relative flex flex-1 flex-col p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line/60 bg-surface shadow-inner shadow-white/5">
            <FaviconImg url={tile.url} name={tile.name} size={34} explicitIconUrl={tile.icon_url} />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line/50 bg-surface/90 px-2 py-1">
            <StatusDot online={online === true} size="sm" />
            <span className="text-[10px] font-medium text-t3">{statusLabel}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-5 text-t1">{tile.name}</div>
          {tile.show_address && <div className="mt-1 truncate text-[11px] font-medium text-t3">{hostname}</div>}
        </div>

        <div className="mt-4">
          {hasMetrics ? (
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Series", val: apiData.seriesCount },
                { label: "Movies", val: apiData.movieCount },
                { label: "Streams", val: apiData.activeStreams },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl border border-line/45 bg-surface px-2 py-2 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-t3">{label}</div>
                  <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-t1">{val ?? "-"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[54px] rounded-xl border border-line/35 bg-surface/45" />
          )}

          {apiData?.status === "error" && (
            <div className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-500">
              API unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
