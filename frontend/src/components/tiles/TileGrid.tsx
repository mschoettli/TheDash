import { motion } from "framer-motion";
import { useTiles } from "../../hooks/useTiles";
import { useSettingsStore } from "../../store/useSettingsStore";
import TileWrapper from "./TileWrapper";

export default function TileGrid() {
  const { data: tiles, isLoading } = useTiles();
  const widgetStyle = useSettingsStore((s) => s.widgetStyle);

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

  if (!tiles?.length) return null;

  const gridCols =
    widgetStyle === "compact"
      ? "grid-cols-1 sm:grid-cols-2"
      : widgetStyle === "minimal"
      ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <TileWrapper tile={tile} />
        </motion.div>
      ))}
    </div>
  );
}
