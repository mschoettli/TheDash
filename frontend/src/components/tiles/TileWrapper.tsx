import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { Tile, TileMetrics, fetchTileMetrics } from "../../hooks/useTiles";
import { useSettingsStore } from "../../store/useSettingsStore";
import TileCard from "./TileCard";
import TileCompact from "./TileCompact";
import TileMinimal from "./TileMinimal";
import TileBanner from "./TileBanner";
import TileMetric from "./TileMetric";
import TileEditModal from "./TileEditModal";
import { OnlineStatus } from "../ui/StatusDot";

export type { OnlineStatus };

interface Props {
  tile: Tile;
  editMode?: boolean;
}

export default function TileWrapper({ tile, editMode = false }: Props) {
  const globalStyle = useSettingsStore((s) => s.widgetStyle);
  const effectiveStyle = tile.style ?? globalStyle;

  const [status, setStatus] = useState<OnlineStatus>("checking");
  const [apiData, setApiData] = useState<TileMetrics | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkOnline() {
      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const timeout = setTimeout(() => abortRef.current?.abort(), 5000);
        const start = performance.now();
        await fetch(tile.url, { mode: "no-cors", signal: abortRef.current.signal });
        clearTimeout(timeout);
        const ms = performance.now() - start;
        if (!cancelled && mountedRef.current) {
          setStatus(ms > 2500 ? "slow" : "online");
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setStatus("offline");
        }
      }
    }

    async function fetchMetrics() {
      if (tile.provider === "none") {
        setApiData(null);
        return;
      }
      try {
        const data = await fetchTileMetrics(tile.id);
        if (!cancelled && mountedRef.current) setApiData(data);
      } catch {
        if (!cancelled && mountedRef.current) {
          setApiData({
            status: "error",
            provider: tile.provider,
            seriesCount: null,
            movieCount: null,
            activeStreams: null,
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    }

    void checkOnline();
    void fetchMetrics();
    const id = setInterval(() => {
      void checkOnline();
      void fetchMetrics();
    }, 60_000);

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      clearInterval(id);
    };
  }, [tile.id, tile.url, tile.provider]);

  const tileProps = { tile, status, apiData };

  return (
    <div className={`relative group ${editMode ? "rounded-2xl ring-1 ring-accent/20" : ""}`}>
      <a href={tile.url} target="_blank" rel="noopener noreferrer" className="block">
        {effectiveStyle === "compact" ? (
          <TileCompact {...tileProps} />
        ) : effectiveStyle === "minimal" ? (
          <TileMinimal {...tileProps} />
        ) : effectiveStyle === "banner" ? (
          <TileBanner {...tileProps} />
        ) : effectiveStyle === "metric" ? (
          <TileMetric {...tileProps} />
        ) : (
          <TileCard {...tileProps} />
        )}
      </a>
      <button
        onClick={(e) => {
          e.preventDefault();
          setEditOpen(true);
        }}
        className={`absolute bottom-2 right-2 z-10 rounded-lg border border-line/50 bg-surface/90 p-1.5 text-t3 shadow-sm transition-all hover:text-accent ${
          editMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        title="Bearbeiten"
      >
        <Pencil size={13} />
      </button>
      <TileEditModal open={editOpen} onClose={() => setEditOpen(false)} tile={tile} />
    </div>
  );
}
