import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  FolderPlus,
  GripVertical,
  LayoutDashboard,
  LayoutGrid,
  List,
  Maximize2,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Server,
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
import { DashboardItem, DashboardSection, useCreateDashboardSection, useDashboard, useReorderDashboard } from "../hooks/useDashboard";
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

const input = "w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 placeholder:text-t3";
const ACTIVE_WIDGET_TYPES = new Set(["docker", "system", "media", "downloads", "network", "rss", "weather", "calendar", "releases", "stocks"]);

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

// Baustein 1 – span system
const SPAN_PRESETS = [
  { label: "1×1", col: 1, row: 1 },
  { label: "2×1", col: 2, row: 1 },
  { label: "3×1", col: 3, row: 1 },
  { label: "2×2", col: 2, row: 2 },
  { label: "4×1", col: 4, row: 1 },
] as const;

function colSpanClass(n: number) {
  if (n === 4) return "col-span-4";
  if (n === 3) return "col-span-3";
  if (n === 2) return "col-span-2";
  return "col-span-1";
}
function rowSpanClass(n: number) {
  if (n === 3) return "row-span-3";
  if (n === 2) return "row-span-2";
  return "row-span-1";
}

// Baustein 4 – section colors palette
const SECTION_COLORS: { label: string; value: string | null; dot: string }[] = [
  { label: "Default", value: null, dot: "bg-accent" },
  { label: "Violet", value: "139 92 246", dot: "bg-violet-400" },
  { label: "Emerald", value: "52 211 153", dot: "bg-emerald-400" },
  { label: "Rose", value: "251 113 133", dot: "bg-rose-400" },
  { label: "Amber", value: "251 191 36", dot: "bg-amber-400" },
  { label: "Blue", value: "96 165 250", dot: "bg-blue-400" },
];

type LayoutMode = "grid" | "list" | "wide";

function getSectionMeta(section: DashboardSection) {
  return {
    color: (section.layout.color as string | null) ?? null,
    layoutMode: (section.layout.layoutMode as LayoutMode) ?? "grid",
  };
}

