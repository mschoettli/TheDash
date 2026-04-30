// TileBanner — featured / hero style
// Thick left gradient bar, background tint, bold name. For important services.
// Single status indicator (text badge for offline/slow, dot for online).

import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot, { OnlineStatus } from "../ui/StatusDot";

interface Props {
  tile: Tile;
  status: OnlineStatus;
  apiData: TileMetrics | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function TileBanner({ tile, status, apiData: _ }: Props) {
  const hostname = (() => {
    try {
      return new URL(tile.url.startsWith("http") ? tile.url : `http://${tile.url}`).hostname;
    } catch {
      return tile.url;
    }
  })();

  return (
    <div className="tile-glass group relative flex h-full items-center overflow-hidden rounded-xl border border-line/60 pr-3 shadow-sm transition-colors duration-150 hover:border-accent/45">
      {/* Full-height left accent bar — signature of this style */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-accent via-accent/80 to-accent/30" />
      {/* Background tint fading right */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/10 via-accent/4 to-transparent" />

      {/* Icon */}
      <div className="relative ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/50 bg-surface">
        <FaviconImg url={tile.url} name={tile.name} size={22} explicitIconUrl={tile.icon_url} />
      </div>

      {/* Text */}
      <div className="relative ml-3 min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold leading-tight text-t1">{tile.name}</div>
        {tile.show_address && (
          <div className="truncate text-[10px] text-t3">{hostname}</div>
        )}
      </div>

      {/* Status — text badge for errors, dot for normal */}
      <div className="relative ml-2 shrink-0">
        {status === "offline" ? (
          <span className="rounded border border-rose-400/30 bg-rose-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-400">
            Offline
          </span>
        ) : status === "slow" ? (
          <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
            Slow
          </span>
        ) : (
          <StatusDot status={status} size="sm" />
        )}
      </div>
    </div>
  );
}
