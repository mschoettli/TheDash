import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { Tile, TileMetrics, fetchTileMetrics } from "../../hooks/useTiles";
import { useSettingsStore } from "../../store/useSettingsStore";
import TileCard from "./TileCard";
import TileCompact from "./TileCompact";
import TileMinimal from "./TileMinimal";
import TileEditModal from "./TileEditModal";

interface Props {
  tile: Tile;
  editMode?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: () => void;
}

export default function TileWrapper({ tile, editMode = false, draggable = false, onDragStart, onDragOver, onDrop }: Props) {
  const globalStyle = useSettingsStore((s) => s.widgetStyle);
  const effectiveStyle = tile.style ?? globalStyle;

  const [online, setOnline] = useState<boolean | null>(null);
  const [apiData, setApiData] = useState<TileMetrics | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        abortRef.current = new AbortController();
        const timeout = setTimeout(() => abortRef.current?.abort(), 5000);
        await fetch(tile.url, { mode: "no-cors", signal: abortRef.current.signal });
        clearTimeout(timeout);
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }

    async function fetchMetrics() {
      if (tile.provider === "none") {
        setApiData(null);
        return;
      }

      try {
        const data = await fetchTileMetrics(tile.id);
        if (!cancelled) setApiData(data);
      } catch {
        if (!cancelled) {
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

    void check();
    void fetchMetrics();
    const id = setInterval(() => {
      void check();
      void fetchMetrics();
    }, 60_000);

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      clearInterval(id);
    };
  }, [tile.id, tile.url, tile.provider]);

  const tileProps = { tile, online, apiData };

  return (
    <div
      className={`relative group ${editMode ? "rounded-2xl ring-1 ring-accent/20" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <a href={tile.url} target="_blank" rel="noopener noreferrer" className="block">
        {effectiveStyle === "compact" ? (
          <TileCompact {...tileProps} />
        ) : effectiveStyle === "minimal" ? (
          <TileMinimal {...tileProps} />
        ) : (
          <TileCard {...tileProps} />
        )}
      </a>
      <button
        onClick={(e) => {
          e.preventDefault();
          setEditOpen(true);
        }}
        className={`absolute top-2 right-2 p-1.5 rounded-lg bg-surface/90 border border-line/50 text-t3 hover:text-accent transition-all ${editMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        title="Bearbeiten"
      >
        <Pencil size={13} />
      </button>
      <TileEditModal open={editOpen} onClose={() => setEditOpen(false)} tile={tile} />
    </div>
  );
}
