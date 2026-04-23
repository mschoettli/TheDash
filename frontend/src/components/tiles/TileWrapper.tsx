import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { Tile } from "../../hooks/useTiles";
import { useSettingsStore } from "../../store/useSettingsStore";
import TileCard from "./TileCard";
import TileCompact from "./TileCompact";
import TileMinimal from "./TileMinimal";
import TileEditModal from "./TileEditModal";

interface Props {
  tile: Tile;
}

export default function TileWrapper({ tile }: Props) {
  const globalStyle = useSettingsStore((s) => s.widgetStyle);
  const effectiveStyle = tile.style !== "card" ? tile.style : globalStyle;

  const [online, setOnline] = useState<boolean | null>(null);
  const [apiData, setApiData] = useState<unknown>(null);
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

    async function fetchApi() {
      if (!tile.api_endpoint) return;
      try {
        const res = await fetch(tile.api_endpoint);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setApiData(data);
        }
      } catch {
        // ignore
      }
    }

    check();
    fetchApi();
    const id = setInterval(() => { check(); fetchApi(); }, 60_000);

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      clearInterval(id);
    };
  }, [tile.url, tile.api_endpoint]);

  const tileProps = { tile, online, apiData };

  return (
    <div className="relative group">
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
        onClick={(e) => { e.preventDefault(); setEditOpen(true); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/80 dark:bg-slate-700/80 shadow text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-all"
        title="Bearbeiten"
      >
        <Pencil size={13} />
      </button>
      <TileEditModal open={editOpen} onClose={() => setEditOpen(false)} tile={tile} />
    </div>
  );
}
