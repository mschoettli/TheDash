import { motion } from "framer-motion";
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

  const moveTileBefore = (_target: Tile) => {
    // Legacy HTML5 drag — kept for compatibility but replaced by dnd-kit in DashboardPage
    void onReorder;
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
          />
        </motion.div>
      ))}
    </div>
  );
}
