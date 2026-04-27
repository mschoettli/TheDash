import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
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
  Eye,
  FolderPlus,
  GripVertical,
  LayoutDashboard,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Server,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../components/ui/Modal";
import IconBadge from "../components/ui/IconBadge";
import IconPicker from "../components/ui/IconPicker";
import ConfirmDialog from "../components/ui/ConfirmDialog";
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

const input = "w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 placeholder:text-t3";
const ACTIVE_WIDGET_TYPES = new Set(["docker", "system", "media", "downloads", "network", "rss", "weather", "calendar", "releases", "stocks"]);

const WIDGET_CONFIG: Record<string, { field?: string; placeholder?: string; required?: boolean }> = {
  docker: {},
  system: {},
  media: { field: "API URL", placeholder: "http://jellyfin:8096", required: true },
  downloads: { field: "Client URL", placeholder: "http://qbittorrent:8080", required: true },
  network: { field: "Service URL", placeholder: "http://adguard:3000", required: true },
  rss: { field: "Feed URL", placeholder: "https://example.com/feed.xml", required: true },
  weather: { field: "Location", placeholder: "Zurich, CH", required: true },
  calendar: { field: "Calendar URL", placeholder: "https://calendar.example/ics", required: true },
  releases: { field: "Repository", placeholder: "owner/repository", required: true },
  stocks: { field: "Symbol", placeholder: "AAPL", required: true },
};

function sortableItemId(itemId: number): string {
  return `item:${itemId}`;
}

function sortableSectionId(sectionId: number): string {
  return `section:${sectionId}`;
}

function numericId(id: string): number {
  return Number(id.split(":")[1]);
}