function gridClassForMode(mode: LayoutMode): string {
  if (mode === "list") return "grid-cols-1";
  if (mode === "wide") return "grid-cols-2 auto-rows-[minmax(160px,auto)]";
  return "grid-cols-4 auto-rows-[minmax(120px,auto)]";
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

function sortableItemId(id: number) { return `item:${id}`; }
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
    !needsSetup && ["docker", "system", "rss", "weather", "media", "downloads", "network", "calendar", "releases", "stocks"].includes(widget.type)
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
    <div className={`glass-panel relative min-h-[176px] overflow-hidden rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-xl hover:shadow-accent/10 ${editMode ? "border-accent/25 ring-1 ring-accent/10" : "border-line/60"}`}>
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

// ─── Baustein 3: Drag Preview ──────────────────────────────────────────────────

function DragPreviewTile({ tile, widget, section }: {
  tile?: Tile; widget?: WidgetInstance; section?: DashboardSection;
}) {
  if (section) {
    return (
      <div className="glass-panel flex items-center gap-3 rounded-xl border border-accent/50 px-4 py-3 shadow-2xl shadow-accent/20">
        <LayoutDashboard size={15} className="text-accent" />
        <span className="text-[13px] font-semibold text-t1">{section.title}</span>
      </div>
    );
  }
  if (tile) {
    return (
      <div className="tile-glass flex items-center gap-3 rounded-xl border border-accent/50 px-3 py-2.5 shadow-2xl shadow-accent/20">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/55 bg-surface">
          <FaviconImg url={tile.url} name={tile.name} size={22} explicitIconUrl={tile.icon_url} />
        </span>
        <span className="text-[13px] font-semibold text-t1">{tile.name}</span>
      </div>
    );
  }
  if (widget) {
    return (
      <div className="glass-panel flex items-center gap-3 rounded-xl border border-accent/50 px-3 py-2.5 shadow-2xl shadow-accent/20">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/55 bg-surface">
          <IconBadge value={String(widget.config.icon ?? "")} name={widget.title} size={22} />
        </span>
        <span className="text-[13px] font-semibold text-t1">{widget.title}</span>
      </div>
    );
  }
  return null;
}

// ─── Sortable Dashboard Item ───────────────────────────────────────────────────

function SortableDashboardItem({
  item, tile, widget, editMode,
  onEditWidget, onDeleteWidget, onSpanChange,
}: {
  item: DashboardItem;
  tile?: Tile; widget?: WidgetInstance;
  editMode: boolean;
  onEditWidget: (w: WidgetInstance) => void;
  onDeleteWidget: (w: WidgetInstance) => void;
  onSpanChange: (itemId: number, col: number, row: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableItemId(item.id),
    disabled: !editMode,
    data: { type: "item", sectionId: item.section_id },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const spanCol = Number(item.layout?.spanCol ?? 1);
  const spanRow = Number(item.layout?.spanRow ?? 1);

  if (item.item_type === "tile" && !tile) return null;
  if (item.item_type === "widget" && !widget) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${colSpanClass(spanCol)} ${rowSpanClass(spanRow)} ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Baustein 1: Span picker overlay */}
      {editMode && (
        <div className="absolute bottom-2 left-10 z-20 flex gap-0.5 rounded-lg border border-line/50 bg-surface/95 p-1 shadow-sm backdrop-blur-sm">
          {SPAN_PRESETS.map(({ label, col, row }) => (
            <button
              key={label}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSpanChange(item.id, col, row); }}
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors ${
                spanCol === col && spanRow === row
                  ? "bg-accent text-bg"
                  : "text-t3 hover:bg-line/40 hover:text-t1"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Drag handle */}
      {editMode && (
        <button
          className="absolute left-2 top-2 z-20 rounded-lg border border-line/50 bg-surface/90 p-1.5 text-t3 shadow-sm hover:text-accent"
          {...attributes} {...listeners}
          aria-label="Drag item"
        >
          <GripVertical size={13} />
        </button>
      )}

      {item.item_type === "tile" && tile ? (
        <TileWrapper tile={tile} editMode={editMode} />
      ) : widget ? (
        <WidgetTile
          widget={widget} editMode={editMode}
          onEdit={() => onEditWidget(widget)}
          onDelete={() => onDeleteWidget(widget)}
        />
      ) : null}
    </div>
  );
}

// ─── Sortable Section ──────────────────────────────────────────────────────────

function SortableSection({
  section, tilesById, widgetsById, editMode,
  isCollapsed, onToggleCollapse,
  onEditWidget, onDeleteWidget, onSpanChange,
  onUpdateLayout, onRename, onDelete,
}: {
  section: DashboardSection;
  tilesById: Map<number, Tile>;
  widgetsById: Map<number, WidgetInstance>;
  editMode: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onEditWidget: (w: WidgetInstance) => void;
  onDeleteWidget: (w: WidgetInstance) => void;
  onSpanChange: (itemId: number, col: number, row: number) => void;
  onUpdateLayout: (patch: Record<string, unknown>) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableSectionId(section.id),
    disabled: !editMode,
    data: { type: "section" },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `section-drop:${section.id}`,
    disabled: !editMode,
    data: { type: "section-drop", sectionId: section.id },
  });
  const [localTitle, setLocalTitle] = useState(section.title);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };
  const { color, layoutMode } = getSectionMeta(section);
  const accentStyle = color ? ({ "--accent": color } as React.CSSProperties) : undefined;

  useEffect(() => { setLocalTitle(section.title); }, [section.title]);

  return (
    <section
      ref={setNodeRef}
      style={{ ...style, ...accentStyle }}
      className={`glass-panel rounded-2xl border p-4 transition-colors ${
        isDragging ? "opacity-50" : ""
      } ${isOver ? "border-accent/60 bg-accent/5" : "border-line/60"}`}
    >
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        {editMode && (
          <button className="shrink-0 rounded-lg border border-line/50 bg-surface/90 p-1.5 text-t3 hover:text-accent" {...attributes} {...listeners} aria-label="Drag section">
            <GripVertical size={13} />
          </button>
        )}

        {/* Color accent stripe */}
        {color && <div className="h-4 w-1 shrink-0 rounded-full bg-accent/80" />}

        {/* Title – editable in edit mode */}
        {editMode ? (
          <input
            className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold uppercase tracking-wider text-t2 outline-none border-b border-transparent focus:border-accent/50 transition-colors"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => onRename(localTitle)}
            onKeyDown={(e) => e.key === "Enter" && onRename(localTitle)}
          />
        ) : (
          <div className="label-xs min-w-0 flex-1 truncate">{section.title}</div>
        )}

        {/* Item count */}
        <span className="shrink-0 text-[11px] text-t3">{section.items.length}</span>

        {/* Edit mode controls */}
        {editMode && (
          <div className="flex shrink-0 items-center gap-1 ml-1">
            {/* Layout mode toggle */}
            <div className="flex overflow-hidden rounded-lg border border-line/50">
              {([
                { mode: "grid" as LayoutMode, icon: <LayoutGrid size={11} /> },
                { mode: "list" as LayoutMode, icon: <List size={11} /> },
                { mode: "wide" as LayoutMode, icon: <Maximize2 size={11} /> },
              ] as const).map(({ mode, icon }) => (
                <button
                  key={mode}
                  onClick={() => onUpdateLayout({ layoutMode: mode })}
                  className={`p-1.5 transition-colors ${layoutMode === mode ? "bg-accent text-bg" : "text-t3 hover:text-t1 hover:bg-line/30"}`}
                  title={mode}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Color picker toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker((v) => !v)}
                className="rounded-lg border border-line/50 bg-surface/90 p-1.5 text-t3 hover:text-t1"
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
                      className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${c.dot} ${color === c.value ? "border-t1 scale-110" : "border-transparent"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Delete section */}
            <button onClick={onDelete} className="rounded-lg border border-line/50 bg-surface/90 p-1.5 text-t3 hover:text-rose-500">
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button onClick={onToggleCollapse} className="shrink-0 rounded-lg p-1 text-t3 hover:text-t1 transition-colors">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Section body */}
      {!isCollapsed && (
        <SortableContext items={section.items.map((item) => sortableItemId(item.id))} strategy={rectSortingStrategy}>
          <div
            ref={setDropRef}
            className={`grid min-h-[120px] gap-3 rounded-xl border border-dashed p-1 transition-colors ${gridClassForMode(layoutMode)} ${
              isOver ? "border-accent/60 bg-accent/5" : "border-line/30"
            }`}
          >
            {section.items.map((item) => (
              <SortableDashboardItem
                key={item.id}
                item={item}
                tile={item.item_type === "tile" ? tilesById.get(item.item_id) : undefined}
                widget={item.item_type === "widget" ? widgetsById.get(item.item_id) : undefined}
                editMode={editMode}
                onEditWidget={onEditWidget}
                onDeleteWidget={onDeleteWidget}
                onSpanChange={onSpanChange}
              />
            ))}
            {!section.items.length && (
              <div className="col-span-full flex min-h-[90px] items-center justify-center rounded-xl text-[13px] text-t3">
                {editMode ? t("dashboard.drop_here") : t("dashboard.empty_section")}
              </div>
            )}
          </div>
        </SortableContext>
      )}
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
  const [endpoint, setEndpoint] = useState(String(widget?.config?.endpoint ?? ""));
  const [provider, setProvider] = useState(String(widget?.config?.provider ?? "jellyfin"));
  const [client, setClient] = useState(String(widget?.config?.client ?? "qbittorrent"));
  const [username, setUsername] = useState(String(widget?.config?.username ?? ""));
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState(String(widget?.config?.apiKey ?? ""));
  const [notes, setNotes] = useState(String(widget?.config?.notes ?? ""));
  const [showAddress, setShowAddress] = useState(Boolean(widget?.config?.showAddress ?? true));
  const config = WIDGET_CONFIG[type] ?? {};

  useEffect(() => {
    if (!open) return;
    const current = widget ? catalog.find((item) => item.type === widget.type) : selected;
    setType(widget?.type ?? current?.type ?? "docker");
    setTitle(widget?.title ?? current?.title ?? "");
    setIcon(String(widget?.config?.icon ?? iconValue(detectIconKey(widget?.title ?? current?.title ?? ""))));
    setEndpoint(String(widget?.config?.endpoint ?? ""));
    setProvider(String(widget?.config?.provider ?? "jellyfin"));
    setClient(String(widget?.config?.client ?? "qbittorrent"));
    setUsername(String(widget?.config?.username ?? ""));
    setPassword("");
    setApiKey("");
    setNotes(String(widget?.config?.notes ?? ""));
    setShowAddress(Boolean(widget?.config?.showAddress ?? true));
  }, [open, widget, catalog, selected]);

  useEffect(() => {
    if (!open || widget) return;
    setIcon(iconValue(detectIconKey(title)));
  }, [open, title, widget]);

  const save = () => {
    if (!title.trim() || !type || (config.required && !endpoint.trim())) return;
    const payload = {
      type, title: title.trim(),
      config: { endpoint: endpoint.trim(), provider, client, username: username.trim(), password: password.trim(), apiKey: apiKey.trim(), notes: notes.trim(), icon, showAddress },
      layout: widget?.layout ?? {},
      section_id: widget?.section_id ?? null,
      sort_order: widget?.sort_order ?? 0,
      is_enabled: true,
    };
    if (widget) updateWidget.mutate({ id: widget.id, ...payload }, { onSuccess: onClose });
    else createWidget.mutate(payload, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title={widget ? t("dashboard.edit_widget") : t("dashboard.add_widget")}>
      <div className="space-y-4">
        <div>
          <div className="label-xs mb-1.5">{t("dashboard.widget_type")}</div>
          <select className={input} value={type} onChange={(e) => { setType(e.target.value); setTitle(catalog.find((item) => item.type === e.target.value)?.title ?? ""); }}>
            {catalog.map((item) => <option key={item.type} value={item.type}>{item.title} · {item.category}</option>)}
          </select>
        </div>
        <div>
          <div className="label-xs mb-1.5">{t("dashboard.widget_title")}</div>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <IconPicker value={icon} name={title} onChange={setIcon} />
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
        <button onClick={save} disabled={!title.trim() || (config.required && !endpoint.trim())} className="w-full rounded-lg bg-accent py-2 text-[13px] font-semibold text-bg disabled:opacity-40">
          {t("common.save")}
        </button>
      </div>
    </Modal>
  );
}

// ─── Container Row ─────────────────────────────────────────────────────────────

function ContainerRow({ container, onAdopt, onAction }: {
  container: DiscoveredContainer;
  onAdopt: (c: DiscoveredContainer) => void;
  onAction: (c: DiscoveredContainer, a: "start" | "stop" | "restart") => void;
}) {
  const { t } = useTranslation();
  const isRunning = container.state === "running";
  return (
    <div className="glass-panel flex items-center gap-3 rounded-xl border border-line/50 px-3 py-2.5 transition-all hover:border-accent/30">
      <span className={`h-2 w-2 shrink-0 rounded-full ${isRunning ? "bg-emerald-400" : "bg-t3"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-[13px] font-semibold text-t1">{container.app.name}</div>
          <span className="rounded-full border border-line/50 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-t3">{container.app.confidence}</span>
        </div>
        <div className="truncate text-[11px] text-t3">{container.app.href ?? container.image}</div>
        <div className="mt-0.5 truncate text-[10px] text-t3">{container.status}{container.ports.length ? ` · ${container.ports.join(", ")}` : ""}</div>
      </div>
      <button onClick={() => onAdopt(container)} disabled={!container.app.href} className="rounded-lg border border-line px-2 py-1 text-[12px] text-t2 hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">
        <Plus size={12} className="inline" /> {t("dashboard.app")}
      </button>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onAction(container, "start")} className="rounded p-1 text-t3 hover:bg-line/40 hover:text-emerald-500"><Play size={13} /></button>
        <button onClick={() => onAction(container, "stop")} className="rounded p-1 text-t3 hover:bg-line/40 hover:text-amber-500"><Pause size={13} /></button>
        <button onClick={() => onAction(container, "restart")} className="rounded p-1 text-t3 hover:bg-line/40 hover:text-accent"><RefreshCw size={13} /></button>
      </div>
    </div>
  );
}

// ─── Add Section Modal ─────────────────────────────────────────────────────────

function AddSectionModal({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setTitle(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const submit = () => {
    if (!title.trim()) return;
    onCreate(title.trim());
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Neue Sektion">
      <div className="space-y-4">
        <div>
          <div className="label-xs mb-1.5">Name</div>
          <input
            ref={inputRef}
            className={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="z.B. Medien, Netzwerk, ..."
          />
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
  const [editMode, setEditMode] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [draftApp, setDraftApp] = useState<Partial<Tile> | null>(null);
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetInstance | null>(null);
  const [deleteWidgetTarget, setDeleteWidgetTarget] = useState<WidgetInstance | null>(null);
  const [dockerActionTarget, setDockerActionTarget] = useState<{ container: DiscoveredContainer; action: "start" | "stop" | "restart" } | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [sectionsDraft, setSectionsDraft] = useState<DashboardSection[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Baustein 4: local collapse state (not persisted to DB)
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

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
  const labeledContainers = suggestions.filter((c) => c.app.is_labeled);
  const discoveredContainers = suggestions.filter((c) => !c.app.is_labeled);

  // ─ Edit mode helpers ────────────────────────────────────────────────────────

  const openAppModal = (initial?: Partial<Tile>) => { setDraftApp(initial ?? null); setAppModalOpen(true); };

  const enterEditMode = () => {
    setSectionsDraft(JSON.parse(JSON.stringify(dashboard?.sections ?? [])));
    setEditMode(true);
  };

  const cancelEditMode = () => { setSectionsDraft(null); setActiveId(null); setEditMode(false); };

  const saveEditMode = () => {
    const draft = sectionsDraft ?? sections;
    reorderDashboard.mutate({
      sections: draft.map((s, i) => ({ id: s.id, sort_order: i })),
      items: draft.flatMap((s) =>
        s.items.map((item, i) => ({
          id: item.id, section_id: s.id, sort_order: i, layout: item.layout,
        }))
      ),
    });
    setSectionsDraft(null);
    setEditMode(false);
  };

  // Baustein 1: span change
  const updateItemLayout = (itemId: number, patch: Record<string, unknown>) => {
    setSectionsDraft((prev) =>
      prev?.map((s) => ({
        ...s,
        items: s.items.map((it) =>
          it.id === itemId ? { ...it, layout: { ...it.layout, ...patch } } : it
        ),
      })) ?? null
    );
  };

  // Baustein 4: section layout / color
  const updateSectionLayout = (sectionId: number, patch: Record<string, unknown>) => {
    setSectionsDraft((prev) =>
      prev?.map((s) =>
        s.id === sectionId ? { ...s, layout: { ...s.layout, ...patch } } : s
      ) ?? null
    );
  };

  const renameSectionInDraft = (sectionId: number, title: string) => {
    setSectionsDraft((prev) =>
      prev?.map((s) => s.id === sectionId ? { ...s, title } : s) ?? null
    );
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

  const handleAddSection = (title: string) => {
    createSection.mutate({ title, icon: iconValue("dashboard") });
  };

  const adoptContainer = (container: DiscoveredContainer) => {
    const logo = iconValue(detectIconKey(`${container.app.name} ${container.image} ${container.app.href ?? ""}`));
    openAppModal({
      name: container.app.name, url: container.app.href ?? "",
      icon_url: container.app.icon ?? logo, style: "card",
      provider: "none", api_url: null, api_key: null, show_address: true, sort_order: 0,
    });
  };

  // ─ DnD ─────────────────────────────────────────────────────────────────────

  const moveItem = (activeItemId: number, overId: string) => {
    const current = JSON.parse(JSON.stringify(sections)) as DashboardSection[];
    let srcSec = -1, srcItem = -1;
    current.forEach((s, si) => {
      const ii = s.items.findIndex((it) => it.id === activeItemId);
      if (ii >= 0) { srcSec = si; srcItem = ii; }
    });
    if (srcSec < 0 || srcItem < 0) return;

    const [item] = current[srcSec].items.splice(srcItem, 1);
    let dstSec = srcSec, dstItem = current[srcSec].items.length;

    if (overId.startsWith("section-drop:")) {
      dstSec = current.findIndex((s) => s.id === numericId(overId.replace("section-drop", "section")));
      dstItem = current[dstSec]?.items.length ?? 0;
    } else if (overId.startsWith("section:")) {
      dstSec = current.findIndex((s) => s.id === numericId(overId));
      dstItem = current[dstSec]?.items.length ?? 0;
    } else if (overId.startsWith("item:")) {
      const overItemId = numericId(overId);
      current.forEach((s, si) => {
        const ii = s.items.findIndex((it) => it.id === overItemId);
        if (ii >= 0) { dstSec = si; dstItem = ii; }
      });
    }

    if (dstSec < 0) return;
    item.section_id = current[dstSec].id;
    current[dstSec].items.splice(dstItem, 0, item);
    setSectionsDraft(current.map((s, si) => ({
      ...s, sort_order: si,
      items: s.items.map((it, ii) => ({ ...it, section_id: s.id, sort_order: ii })),
    })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const ak = String(active.id), ok = String(over.id);

    if (ak.startsWith("section:") && ok.startsWith("section:")) {
      const cur = [...sections];
      const oi = cur.findIndex((s) => s.id === numericId(ak));
      const ni = cur.findIndex((s) => s.id === numericId(ok));
      if (oi >= 0 && ni >= 0) {
        setSectionsDraft(arrayMove(cur, oi, ni).map((s, i) => ({ ...s, sort_order: i })));
      }
      return;
    }
    if (ak.startsWith("item:")) moveItem(numericId(ak), ok);
  };

  // Active drag preview data
  const activeSection = activeId?.startsWith("section:")
    ? sections.find((s) => s.id === numericId(activeId))
    : undefined;
  const activeItem = activeId?.startsWith("item:")
    ? sections.flatMap((s) => s.items).find((it) => it.id === numericId(activeId))
    : undefined;
  const activeTile = activeItem?.item_type === "tile" ? tilesById.get(activeItem.item_id) : undefined;
  const activeWidget = activeItem?.item_type === "widget" ? widgetsById.get(activeItem.item_id) : undefined;

  // ─ Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 text-t1">
      {/* Page title + non-edit controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-xs mb-1">{t("dashboard.overview")}</div>
          <h1 className="text-xl font-semibold text-t1">{t("dashboard.title")}</h1>
        </div>
        {!editMode && (
          <button onClick={enterEditMode} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-t2 hover:text-t1 hover:border-accent/40">
            <SlidersHorizontal size={14} /> {t("dashboard.edit")}
          </button>
        )}
      </div>

      {/* Baustein 6: Edit-Mode Toolbar */}
      {editMode && (
        <div className="sticky top-0 z-40 -mx-6 flex flex-wrap items-center gap-2 border-b border-line/40 bg-bg/90 px-6 py-2.5 backdrop-blur-md">
          <span className="label-xs mr-1 text-accent">EDIT MODE</span>
          <button
            onClick={() => openAppModal()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg hover:opacity-90 transition-opacity"
          >
            <Plus size={13} /> App
          </button>
          <button
            onClick={() => { setEditingWidget(null); setWidgetModalOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 hover:text-t1 hover:border-accent/40"
          >
            <Boxes size={13} /> Widget
          </button>
          <button
            onClick={() => setAddSectionOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 hover:text-t1 hover:border-accent/40"
          >
            <FolderPlus size={13} /> Sektion
          </button>
          <div className="flex-1" />
          <button
            onClick={saveEditMode}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-[13px] font-semibold text-emerald-500 hover:bg-emerald-500/20"
          >
            <Check size={13} /> Fertig
          </button>
          <button
            onClick={cancelEditMode}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 hover:text-t1"
          >
            <X size={13} /> Abbrechen
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="space-y-4">
            <SortableContext items={sections.map((s) => sortableSectionId(s.id))} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
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
                  onSpanChange={(itemId, col, row) => updateItemLayout(itemId, { spanCol: col, spanRow: row })}
                  onUpdateLayout={(patch) => updateSectionLayout(section.id, patch)}
                  onRename={(title) => renameSectionInDraft(section.id, title)}
                  onDelete={() => deleteSectionFromDraft(section.id)}
                />
              ))}
            </SortableContext>
            {!sections.length && (
              <div className="glass-panel rounded-xl border border-dashed border-line py-10 text-center text-[13px] text-t3">
                {t("dashboard.empty_workspace")}
              </div>
            )}
          </div>

          {/* Baustein 3: DragOverlay with tile preview */}
          <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
            {(activeSection || activeTile || activeWidget) && (
              <div className="cursor-grabbing rotate-1 scale-[1.03]">
                <DragPreviewTile
                  section={activeSection}
                  tile={activeTile}
                  widget={activeWidget}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Docker sidebar */}
        <aside className="space-y-4">
          <section className="glass-panel rounded-xl border border-line/60 p-4">
            <div className="label-xs mb-3 flex items-center gap-1.5"><Server size={11} /> {t("dashboard.docker")}</div>
            {discovery?.status === "disabled" ? (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-[12px] text-amber-700 dark:text-amber-300">
                {t("dashboard.docker_disabled")}
              </div>
            ) : (
              <div className="space-y-1.5">
                {containers.slice(0, 8).map((c) => (
                  <ContainerRow key={c.id} container={c} onAdopt={adoptContainer} onAction={(item, action) => setDockerActionTarget({ container: item, action })} />
                ))}
                {!containers.length && <div className="text-[13px] text-t3">{t("dashboard.no_containers")}</div>}
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* Discovered apps */}
      {suggestions.length > 0 && (
        <section className="glass-panel rounded-xl border border-line/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="label-xs flex items-center gap-1.5"><Eye size={11} /> {t("dashboard.discovered_apps")}</div>
            <span className="text-[11px] text-t3">{suggestions.length}</span>
          </div>
          {labeledContainers.length > 0 && (
            <div className="mb-4">
              <div className="label-xs mb-2">{t("dashboard.labeled_containers")}</div>
              <div className="grid gap-2 lg:grid-cols-2">
                {labeledContainers.map((c) => <ContainerRow key={c.id} container={c} onAdopt={adoptContainer} onAction={(item, action) => setDockerActionTarget({ container: item, action })} />)}
              </div>
            </div>
          )}
          <div>
            <div className="label-xs mb-2">{t("dashboard.suggested_containers")}</div>
            <div className="grid gap-2 lg:grid-cols-2">
              {discoveredContainers.map((c) => <ContainerRow key={c.id} container={c} onAdopt={adoptContainer} onAction={(item, action) => setDockerActionTarget({ container: item, action })} />)}
            </div>
          </div>
        </section>
      )}

      {/* Modals */}
      <TileEditModal open={appModalOpen} onClose={() => setAppModalOpen(false)} initial={draftApp ?? undefined} />
      <WidgetEditModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} widget={editingWidget} catalog={activeCatalog} />
      <AddSectionModal open={addSectionOpen} onClose={() => setAddSectionOpen(false)} onCreate={handleAddSection} />

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
