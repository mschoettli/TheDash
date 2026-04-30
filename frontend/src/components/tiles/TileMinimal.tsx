// TileMinimal — icon grid style
// Vertical: large icon centered, name below. Like an app drawer / home screen icon.
// No URL shown (minimal = minimal). Status dot in top-right corner.

import { Tile, TileMetrics } from "../../hooks/useTiles";
import FaviconImg from "../ui/FaviconImg";
import StatusDot, { OnlineStatus } from "../ui/StatusDot";

interface Props {
  tile: Tile;
  status: OnlineStatus;
  apiData: TileMetrics | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function TileMinimal({ tile, status, apiData: _ }: Props) {
  return (
    <div className="tile-glass relative flex h-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-line/45 px-2 py-2 text-center transition-colors duration-150 hover:border-accent/40">
      {/* Top accent line — signature of this style */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-accent/70" />

      {/* Large centered icon — no border box, just the image */}
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/70 ring-1 ring-line/40">
        <FaviconImg url={tile.url} name={tile.name} size={22} explicitIconUrl={tile.icon_url} />
      </span>

      {/* Name */}
      <span className="w-full truncate text-[11px] font-semibold leading-tight text-t1">
        {tile.name}
      </span>

      {/* Status dot — top-right */}
      <span className="absolute right-1.5 top-2">
        <StatusDot status={status} size="sm" />
      </span>
    </div>
  );
}