function hostFromUrl(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function widgetEndpointLabel(widget: WidgetInstance): string {
  const endpoint = String(widget.config.endpoint ?? "").trim();
  if (!endpoint || widget.config.showAddress === false) return "";
  return hostFromUrl(endpoint);
}

function requiresEndpoint(type: string): boolean {
  return Boolean(WIDGET_CONFIG[type]?.required);
}

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

  if (needsSetup) {
    return (
      <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[12px] font-medium text-amber-700 dark:text-amber-300">
        {t("widgets.setup_required")}
      </div>
    );
  }

  if (metrics?.status === "error") {
    return (
      <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[12px] font-medium text-rose-500">
        {metrics.error ?? t("widgets.unavailable")}
      </div>
    );
  }

  if (isLoading && !metrics) {
    return <div className="mt-4 rounded-xl border border-line/40 bg-card px-3 py-2 text-[12px] text-t3">{t("widgets.loading")}</div>;
  }

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

function WidgetTile({
  widget,
  editMode,
  onEdit,
  onDelete,
}: {
  widget: WidgetInstance;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
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
            <button onClick={onEdit} className="rounded-lg border border-line/45 bg-surface/90 p-1.5 text-t3 hover:text-accent">
              <Pencil size={13} />
            </button>
            <button onClick={onDelete} className="rounded-lg border border-line/45 bg-surface/90 p-1.5 text-t3 hover:text-rose-500">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="relative pl-1">
        <WidgetContent widget={widget} />
      </div>
    </div>
  );
}

function SortableDashboardItem({
  item,
  tile,
  widget,
  editMode,
  onEditWidget,
  onDeleteWidget,
}: {
  item: DashboardItem;
  tile?: Tile;
  widget?: WidgetInstance;
  editMode: boolean;
  onEditWidget: (widget: WidgetInstance) => void;
  onDeleteWidget: (widget: WidgetInstance) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableItemId(item.id),
    disabled: !editMode,
    data: { type: "item", sectionId: item.section_id },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  if (item.item_type === "tile" && !tile) return null;
  if (item.item_type === "widget" && !widget) return null;

  return (
    <div ref={setNodeRef} style={style} className={`relative ${item.item_type === "widget" ? "sm:col-span-2" : ""} ${isDragging ? "opacity-45" : ""}`}>
      {editMode && (
        <button
          className="absolute left-2 top-2 z-20 rounded-lg border border-line/50 bg-surface/90 p-1.5 text-t3 shadow-sm hover:text-accent"
          {...attributes}
          {...listeners}
          aria-label="Drag item"
        >
          <GripVertical size={13} />
        </button>
      )}
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
  );
}

function SortableSection({
  section,
  tilesById,
  widgetsById,
  editMode,
  onEditWidget,
  onDeleteWidget,
}: {
  section: DashboardSection;
  tilesById: Map<number, Tile>;
  widgetsById: Map<number, WidgetInstance>;
  editMode: boolean;
  onEditWidget: (widget: WidgetInstance) => void;
  onDeleteWidget: (widget: WidgetInstance) => void;
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
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <section ref={setNodeRef} style={style} className={`glass-panel rounded-2xl border border-line/60 p-4 ${isDragging ? "opacity-50" : ""}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {editMode && (
            <button className="rounded-lg border border-line/50 bg-surface/90 p-1.5 text-t3 hover:text-accent" {...attributes} {...listeners} aria-label="Drag section">
              <GripVertical size={13} />
            </button>
          )}
          <LayoutDashboard size={12} className="text-t3" />
          <div className="label-xs truncate">{section.title}</div>
        </div>
        <span className="text-[11px] text-t3">{section.items.length}</span>
      </div>

      <SortableContext items={section.items.map((item) => sortableItemId(item.id))} strategy={rectSortingStrategy}>
        <div
          ref={setDropRef}
          className={`grid min-h-[120px] grid-cols-1 gap-3 rounded-xl border border-dashed p-1 transition-colors sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${
            isOver ? "border-accent/70 bg-accent/10" : "border-line/35"
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
            />
          ))}
          {!section.items.length && (
            <div className="col-span-full flex min-h-[90px] items-center justify-center rounded-xl text-[13px] text-t3">
              {editMode ? t("dashboard.drop_here") : t("dashboard.empty_section")}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function WidgetEditModal({
  open,
  onClose,
  widget,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  widget?: WidgetInstance | null;
  catalog: WidgetCatalogItem[];
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
      type,
      title: title.trim(),
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
          <select className={input} value={type} onChange={(event) => {
            const next = event.target.value;
            setType(next);
            setTitle(catalog.find((item) => item.type === next)?.title ?? "");
          }}>
            {catalog.map((item) => (
              <option key={item.type} value={item.type}>{item.title} · {item.category}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="label-xs mb-1.5">{t("dashboard.widget_title")}</div>
          <input className={input} value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <IconPicker value={icon} name={title} onChange={setIcon} />
        {config.field && (
          <div>
            <div className="label-xs mb-1.5">{config.field}{config.required ? " *" : ""}</div>
            <input className={input} value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder={config.placeholder} />
          </div>
        )}
        {type === "media" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="label-xs mb-1.5">{t("dashboard.provider")}</div>
              <select className={input} value={provider} onChange={(event) => setProvider(event.target.value)}>
                <option value="jellyfin">Jellyfin</option>
                <option value="plex">Plex</option>
                <option value="emby">Emby</option>
              </select>
            </div>
            <div>
              <div className="label-xs mb-1.5">{t("tile.api_key")}</div>
              <input className={input} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={widget?.config?.hasApiKey ? t("dashboard.secret_keep") : "Token"} />
            </div>
          </div>
        )}
        {type === "downloads" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="label-xs mb-1.5">{t("dashboard.client")}</div>
              <select className={input} value={client} onChange={(event) => setClient(event.target.value)}>
                <option value="qbittorrent">qBittorrent</option>
                <option value="sabnzbd">SABnzbd</option>
              </select>
            </div>
            <div>
              <div className="label-xs mb-1.5">{t("tile.api_key")}</div>
              <input className={input} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={widget?.config?.hasApiKey ? t("dashboard.secret_keep") : t("dashboard.optional")} />
            </div>
            <div>
              <div className="label-xs mb-1.5">{t("dashboard.username")}</div>
              <input className={input} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" />
            </div>
            <div>
              <div className="label-xs mb-1.5">{t("dashboard.password")}</div>
              <input className={input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={widget?.config?.hasPassword ? t("dashboard.secret_keep") : t("dashboard.optional")} />
            </div>
          </div>
        )}
        <label className="flex items-center justify-between rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t2">
          <span>{t("tile.show_address")}</span>
          <input type="checkbox" checked={showAddress} onChange={(event) => setShowAddress(event.target.checked)} />
        </label>
        <div>
          <div className="label-xs mb-1.5">{t("dashboard.widget_notes")}</div>
          <textarea className={`${input} resize-none`} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <button onClick={save} disabled={!title.trim() || (config.required && !endpoint.trim())} className="w-full rounded-lg bg-accent py-2 text-[13px] font-semibold text-bg disabled:opacity-40">
          {t("common.save")}
        </button>
      </div>
    </Modal>
  );
}

function ContainerRow({
  container,
  onAdopt,
  onAction,
}: {
  container: DiscoveredContainer;
  onAdopt: (container: DiscoveredContainer) => void;
  onAction: (container: DiscoveredContainer, action: "start" | "stop" | "restart") => void;
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

export default function DashboardPage() {
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [draftApp, setDraftApp] = useState<Partial<Tile> | null>(null);
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetInstance | null>(null);
  const [deleteWidgetTarget, setDeleteWidgetTarget] = useState<WidgetInstance | null>(null);
  const [dockerActionTarget, setDockerActionTarget] = useState<{ container: DiscoveredContainer; action: "start" | "stop" | "restart" } | null>(null);
  const [sectionsDraft, setSectionsDraft] = useState<DashboardSection[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
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
  const tilesById = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles]);
  const widgetsById = useMemo(() => new Map(widgets.map((widget) => [widget.id, widget])), [widgets]);

  const containers = discovery?.containers ?? [];
  const suggestions = containers.filter(
    (container) => !tiles.some((tile) => tile.url === container.app.href || tile.name === container.app.name)
  );
  const labeledContainers = suggestions.filter((container) => container.app.is_labeled);
  const discoveredContainers = suggestions.filter((container) => !container.app.is_labeled);

  const openAppModal = (initial?: Partial<Tile>) => {
    setDraftApp(initial ?? null);
    setAppModalOpen(true);
  };

  const enterEditMode = () => {
    setSectionsDraft(JSON.parse(JSON.stringify(dashboard?.sections ?? [])));
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setSectionsDraft(null);
    setActiveId(null);
    setEditMode(false);
  };

  const saveEditMode = () => {
    const draft = sectionsDraft ?? sections;
    reorderDashboard.mutate({
      sections: draft.map((section, index) => ({ id: section.id, sort_order: index })),
      items: draft.flatMap((section) =>
        section.items.map((item, index) => ({
          id: item.id,
          section_id: section.id,
          sort_order: index,
          layout: item.layout,
        }))
      ),
    });
    setSectionsDraft(null);
    setEditMode(false);
  };

  const addSection = () => {
    const title = window.prompt(t("dashboard.new_section"));
    if (!title?.trim()) return;
    createSection.mutate({ title: title.trim(), icon: iconValue("dashboard") });
  };

  const adoptContainer = (container: DiscoveredContainer) => {
    const detectedLogo = iconValue(detectIconKey(`${container.app.name} ${container.image} ${container.app.href ?? ""}`));
    openAppModal({
      name: container.app.name,
      url: container.app.href ?? "",
      icon_url: container.app.icon ?? detectedLogo,
      style: "card",
      provider: "none",
      api_url: null,
      api_key: null,
      show_address: true,
      sort_order: 0,
    });
  };

  const moveItem = (activeItemId: number, overId: string) => {
    const current = JSON.parse(JSON.stringify(sections)) as DashboardSection[];
    let sourceSectionIndex = -1;
    let sourceItemIndex = -1;
    current.forEach((section, sectionIndex) => {
      const itemIndex = section.items.findIndex((item) => item.id === activeItemId);
      if (itemIndex >= 0) {
        sourceSectionIndex = sectionIndex;
        sourceItemIndex = itemIndex;
      }
    });
    if (sourceSectionIndex < 0 || sourceItemIndex < 0) return;

    const [item] = current[sourceSectionIndex].items.splice(sourceItemIndex, 1);
    let targetSectionIndex = sourceSectionIndex;
    let targetItemIndex = current[sourceSectionIndex].items.length;

    if (overId.startsWith("section-drop:")) {
      targetSectionIndex = current.findIndex((section) => section.id === numericId(overId.replace("section-drop", "section")));
      targetItemIndex = current[targetSectionIndex]?.items.length ?? 0;
    } else if (overId.startsWith("section:")) {
      targetSectionIndex = current.findIndex((section) => section.id === numericId(overId));
      targetItemIndex = current[targetSectionIndex]?.items.length ?? 0;
    } else if (overId.startsWith("item:")) {
      const overItemId = numericId(overId);
      current.forEach((section, sectionIndex) => {
        const itemIndex = section.items.findIndex((entry) => entry.id === overItemId);
        if (itemIndex >= 0) {
          targetSectionIndex = sectionIndex;
          targetItemIndex = itemIndex;
        }
      });
    }

    if (targetSectionIndex < 0) return;
    item.section_id = current[targetSectionIndex].id;
    current[targetSectionIndex].items.splice(targetItemIndex, 0, item);
    setSectionsDraft(current.map((section, sectionIndex) => ({
      ...section,
      sort_order: sectionIndex,
      items: section.items.map((entry, itemIndex) => ({ ...entry, section_id: section.id, sort_order: itemIndex })),
    })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);

    if (activeKey.startsWith("section:") && overKey.startsWith("section:")) {
      const current = [...sections];
      const oldIndex = current.findIndex((section) => section.id === numericId(activeKey));
      const newIndex = current.findIndex((section) => section.id === numericId(overKey));
      if (oldIndex >= 0 && newIndex >= 0) {
        setSectionsDraft(arrayMove(current, oldIndex, newIndex).map((section, index) => ({ ...section, sort_order: index })));
      }
      return;
    }

    if (activeKey.startsWith("item:")) {
      moveItem(numericId(activeKey), overKey);
    }
  };

  const activeLabel = (() => {
    if (!activeId) return "";
    if (activeId.startsWith("section:")) return sections.find((section) => section.id === numericId(activeId))?.title ?? "";
    const itemId = numericId(activeId);
    const item = sections.flatMap((section) => section.items).find((entry) => entry.id === itemId);
    if (!item) return "";
    if (item.item_type === "tile") return tilesById.get(item.item_id)?.name ?? "";
    return widgetsById.get(item.item_id)?.title ?? "";
  })();

  return (
    <div className="space-y-5 text-t1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-xs mb-1">{t("dashboard.overview")}</div>
          <h1 className="text-xl font-semibold text-t1">{t("dashboard.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button onClick={enterEditMode} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-t2 hover:text-t1 hover:border-accent/40">
              <SlidersHorizontal size={14} /> {t("dashboard.edit")}
            </button>
          ) : (
            <>
              <button onClick={addSection} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 hover:text-t1"><FolderPlus size={14} /> {t("dashboard.add_section")}</button>
              <button onClick={() => openAppModal()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg"><Plus size={14} /> {t("dashboard.add_app")}</button>
              <button onClick={() => { setEditingWidget(null); setWidgetModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 hover:text-t1"><Boxes size={14} /> {t("dashboard.add_widget")}</button>
              <button onClick={saveEditMode} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-[13px] font-medium text-emerald-600 dark:text-emerald-400"><Save size={14} /> {t("common.save")}</button>
              <button onClick={cancelEditMode} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2"><X size={14} /> {t("common.cancel")}</button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(event) => setActiveId(String(event.active.id))} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="space-y-4">
            <SortableContext items={sections.map((section) => sortableSectionId(section.id))} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  tilesById={tilesById}
                  widgetsById={widgetsById}
                  editMode={editMode}
                  onEditWidget={(widget) => {
                    setEditingWidget(widget);
                    setWidgetModalOpen(true);
                  }}
                  onDeleteWidget={setDeleteWidgetTarget}
                />
              ))}
            </SortableContext>
            {!sections.length && (
              <div className="glass-panel rounded-xl border border-dashed border-line py-10 text-center text-[13px] text-t3">
                {t("dashboard.empty_workspace")}
              </div>
            )}
          </div>
          <DragOverlay>
            {activeLabel ? (
              <div className="glass-panel rounded-xl border border-accent/40 px-4 py-3 text-[13px] font-semibold text-t1 shadow-2xl">
                {activeLabel}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <aside className="space-y-4">
          <section className="glass-panel rounded-xl border border-line/60 p-4">
            <div className="label-xs mb-3 flex items-center gap-1.5"><Server size={11} /> {t("dashboard.docker")}</div>
            {discovery?.status === "disabled" ? (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-[12px] text-amber-700 dark:text-amber-300">
                {t("dashboard.docker_disabled")}
              </div>
            ) : (
              <div className="space-y-1.5">
                {containers.slice(0, 8).map((container) => <ContainerRow key={container.id} container={container} onAdopt={adoptContainer} onAction={(item, action) => setDockerActionTarget({ container: item, action })} />)}
                {!containers.length && <div className="text-[13px] text-t3">{t("dashboard.no_containers")}</div>}
              </div>
            )}
          </section>
        </aside>
      </div>

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
                {labeledContainers.map((container) => <ContainerRow key={container.id} container={container} onAdopt={adoptContainer} onAction={(item, action) => setDockerActionTarget({ container: item, action })} />)}
              </div>
            </div>
          )}
          <div>
            <div className="label-xs mb-2">{t("dashboard.suggested_containers")}</div>
            <div className="grid gap-2 lg:grid-cols-2">
              {discoveredContainers.map((container) => <ContainerRow key={container.id} container={container} onAdopt={adoptContainer} onAction={(item, action) => setDockerActionTarget({ container: item, action })} />)}
            </div>
          </div>
        </section>
      )}

      <TileEditModal open={appModalOpen} onClose={() => setAppModalOpen(false)} initial={draftApp ?? undefined} />
      <WidgetEditModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} widget={editingWidget} catalog={activeCatalog} />
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
