import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Container,
  Eye,
  FolderPlus,
  GripVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../components/ui/Modal";
import IconBadge from "../components/ui/IconBadge";
import IconPicker from "../components/ui/IconPicker";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import FaviconImg from "../components/ui/FaviconImg";
import TileWrapper from "../components/tiles/TileWrapper";
import TileEditModal from "../components/tiles/TileEditModal";
import { detectIconKey, iconValue } from "../lib/iconRegistry";
import {
  DashboardItem,
  DashboardSection,
  useCreateDashboardSection,
  useDashboard,
  useReorderDashboard,
} from "../hooks/useDashboard";
import { Tile, useTiles } from "../hooks/useTiles";
import { DiscoveredContainer, useDockerAction, useDockerDiscovery } from "../hooks/useDockerDiscovery";
import {
  useCreateWidget,
  useDeleteWidget,
  useUpdateWidget,
  useWidgetMetrics,
  useWidgetCatalog,
  useWidgets,
  WidgetCatalogItem,
  WidgetInstance,
} from "../hooks/useWidgets";

// ─── Constants ────────────────────────────────────────────────────────────────

const input =
  "w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 placeholder:text-t3";

const ACTIVE_WIDGET_TYPES = new Set([
  "docker", "system", "media", "downloads", "network",
  "rss", "weather", "calendar", "releases", "stocks",
]);

const WIDGET_CONFIG: Record<string, { field?: string; placeholder?: string; required?: boolean }> = {
  docker: {}, system: {},
  media: { field: "API URL", placeholder: "http://jellyfin:8096", required: true },
  downloads: { field: "Client URL", placeholder: "http://qbittorrent:8080", required: true },
  network: { field: "Service URL", placeholder: "http://adguard:3000", required: true },
  rss: { field: "Feed URL", placeholder: "https://example.com/feed.xml", required: true },
  weather: { field: "Location", placeholder: "Zurich, CH", required: true },
  calendar: { field: "Calendar URL", placeholder: "https://calendar.example/ics", required: true },
  releases: { field: "Repository", placeholder: "owner/repository", required: true },
  stocks: { field: "Symbol", placeholder: "AAPL", required: true },
};

// Size presets (w = column span, h = row span)
const SPAN_PRESETS = [
  { label: "1×1", w: 1, h: 1 },
  { label: "2×1", w: 2, h: 1 },
  { label: "3×1", w: 3, h: 1 },
  { label: "2×2", w: 2, h: 2 },
  { label: "4×1", w: 4, h: 1 },
] as const;

// Section accent colors
const SECTION_COLORS: { label: string; value: string | null; dot: string }[] = [
  { label: "Default", value: null, dot: "bg-accent" },
  { label: "Violet", value: "139 92 246", dot: "bg-violet-400" },
  { label: "Emerald", value: "52 211 153", dot: "bg-emerald-400" },
  { label: "Rose", value: "251 113 133", dot: "bg-rose-400" },
  { label: "Amber", value: "251 191 36", dot: "bg-amber-400" },
  { label: "Blue", value: "96 165 250", dot: "bg-blue-400" },
];

// Available column counts for sections
const GRID_COLS_OPTIONS = [2, 3, 4, 6] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemPos { col: number; row: number; w: number; h: number; }
interface HoveredCell { sectionId: number; col: number; row: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSectionMeta(section: DashboardSection) {
  return {
    color: (section.layout.color as string | null) ?? null,
    gridCols: Number(section.layout.gridCols ?? 4),
  };
}

/** Pack items into a grid. Items with explicit col/row keep their position;
 *  others are auto-placed in reading order. */
function autoAssignPositions(items: DashboardItem[], gridCols: number): Map<number, ItemPos> {
  const result = new Map<number, ItemPos>();
  const used = new Set<string>(); // "col,row"

  const isFree = (col: number, row: number, w: number, h: number): boolean => {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (used.has(`${c},${r}`) || c >= gridCols) return false;
      }
    }
    return true;
  };
  const markUsed = (col: number, row: number, w: number, h: number) => {
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++)
        used.add(`${c},${r}`);
  };

  // 1st pass: items with explicit positions
  for (const item of items) {
    if (item.layout?.col != null && item.layout?.row != null) {
      const pos: ItemPos = {
        col: Number(item.layout.col),
        row: Number(item.layout.row),
        w: Math.min(Number(item.layout.w ?? item.layout.spanCol ?? 1), gridCols),
        h: Number(item.layout.h ?? item.layout.spanRow ?? 1),
      };
      result.set(item.id, pos);
      markUsed(pos.col, pos.row, pos.w, pos.h);
    }
  }

  // 2nd pass: auto-place the rest
  let autoRow = 0, autoCol = 0;
  for (const item of items) {
    if (result.has(item.id)) continue;
    const w = Math.min(Number(item.layout?.w ?? item.layout?.spanCol ?? 1), gridCols);
    const h = Number(item.layout?.h ?? item.layout?.spanRow ?? 1);
    let placed = false;
    while (!placed) {
      if (autoCol + w > gridCols) { autoCol = 0; autoRow++; }
      if (isFree(autoCol, autoRow, w, h)) {
        result.set(item.id, { col: autoCol, row: autoRow, w, h });
        markUsed(autoCol, autoRow, w, h);
        autoCol += w;
        placed = true;
      } else {
        autoCol++;
        if (autoCol >= gridCols) { autoCol = 0; autoRow++; }
      }
    }
  }
  return result;
}

function sortableSectionId(id: number) { return `section:${id}`; }
function numericId(id: string) { return Number(id.split(":")[1]); }

