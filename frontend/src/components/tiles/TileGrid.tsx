import { motion } from "framer-motion";
import { useState } from "react";
import { Tile, useTiles } from "../../hooks/useTiles";
import { useSettingsStore } from "../../store/useSettingsStore";
import TileWrapper from "./TileWrapper";

interface Props {
  editMode?: boolean;
  tilesOverride?: Tile[];
  onReorder?: (tiles: Tile[]) => void;
}

export default function TileGrid({ editMode = false, tilesOverride, onReorder }: Props) {
  const { data: tiles, isLoading } = useTiles();
  const widgetStyle = useSettingsStore((s) => s.widgetStyle);
  const [dragTileId, setDragTileId] = useState<number | null>(null);
  const effectiveTiles = tilesOverride ?? tiles;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!effectiveTiles?.length) return null;

  const gridCols =
    widgetStyle === "compact"
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    : widgetStyle === "minimal"
      ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

  const moveTileBefore = (target: Tile) => {
    if (!dragTileId || dragTileId === target.id || !effectiveTiles) return;
    const dragged = effectiveTiles.find((tile) => tile.id === dragTileId);
    if (!dragged) return;
    const ordered = effectiveTiles.filter((tile) => tile.id !== dragTileId);
    const targetIndex = ordered.findIndex((tile) => tile.id === target.id);
    ordered.splice(targetIndex >= 0 ? targetIndex : ordered.length, 0, dragged);
    onReorder?.(ordered);
    setDragTileId(null);
  };

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {effectiveTiles.map((tile, i) => (
        <motion.div
          key={tile.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <TileWrapper
            tile={tile}
            editMode={editMode}
            draggable={editMode}
            onDragStart={() => setDragTileId(tile.id)}
            onDragOver={(event) => editMode && event.preventDefault()}
            onDrop={() => moveTileBefore(tile)}
          />
        </motion.div>
      ))}
    </div>
  );
}