function hostFromUrl(url: string | null) {
  if (!url) return "";
  try { return new URL(url).host; } catch { return url; }
}
function widgetEndpointLabel(widget: WidgetInstance) {
  const e = String(widget.config.endpoint ?? "").trim();
  if (!e || widget.config.showAddress === false) return "";
  return hostFromUrl(e);
}
function requiresEndpoint(type: string) {
  return Boolean(WIDGET_CONFIG[type]?.required);
}

// ─── Widget Content ────────────────────────────────────────────────────────────

function WidgetContent({ widget }: { widget: WidgetInstance }) {
  const { t } = useTranslation();
  const endpoint = String(widget.config.endpoint ?? "").trim();
  const needsSetup = requiresEndpoint(widget.type) && !endpoint;
  const { data: metrics, isLoading } = useWidgetMetrics(
    widget.id,
    !needsSetup &&
      ["docker", "system", "rss", "weather", "media", "downloads", "network", "calendar", "releases", "stocks"].includes(widget.type)
  );
  const notes = String(widget.config.notes ?? "").trim();
  const label = widgetEndpointLabel(widget);

  if (needsSetup) return (
    <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[12px] font-medium text-amber-700 dark:text-amber-300">
      {t("widgets.setup_required")}
    </div>
  );
  if (metrics?.status === "error") return (
    <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[12px] font-medium text-rose-500">
      {metrics.error ?? t("widgets.unavailable")}
    </div>
  );
  if (isLoading && !metrics) return (
    <div className="mt-4 rounded-xl border border-line/40 bg-card px-3 py-2 text-[12px] text-t3">{t("widgets.loading")}</div>
  );

  const cards = metrics?.cards ?? [];
  return (
    <div className="mt-4 space-y-3">
      {label && <div className="truncate rounded-xl border border-line/45 bg-card px-3 py-1.5 text-[11px] font-medium text-t3">{label}</div>}
      {cards.length ? (
        <div className="grid grid-cols-2 gap-2">
          {cards.slice(0, 4).map((item) => (
            <div key={`${item.label}-${item.value}`} className="min-h-[64px] rounded-2xl border border-line/45 bg-card px-3 py-2.5">
              <div className="mb-1 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-t3">{item.label}</div>
              <div className="truncate text-[13px] font-semibold tabular-nums text-t1">{item.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-line/40 bg-card px-3 py-2 text-[12px] text-t3">{t("widgets.no_data")}</div>
      )}
      {notes && <p className="text-[12px] leading-relaxed text-t3 line-clamp-2">{notes}</p>}
    </div>
  );
}

// ─── Widget Tile ───────────────────────────────────────────────────────────────

function WidgetTile({ widget, editMode, onEdit, onDelete }: {
  widget: WidgetInstance; editMode: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className={`glass-panel relative h-full min-h-[176px] overflow-hidden rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-xl hover:shadow-accent/10 ${editMode ? "border-accent/25 ring-1 ring-accent/10" : "border-line/60"}`}>
      <div className="absolute inset-y-0 left-0 w-1 bg-accent/70 opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-70" />
      <div className="relative flex items-start justify-between gap-3 pl-1">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line/55 bg-surface shadow-inner shadow-white/5">
            <IconBadge value={String(widget.config.icon ?? "")} name={widget.title} size={30} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold leading-5 text-t1">{widget.title}</div>
            <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-t3">{widget.type}</div>
          </div>
        </div>
        {editMode && (
          <div className="flex shrink-0 gap-1">
            <button onClick={onEdit} className="rounded-lg border border-line/45 bg-surface/90 p-1.5 text-t3 hover:text-accent"><Pencil size={13} /></button>
            <button onClick={onDelete} className="rounded-lg border border-line/45 bg-surface/90 p-1.5 text-t3 hover:text-rose-500"><Trash2 size={13} /></button>
          </div>
        )}
      </div>
      <div className="relative pl-1"><WidgetContent widget={widget} /></div>
    </div>
  );
}

// ─── Drag Preview ──────────────────────────────────────────────────────────────

function DragPreviewTile({ tile, widget, section }: {
  tile?: Tile; widget?: WidgetInstance; section?: DashboardSection;
}) {
  if (section) return (
    <div className="glass-panel flex items-center gap-3 rounded-xl border border-accent/50 px-4 py-3 shadow-2xl shadow-accent/20">
      <GripVertical size={13} className="text-accent" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-accent">{section.title}</span>
    </div>
  );
  if (tile) return (
    <div className="tile-glass flex items-center gap-3 rounded-xl border border-accent/50 px-3 py-2.5 shadow-2xl shadow-accent/20">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/55 bg-surface">
        <FaviconImg url={tile.url} name={tile.name} size={22} explicitIconUrl={tile.icon_url} />
      </span>
      <span className="text-[13px] font-semibold text-t1">{tile.name}</span>
    </div>
  );
  if (widget) return (
    <div className="glass-panel flex items-center gap-3 rounded-xl border border-accent/50 px-3 py-2.5 shadow-2xl shadow-accent/20">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/55 bg-surface">
        <IconBadge value={String(widget.config.icon ?? "")} name={widget.title} size={22} />
      </span>
      <span className="text-[13px] font-semibold text-t1">{widget.title}</span>
    </div>
  );
  return null;
}

// ─── Grid Drop Cell ────────────────────────────────────────────────────────────

function GridDropCell({ sectionId, col, row }: { sectionId: number; col: number; row: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${sectionId}:${col}:${row}`,
    data: { type: "cell", sectionId, col, row },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ gridColumn: col + 1, gridRow: row + 1 }}
      className={`rounded-xl border-2 border-dashed transition-all duration-100 ${
        isOver
          ? "border-accent bg-accent/15 shadow-inner shadow-accent/10"
          : "border-line/15 bg-transparent hover:border-line/30"
      }`}
    />
  );
}

// ─── Draggable Dashboard Item ──────────────────────────────────────────────────

function DraggableItem({
  item, pos, gridCols, editMode,
  tile, widget,
  onEditWidget, onDeleteWidget, onSizeChange,
}: {
  item: DashboardItem;
  pos: ItemPos;
  gridCols: number;
  editMode: boolean;
  tile?: Tile;
  widget?: WidgetInstance;
  onEditWidget: (w: WidgetInstance) => void;
  onDeleteWidget: (w: WidgetInstance) => void;
  onSizeChange: (itemId: number, w: number, h: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `item:${item.id}`,
    disabled: !editMode,
    data: { type: "item", sectionId: item.section_id, w: pos.w, h: pos.h },
  });

  if (item.item_type === "tile" && !tile) return null;
  if (item.item_type === "widget" && !widget) return null;

  const clampedW = Math.min(pos.w, gridCols);

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `${pos.col + 1} / span ${clampedW}`,
        gridRow: `${pos.row + 1} / span ${pos.h}`,
        zIndex: isDragging ? 1 : 20,
        opacity: isDragging ? 0.15 : 1,
        transition: "opacity 120ms",
      }}
      className="relative"
    >
      {/* Drag handle */}
      {editMode && (
        <button
          className="absolute left-2 top-2 z-30 cursor-grab rounded-lg border border-line/50 bg-surface/95 p-1.5 text-t3 shadow-sm transition-colors hover:text-accent active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag"
        >
          <GripVertical size={13} />
        </button>
      )}

      {/* Size picker */}
      {editMode && (
        <div className="absolute bottom-2 left-10 z-30 flex gap-0.5 rounded-lg border border-line/50 bg-surface/95 p-1 shadow-sm backdrop-blur-sm">
          {SPAN_PRESETS.map(({ label, w, h }) => (
            <button
              key={label}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSizeChange(item.id, w, h); }}
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors ${
                pos.w === w && pos.h === h ? "bg-accent text-bg" : "text-t3 hover:bg-line/40 hover:text-t1"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="h-full">
        {item.item_type === "tile" && tile ? (
          <TileWrapper tile={tile} editMode={editMode} />
        ) : widget ? (
          <WidgetTile
            widget={widget}
            editMode={editMode}
            onEdit={() => onEditWidget(widget)}
            onDelete={() => onDeleteWidget(widget)}
          />
        ) : null}
      </div>
    </div>
  );
}

// ─── Sortable Section ──────────────────────────────────────────────────────────

function SortableSection({
  section, tilesById, widgetsById, editMode,
  isCollapsed, onToggleCollapse,
  onEditWidget, onDeleteWidget, onSizeChange,
  onUpdateLayout, onChangeGridCols, onRename, onDelete,
  hoveredCell, activeDragSize,
  isLast,
}: {
  section: DashboardSection;
  tilesById: Map<number, Tile>;
  widgetsById: Map<number, WidgetInstance>;
  editMode: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onEditWidget: (w: WidgetInstance) => void;
  onDeleteWidget: (w: WidgetInstance) => void;
  onSizeChange: (itemId: number, w: number, h: number) => void;
  onUpdateLayout: (patch: Record<string, unknown>) => void;
  onChangeGridCols: (cols: number) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  hoveredCell: HoveredCell | null;
  activeDragSize: { w: number; h: number } | null;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableSectionId(section.id),
    disabled: !editMode,
    data: { type: "section" },
  });

  const [localTitle, setLocalTitle] = useState(section.title);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => { setLocalTitle(section.title); }, [section.title]);

  const { color, gridCols } = getSectionMeta(section);
  const accentStyle = color ? ({ "--accent": color } as React.CSSProperties) : undefined;
  const sectionStyle = { transform: CSS.Transform.toString(transform), transition, ...accentStyle };

  // Compute item positions with explicit placement
  const itemPositions = useMemo(
    () => autoAssignPositions(section.items, gridCols),
    [section.items, gridCols]
  );

  // How many drop-cell rows to show (items + 2 extra empty rows)
  const maxRow = Math.max(2, ...Array.from(itemPositions.values()).map((p) => p.row + p.h)) + 1;

  // Ghost highlight for the hovered drop cell (shows item size)
  const ghost = (hoveredCell?.sectionId === section.id && activeDragSize)
    ? {
        col: hoveredCell.col,
        row: hoveredCell.row,
        w: Math.min(activeDragSize.w, gridCols - hoveredCell.col),
        h: activeDragSize.h,
      }
    : null;

  return (
    <section
      ref={setNodeRef}
      style={sectionStyle}
      className={isDragging ? "opacity-50" : ""}
    >
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2 px-1">
        {editMode && (
          <button
            className="shrink-0 cursor-grab rounded-md p-1 text-t3 transition-colors hover:text-accent active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag section"
          >
            <GripVertical size={13} />
          </button>
        )}

        {color && <div className="h-3 w-1.5 shrink-0 rounded-full bg-accent/80" />}

        {editMode ? (
          <input
            className="min-w-0 flex-1 border-b border-transparent bg-transparent text-[11px] font-semibold uppercase tracking-wider text-t2 outline-none transition-colors focus:border-accent/50"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => onRename(localTitle)}
            onKeyDown={(e) => e.key === "Enter" && onRename(localTitle)}
          />
        ) : (
          <button
            onClick={onToggleCollapse}
            className="label-xs flex min-w-0 items-center gap-1.5 truncate text-left transition-colors hover:text-t1"
          >
            {section.title}
            <span className="text-t3">{isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}</span>
          </button>
        )}

        <span className="shrink-0 text-[11px] text-t3">{section.items.length}</span>

        {editMode && (
          <div className="flex shrink-0 items-center gap-1">
            {/* Grid column picker */}
            <div className="flex overflow-hidden rounded-lg border border-line/50 text-[10px] font-bold">
              {GRID_COLS_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => onChangeGridCols(n)}
                  className={`px-2 py-1.5 transition-colors ${
                    gridCols === n ? "bg-accent text-bg" : "text-t3 hover:bg-line/30 hover:text-t1"
                  }`}
                  title={`${n} Spalten`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Color picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker((v) => !v)}
                className="rounded-lg border border-line/50 p-1.5 text-t3 transition-colors hover:text-t1"
                title="Sektionsfarbe"
              >
                <span className="block h-3 w-3 rounded-full bg-accent/80" />
              </button>
              {showColorPicker && (
                <div className="absolute right-0 top-full z-30 mt-1.5 flex gap-1.5 rounded-xl border border-line/60 bg-surface p-2 shadow-2xl">
                  {SECTION_COLORS.map((c) => (
                    <button
                      key={c.label}
                      title={c.label}
                      onClick={() => { onUpdateLayout({ color: c.value }); setShowColorPicker(false); }}
                      className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${c.dot} ${color === c.value ? "scale-110 border-t1" : "border-transparent"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Collapse */}
            <button onClick={onToggleCollapse} className="rounded-md p-1 text-t3 transition-colors hover:text-t1">
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Delete */}
            <button onClick={onDelete} className="rounded-md p-1 text-t3 transition-colors hover:text-rose-500">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Free-form item grid */}
      {!isCollapsed && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gridAutoRows: "minmax(120px, auto)",
            gap: "12px",
            minHeight: "140px",
          }}
        >
          {/* Drop cells — rendered below items in edit mode */}
          {editMode &&
            Array.from({ length: maxRow }, (_, row) =>
              Array.from({ length: gridCols }, (_, col) => (
                <GridDropCell key={`${col}-${row}`} sectionId={section.id} col={col} row={row} />
              ))
            )}

          {/* Ghost preview — shows where the item will land */}
          {ghost && (
            <div
              style={{
                gridColumn: `${ghost.col + 1} / span ${ghost.w}`,
                gridRow: `${ghost.row + 1} / span ${ghost.h}`,
                zIndex: 15,
                pointerEvents: "none",
              }}
              className="rounded-xl bg-accent/20 ring-2 ring-inset ring-accent/60"
            />
          )}

          {/* Items */}
          {section.items.map((item) => {
            const pos = itemPositions.get(item.id) ?? { col: 0, row: 0, w: 1, h: 1 };
            return (
              <DraggableItem
                key={item.id}
                item={item}
                pos={pos}
                gridCols={gridCols}
                editMode={editMode}
                tile={item.item_type === "tile" ? tilesById.get(item.item_id) : undefined}
                widget={item.item_type === "widget" ? widgetsById.get(item.item_id) : undefined}
                onEditWidget={onEditWidget}
                onDeleteWidget={onDeleteWidget}
                onSizeChange={onSizeChange}
              />
            );
          })}

          {/* Empty state */}
          {!section.items.length && (
            <div
              style={{ gridColumn: `1 / span ${gridCols}`, gridRow: 1, zIndex: 25 }}
              className="flex min-h-[80px] items-center justify-center rounded-xl text-[13px] text-t3"
            >
              {editMode ? t("dashboard.drop_here") : t("dashboard.empty_section")}
            </div>
          )}
        </div>
      )}

      {!isLast && <div className="mb-2 mt-6 border-t border-line/20" />}
    </section>
  );
}

// ─── Widget Edit Modal ─────────────────────────────────────────────────────────

function WidgetEditModal({ open, onClose, widget, catalog }: {
  open: boolean; onClose: () => void;
  widget?: WidgetInstance | null; catalog: WidgetCatalogItem[];
}) {
  const { t } = useTranslation();
  const createWidget = useCreateWidget();
  const updateWidget = useUpdateWidget();
  const [type, setType] = useState(widget?.type ?? catalog[0]?.type ?? "docker");
  const selected = catalog.find((item) => item.type === type) ?? catalog[0];
  const [title, setTitle] = useState(widget?.title ?? selected?.title ?? "");
  const [icon, setIcon] = useState(String(widget?.config?.icon ?? iconValue(detectIconKey(widget?.title ?? selected?.title ?? ""))));
  const [iconTouched, setIconTouched] = useState(false);
  const [endpoint, setEndpoint] = useState(String(widget?.config?.endpoint ?? ""));
  const [provider, setProvider] = useState(String(widget?.config?.provider ?? "jellyfin"));
  const [client, setClient] = useState(String(widget?.config?.client ?? "qbittorrent"));
  const [username, setUsername] = useState(String(widget?.config?.username ?? ""));
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState(String(widget?.config?.apiKey ?? ""));
  const [notes, setNotes] = useState(String(widget?.config?.notes ?? ""));
  const [showAddress, setShowAddress] = useState(Boolean(widget?.config?.showAddress ?? true));
  const [saveError, setSaveError] = useState<string | null>(null);
  const config = WIDGET_CONFIG[type] ?? {};
  const isSaving = createWidget.isPending || updateWidget.isPending;

  useEffect(() => {
    if (!open) return;
    const current = widget ? catalog.find((item) => item.type === widget.type) : selected;
    setType(widget?.type ?? current?.type ?? "docker");
    setTitle(widget?.title ?? current?.title ?? "");
    setIcon(String(widget?.config?.icon ?? iconValue(detectIconKey(widget?.title ?? current?.title ?? ""))));
    setIconTouched(false);
    setEndpoint(String(widget?.config?.endpoint ?? ""));
    setProvider(String(widget?.config?.provider ?? "jellyfin"));
    setClient(String(widget?.config?.client ?? "qbittorrent"));
    setUsername(String(widget?.config?.username ?? ""));
    setPassword("");
    setApiKey("");
    setNotes(String(widget?.config?.notes ?? ""));
    setShowAddress(Boolean(widget?.config?.showAddress ?? true));
    setSaveError(null);
  }, [open, widget, catalog, selected]);

  useEffect(() => {
    if (!open || widget || iconTouched || !title.trim()) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/logos/resolve?${new URLSearchParams({ name: title, url: endpoint }).toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((result) => {
          setIcon(result.status === "found" && result.value ? result.value : iconValue(detectIconKey(title)));
        })
        .catch(() => setIcon(iconValue(detectIconKey(title))));
    }, 300);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [open, title, endpoint, widget, iconTouched]);

  const save = () => {
    if (!title.trim() || !type || (config.required && !endpoint.trim())) return;
    setSaveError(null);
    const payload = {
      type, title: title.trim(),
      config: { endpoint: endpoint.trim(), provider, client, username: username.trim(), password: password.trim(), apiKey: apiKey.trim(), notes: notes.trim(), icon, showAddress },
      layout: widget?.layout ?? {},
      section_id: widget?.section_id ?? null,
      sort_order: widget?.sort_order ?? 0,
      is_enabled: true,
    };
    if (widget) {
      updateWidget.mutate(
        { id: widget.id, ...payload },
        {
          onSuccess: onClose,
          onError: (err) => setSaveError(err instanceof Error ? err.message : "Fehler beim Speichern"),
        }
      );
    } else {
      createWidget.mutate(payload, {
        onSuccess: onClose,
        onError: (err) => setSaveError(err instanceof Error ? err.message : "Fehler beim Erstellen"),
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={widget ? t("dashboard.edit_widget") : t("dashboard.add_widget")}>
      <div className="space-y-4">
        <div>
          <div className="label-xs mb-1.5">{t("dashboard.widget_type")}</div>
          <select className={input} value={type} onChange={(e) => {
            const next = catalog.find((item) => item.type === e.target.value);
            setType(e.target.value); setTitle(next?.title ?? ""); setIconTouched(false);
          }}>
            {catalog.map((item) => <option key={item.type} value={item.type}>{item.title} · {item.category}</option>)}
          </select>
        </div>
        <div>
          <div className="label-xs mb-1.5">{t("dashboard.widget_title")}</div>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <IconPicker value={icon} name={title} url={endpoint} onChange={(value) => { setIconTouched(true); setIcon(value); }} />
        {config.field && (
          <div>
            <div className="label-xs mb-1.5">{config.field}{config.required ? " *" : ""}</div>
            <input className={input} value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder={config.placeholder} />
          </div>
        )}
        {type === "media" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="label-xs mb-1.5">{t("dashboard.provider")}</div>
              <select className={input} value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="jellyfin">Jellyfin</option>
                <option value="plex">Plex</option>
                <option value="emby">Emby</option>
              </select>
            </div>
            <div>
              <div className="label-xs mb-1.5">{t("tile.api_key")}</div>
              <input className={input} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={widget?.config?.hasApiKey ? t("dashboard.secret_keep") : "Token"} />
            </div>
          </div>
        )}
        {type === "downloads" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="label-xs mb-1.5">{t("dashboard.client")}</div>
              <select className={input} value={client} onChange={(e) => setClient(e.target.value)}>
                <option value="qbittorrent">qBittorrent</option>
                <option value="sabnzbd">SABnzbd</option>
              </select>
            </div>
            <div>
              <div className="label-xs mb-1.5">{t("tile.api_key")}</div>
              <input className={input} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={widget?.config?.hasApiKey ? t("dashboard.secret_keep") : t("dashboard.optional")} />
            </div>
            <div>
              <div className="label-xs mb-1.5">{t("dashboard.username")}</div>
              <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
            </div>
            <div>
              <div className="label-xs mb-1.5">{t("dashboard.password")}</div>
              <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={widget?.config?.hasPassword ? t("dashboard.secret_keep") : t("dashboard.optional")} />
            </div>
          </div>
        )}
        <label className="flex items-center justify-between rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t2">
          <span>{t("tile.show_address")}</span>
          <input type="checkbox" checked={showAddress} onChange={(e) => setShowAddress(e.target.checked)} />
        </label>
        <div>
          <div className="label-xs mb-1.5">{t("dashboard.widget_notes")}</div>
          <textarea className={`${input} resize-none`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {saveError && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-500">
            <AlertCircle size={13} className="shrink-0" />
            {saveError}
          </div>
        )}
        <button onClick={save} disabled={!title.trim() || (config.required && !endpoint.trim()) || isSaving} className="w-full rounded-lg bg-accent py-2 text-[13px] font-semibold text-bg disabled:opacity-40">
          {isSaving ? "Speichern..." : t("common.save")}
        </button>
      </div>
    </Modal>
  );
}

// ─── Docker Modal ──────────────────────────────────────────────────────────────

function DockerModal({ open, onClose, containers, suggestions, onAdopt, onAction }: {
  open: boolean; onClose: () => void;
  containers: DiscoveredContainer[]; suggestions: DiscoveredContainer[];
  onAdopt: (c: DiscoveredContainer) => void;
  onAction: (c: DiscoveredContainer, a: "start" | "stop" | "restart") => void;
}) {
  const { t } = useTranslation();
  const labeled = suggestions.filter((c) => c.app.is_labeled);
  const discovered = suggestions.filter((c) => !c.app.is_labeled);
  return (
    <Modal open={open} onClose={onClose} title="Docker" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div>
          <div className="label-xs mb-2 flex items-center gap-1.5">
            <Container size={10} /> {t("dashboard.docker")} ({containers.length})
          </div>
          <div className="space-y-1.5">
            {containers.slice(0, 12).map((c) => {
              const isRunning = c.state === "running";
              return (
                <div key={c.id} className="glass-panel flex items-center gap-3 rounded-xl border border-line/50 px-3 py-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${isRunning ? "bg-emerald-400" : "bg-t3"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-t1">{c.app.name}</div>
                    <div className="truncate text-[11px] text-t3">{c.status}{c.ports.length ? ` · ${c.ports.join(", ")}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => onAction(c, "start")} className="rounded p-1 text-t3 hover:bg-line/40 hover:text-emerald-500"><Play size={12} /></button>
                    <button onClick={() => onAction(c, "stop")} className="rounded p-1 text-t3 hover:bg-line/40 hover:text-amber-500"><Pause size={12} /></button>
                    <button onClick={() => onAction(c, "restart")} className="rounded p-1 text-t3 hover:bg-line/40 hover:text-accent"><RefreshCw size={12} /></button>
                  </div>
                </div>
              );
            })}
            {!containers.length && <div className="text-[13px] text-t3">{t("dashboard.no_containers")}</div>}
          </div>
        </div>
        {suggestions.length > 0 && (
          <div className="border-t border-line/30 pt-4">
            <div className="label-xs mb-2 flex items-center gap-1.5"><Eye size={10} /> {t("dashboard.discovered_apps")} ({suggestions.length})</div>
            <div className="space-y-1.5">
              {[...labeled, ...discovered].map((c) => (
                <div key={c.id} className="glass-panel flex items-center gap-3 rounded-xl border border-line/50 px-3 py-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${c.state === "running" ? "bg-emerald-400" : "bg-t3"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-[13px] font-semibold text-t1">{c.app.name}</div>
                      {c.app.is_labeled && <span className="rounded-full border border-accent/30 bg-accent/10 px-1.5 text-[9px] font-semibold text-accent">label</span>}
                    </div>
                    <div className="truncate text-[11px] text-t3">{c.app.href ?? c.image}</div>
                  </div>
                  <button
                    onClick={() => { onAdopt(c); onClose(); }}
                    disabled={!c.app.href}
                    className="rounded-lg border border-line px-2 py-1 text-[12px] text-t2 hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={11} className="inline" /> App
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Add Section Modal ─────────────────────────────────────────────────────────

function AddSectionModal({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void; onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setTitle(""); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  const submit = () => { if (!title.trim()) return; onCreate(title.trim()); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Neue Sektion">
      <div className="space-y-4">
        <div>
          <div className="label-xs mb-1.5">Name</div>
          <input ref={inputRef} className={input} value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="z.B. Medien, Netzwerk, Smart Home..." />
        </div>
        <button onClick={submit} disabled={!title.trim()} className="w-full rounded-lg bg-accent py-2 text-[13px] font-semibold text-bg disabled:opacity-40">
          Erstellen
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation();

  // ─ UI state ─────────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [draftApp, setDraftApp] = useState<Partial<Tile> | null>(null);
  const [defaultSectionId, setDefaultSectionId] = useState<number | null>(null);
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetInstance | null>(null);
  const [deleteWidgetTarget, setDeleteWidgetTarget] = useState<WidgetInstance | null>(null);
  const [dockerActionTarget, setDockerActionTarget] = useState<{ container: DiscoveredContainer; action: "start" | "stop" | "restart" } | null>(null);
  const [dockerModalOpen, setDockerModalOpen] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  // ─ Draft & DnD state ────────────────────────────────────────────────────────
  const [sectionsDraft, setSectionsDraft] = useState<DashboardSection[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<{ w: number; h: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);

  // ─ Data ─────────────────────────────────────────────────────────────────────
  const { data: dashboard } = useDashboard();
  const { data: tiles = [] } = useTiles();
  const { data: discovery } = useDockerDiscovery();
  const { data: widgets = [] } = useWidgets();
  const { data: catalog = [] } = useWidgetCatalog();
  const createSection = useCreateDashboardSection();
  const reorderDashboard = useReorderDashboard();
  const deleteWidget = useDeleteWidget();
  const dockerAction = useDockerAction();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeCatalog = catalog.filter((item) => ACTIVE_WIDGET_TYPES.has(item.type));
  const sections = sectionsDraft ?? dashboard?.sections ?? [];
  const tilesById = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  const widgetsById = useMemo(() => new Map(widgets.map((w) => [w.id, w])), [widgets]);

  const containers = discovery?.containers ?? [];
  const suggestions = containers.filter(
    (c) => !tiles.some((t) => t.url === c.app.href || t.name === c.app.name)
  );

  // ─ Modal helpers ─────────────────────────────────────────────────────────────
  const openAppModal = (initial?: Partial<Tile>, sectionId?: number | null) => {
    setDraftApp(initial ?? null);
    setDefaultSectionId(sectionId ?? sections[0]?.id ?? null);
    setAppModalOpen(true);
  };

  // ─ Edit mode ─────────────────────────────────────────────────────────────────
  const enterEditMode = () => {
    setSectionsDraft(JSON.parse(JSON.stringify(dashboard?.sections ?? [])));
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setSectionsDraft(null);
    setActiveId(null);
    setActiveDragData(null);
    setHoveredCell(null);
    setEditMode(false);
  };

  const saveEditMode = () => {
    const draft = sectionsDraft ?? sections;
    reorderDashboard.mutate({
      // Include title + layout so colors/gridCols persist ✓
      sections: draft.map((s, i) => ({ id: s.id, sort_order: i, title: s.title, layout: s.layout })),
      items: draft.flatMap((s) =>
        s.items.map((item, i) => ({ id: item.id, section_id: s.id, sort_order: i, layout: item.layout }))
      ),
    });
    setSectionsDraft(null);
    setEditMode(false);
  };

  // ─ Draft helpers ─────────────────────────────────────────────────────────────
  const updateItemLayout = (itemId: number, patch: Record<string, unknown>) => {
    setSectionsDraft((prev) =>
      prev?.map((s) => ({
        ...s,
        items: s.items.map((it) => it.id === itemId ? { ...it, layout: { ...it.layout, ...patch } } : it),
      })) ?? null
    );
  };

  const updateSectionLayout = (sectionId: number, patch: Record<string, unknown>) => {
    setSectionsDraft((prev) =>
      prev?.map((s) => s.id === sectionId ? { ...s, layout: { ...s.layout, ...patch } } : s) ?? null
    );
  };

  /** Change gridCols and clear explicit positions so items are re-flowed */
  const changeGridCols = (sectionId: number, gridCols: number) => {
    setSectionsDraft((prev) =>
      prev?.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          layout: { ...s.layout, gridCols },
          // Reset explicit positions — auto-assign will re-pack items into new column count
          items: s.items.map((it) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { col: _col, row: _row, ...rest } = it.layout as Record<string, unknown>;
            return { ...it, layout: rest };
          }),
        };
      }) ?? null
    );
  };

  const renameSectionInDraft = (sectionId: number, title: string) => {
    setSectionsDraft((prev) => prev?.map((s) => s.id === sectionId ? { ...s, title } : s) ?? null);
  };

  const deleteSectionFromDraft = (sectionId: number) => {
    setSectionsDraft((prev) => prev?.filter((s) => s.id !== sectionId) ?? null);
  };

  const toggleCollapse = (id: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const adoptContainer = (container: DiscoveredContainer) => {
    const logo = iconValue(detectIconKey(`${container.app.name} ${container.image} ${container.app.href ?? ""}`));
    openAppModal({
      name: container.app.name, url: container.app.href ?? "",
      icon_url: container.app.icon ?? logo, style: "card",
      provider: "none", api_url: null, api_key: null, show_address: true, sort_order: 0,
    });
  };

  // ─ DnD handlers ──────────────────────────────────────────────────────────────

  const handleDragStart = (e: { active: { id: string | number; data: { current?: Record<string, unknown> } } }) => {
    const id = String(e.active.id);
    setActiveId(id);
    if (id.startsWith("item:") && e.active.data.current) {
      setActiveDragData({
        w: Number(e.active.data.current.w ?? 1),
        h: Number(e.active.data.current.h ?? 1),
      });
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { over, active } = e;
    if (!over || !String(active.id).startsWith("item:")) {
      setHoveredCell(null);
      return;
    }
    const od = over.data.current;
    if (od?.type === "cell") {
      setHoveredCell({
        sectionId: Number(od.sectionId),
        col: Number(od.col),
        row: Number(od.row),
      });
    } else {
      setHoveredCell(null);
    }
  };

  /** Move an item to an explicit grid cell (possibly in a different section) */
  const placeItemAtCell = (itemId: number, targetSectionId: number, col: number, row: number) => {
    setSectionsDraft((prev) => {
      if (!prev) return null;
      const next = JSON.parse(JSON.stringify(prev)) as DashboardSection[];

      // Find and remove item from its current section
      let movedItem: DashboardItem | undefined;
      for (const s of next) {
        const idx = s.items.findIndex((it) => it.id === itemId);
        if (idx >= 0) {
          [movedItem] = s.items.splice(idx, 1);
          break;
        }
      }
      if (!movedItem) return prev;

      // Update position
      movedItem.section_id = targetSectionId;
      movedItem.layout = { ...movedItem.layout, col, row };

      // Add to target section
      const targetSec = next.find((s) => s.id === targetSectionId);
      if (!targetSec) return prev;
      targetSec.items.push(movedItem);

      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDragData(null);
    setHoveredCell(null);

    if (!over || active.id === over.id) return;
    const ak = String(active.id);
    const ok = String(over.id);

    // Section reorder
    if (ak.startsWith("section:") && ok.startsWith("section:")) {
      const cur = [...sections];
      const oi = cur.findIndex((s) => s.id === numericId(ak));
      const ni = cur.findIndex((s) => s.id === numericId(ok));
      if (oi >= 0 && ni >= 0) {
        setSectionsDraft(arrayMove(cur, oi, ni).map((s, i) => ({ ...s, sort_order: i })));
      }
      return;
    }

    // Item dropped onto a grid cell → free position
    if (ak.startsWith("item:") && ok.startsWith("cell:")) {
      const parts = ok.split(":");
      const targetSectionId = Number(parts[1]);
      const targetCol = Number(parts[2]);
      const targetRow = Number(parts[3]);
      placeItemAtCell(numericId(ak), targetSectionId, targetCol, targetRow);
    }
  };

  // ─ Active drag objects ───────────────────────────────────────────────────────
  const activeSection = activeId?.startsWith("section:") ? sections.find((s) => s.id === numericId(activeId)) : undefined;
  const activeItem = activeId?.startsWith("item:") ? sections.flatMap((s) => s.items).find((it) => it.id === numericId(activeId)) : undefined;
  const activeTile = activeItem?.item_type === "tile" ? tilesById.get(activeItem.item_id) : undefined;
  const activeWidget = activeItem?.item_type === "widget" ? widgetsById.get(activeItem.item_id) : undefined;

  const hasDocker = discovery?.status !== "disabled";
  const totalContainers = containers.length;

  /**
   * Custom collision detection:
   * - When dragging an ITEM  → only test "cell:" droppables (pointer-within for precision)
   * - When dragging a SECTION → only test "section:" sortables (closestCenter)
   * This prevents the large section sortable areas from winning over small cell targets.
   */
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const id = String(args.active.id);

    if (id.startsWith("item:")) {
      const cells = args.droppableContainers.filter((c) => String(c.id).startsWith("cell:"));
      const hits = pointerWithin({ ...args, droppableContainers: cells });
      if (hits.length > 0) return hits;
      return rectIntersection({ ...args, droppableContainers: cells });
    }

    if (id.startsWith("section:")) {
      const secs = args.droppableContainers.filter((c) => String(c.id).startsWith("section:"));
      return closestCenter({ ...args, droppableContainers: secs });
    }

    return closestCenter(args);
  }, []);

  // ─ Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 text-t1">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-xs mb-1">{t("dashboard.overview")}</div>
          <h1 className="text-xl font-semibold text-t1">{t("dashboard.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          {hasDocker && (
            <button
              onClick={() => setDockerModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 transition-colors hover:border-accent/40 hover:text-t1"
            >
              <Container size={13} />
              <span className="hidden sm:inline">Docker</span>
              {totalContainers > 0 && (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">{totalContainers}</span>
              )}
              {suggestions.length > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title={`${suggestions.length} suggested`} />
              )}
            </button>
          )}
          {!editMode && (
            <button
              onClick={enterEditMode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-t2 transition-colors hover:border-accent/40 hover:text-t1"
            >
              <SlidersHorizontal size={14} /> {t("dashboard.edit")}
            </button>
          )}
        </div>
      </div>

      {/* Edit mode toolbar */}
      {editMode && (
        <div className="sticky top-0 z-40 -mx-6 flex flex-wrap items-center gap-2 border-b border-line/40 bg-bg/90 px-6 py-2.5 backdrop-blur-md">
          <span className="label-xs mr-1 text-accent">EDIT MODE</span>
          <button
            onClick={() => openAppModal()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90"
          >
            <Plus size={13} /> App
          </button>
          <button
            onClick={() => { setEditingWidget(null); setWidgetModalOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 transition-colors hover:border-accent/40 hover:text-t1"
          >
            <Boxes size={13} /> Widget
          </button>
          <button
            onClick={() => setAddSectionOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 transition-colors hover:border-accent/40 hover:text-t1"
          >
            <FolderPlus size={13} /> Sektion
          </button>
          <div className="flex-1" />
          <button
            onClick={saveEditMode}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-[13px] font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/20"
          >
            <Check size={13} /> Fertig
          </button>
          <button
            onClick={cancelEditMode}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 transition-colors hover:text-t1"
          >
            <X size={13} /> Abbrechen
          </button>
        </div>
      )}

      {/* DnD context — sections sortable; items free-positioned via drop cells */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart as never}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setActiveId(null); setActiveDragData(null); setHoveredCell(null); }}
      >
        <SortableContext items={sections.map((s) => sortableSectionId(s.id))} strategy={verticalListSortingStrategy}>
          {sections.map((section, index) => (
            <SortableSection
              key={section.id}
              section={section}
              tilesById={tilesById}
              widgetsById={widgetsById}
              editMode={editMode}
              isCollapsed={collapsedSections.has(section.id)}
              onToggleCollapse={() => toggleCollapse(section.id)}
              onEditWidget={(w) => { setEditingWidget(w); setWidgetModalOpen(true); }}
              onDeleteWidget={setDeleteWidgetTarget}
              onSizeChange={(itemId, w, h) => updateItemLayout(itemId, { w, h })}
              onUpdateLayout={(patch) => updateSectionLayout(section.id, patch)}
              onChangeGridCols={(cols) => changeGridCols(section.id, cols)}
              onRename={(title) => renameSectionInDraft(section.id, title)}
              onDelete={() => deleteSectionFromDraft(section.id)}
              hoveredCell={hoveredCell}
              activeDragSize={activeDragData}
              isLast={index === sections.length - 1}
            />
          ))}
        </SortableContext>

        {!sections.length && (
          <div className="rounded-2xl border border-dashed border-line/40 py-16 text-center text-[13px] text-t3">
            {editMode ? "Klicke auf + Sektion um zu beginnen" : t("dashboard.empty_workspace")}
          </div>
        )}

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
          {(activeSection || activeTile || activeWidget) && (
            <div className="cursor-grabbing rotate-1 scale-[1.03]">
              <DragPreviewTile section={activeSection} tile={activeTile} widget={activeWidget} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <TileEditModal
        open={appModalOpen}
        onClose={() => setAppModalOpen(false)}
        initial={draftApp ?? undefined}
        defaultSectionId={defaultSectionId}
      />
      <WidgetEditModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} widget={editingWidget} catalog={activeCatalog} />
      <AddSectionModal open={addSectionOpen} onClose={() => setAddSectionOpen(false)} onCreate={(title) => createSection.mutate({ title, icon: iconValue("dashboard") })} />
      <DockerModal
        open={dockerModalOpen}
        onClose={() => setDockerModalOpen(false)}
        containers={containers}
        suggestions={suggestions}
        onAdopt={adoptContainer}
        onAction={(c, a) => setDockerActionTarget({ container: c, action: a })}
      />

      <ConfirmDialog
        open={Boolean(deleteWidgetTarget)}
        title={t("dashboard.delete_widget_title")}
        description={t("dashboard.delete_widget_description", { title: deleteWidgetTarget?.title ?? "" })}
        onCancel={() => setDeleteWidgetTarget(null)}
        onConfirm={() => {
          if (!deleteWidgetTarget) return;
          deleteWidget.mutate(deleteWidgetTarget.id, { onSuccess: () => setDeleteWidgetTarget(null) });
        }}
        isPending={deleteWidget.isPending}
      />
      <ConfirmDialog
        open={Boolean(dockerActionTarget)}
        title={t("dashboard.docker_action_title")}
        description={t("dashboard.confirm_docker_action", {
          action: dockerActionTarget?.action ?? "",
          name: dockerActionTarget?.container.app.name ?? "",
        })}
        onCancel={() => setDockerActionTarget(null)}
        onConfirm={() => {
          if (!dockerActionTarget) return;
          dockerAction.mutate(
            { id: dockerActionTarget.container.id, action: dockerActionTarget.action },
            { onSuccess: () => setDockerActionTarget(null) }
          );
        }}
        isPending={dockerAction.isPending}
      />
    </div>
  );
}
