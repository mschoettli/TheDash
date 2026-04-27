import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Boxes,
  Eye,
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
import TileGrid from "../components/tiles/TileGrid";
import TileEditModal from "../components/tiles/TileEditModal";
import { detectIconKey, iconValue } from "../lib/iconRegistry";
import { Tile, useReorderTiles, useTiles } from "../hooks/useTiles";
import { DiscoveredContainer, useDockerAction, useDockerDiscovery } from "../hooks/useDockerDiscovery";
import {
  useCreateWidget,
  useDeleteWidget,
  useReorderWidgets,
  useUpdateWidget,
  useWidgetMetrics,
  useWidgetCatalog,
  useWidgets,
  WidgetCatalogItem,
  WidgetInstance,
} from "../hooks/useWidgets";

const input = "w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 placeholder:text-t3";

const WIDGET_CONFIG: Record<string, { field?: string; placeholder?: string; required?: boolean }> = {
  docker: {},
  system: {},
  media: { field: "API URL", placeholder: "http://jellyfin:8096", required: false },
  downloads: { field: "Client URL", placeholder: "http://qbittorrent:8080", required: false },
  network: { field: "Service URL", placeholder: "http://adguard:3000", required: false },
  rss: { field: "Feed URL", placeholder: "https://example.com/feed.xml", required: true },
  weather: { field: "Location", placeholder: "Zurich, CH", required: true },
  notebook: {},
  calendar: { field: "Calendar URL", placeholder: "https://calendar.example/ics", required: false },
  iframe: { field: "Embed URL", placeholder: "https://example.com", required: true },
  releases: { field: "Repository", placeholder: "owner/repository", required: true },
  video: { field: "Stream URL", placeholder: "rtsp:// or https://", required: true },
  automation: { field: "Webhook URL", placeholder: "https://...", required: true },
  entity: { field: "Entity ID", placeholder: "sensor.status", required: true },
  stocks: { field: "Symbol", placeholder: "AAPL", required: true },
  minecraft: { field: "Server", placeholder: "host:25565", required: true },
  notifications: {},
};

const ACTIVE_WIDGET_TYPES = new Set(["docker", "system", "media", "downloads", "network", "rss", "weather", "calendar", "releases", "stocks"]);

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

function WidgetContent({ widget }: { widget: WidgetInstance }) {
  const { t } = useTranslation();
  const { data: metrics } = useWidgetMetrics(
    widget.id,
    ["docker", "system", "rss", "weather", "media", "downloads", "network", "calendar", "releases", "stocks"].includes(widget.type)
  );
  const endpoint = String(widget.config.endpoint ?? "").trim();
  const notes = String(widget.config.notes ?? "").trim();
  const label = widgetEndpointLabel(widget);
  const rows: Record<string, Array<{ label: string; value: string }>> = {
    docker: [
      { label: t("widgets.scope"), value: t("widgets.containers") },
      { label: t("widgets.actions"), value: t("widgets.start_stop_restart") },
    ],
    system: [
      { label: "CPU", value: "Host" },
      { label: "RAM", value: "Host" },
    ],
    media: [
      { label: t("widgets.movies"), value: "API" },
      { label: t("widgets.streams"), value: t("widgets.live") },
    ],
    downloads: [
      { label: t("widgets.queue"), value: t("widgets.client") },
      { label: t("widgets.speed"), value: "API" },
    ],
    network: [
      { label: "DNS", value: "Status" },
      { label: t("widgets.latency"), value: t("widgets.monitor") },
    ],
    rss: [
      { label: "Feed", value: endpoint ? t("widgets.ready") : t("widgets.missing") },
      { label: t("widgets.items"), value: t("widgets.latest") },
    ],
    weather: [
      { label: t("widgets.location"), value: endpoint || t("widgets.missing") },
      { label: t("widgets.forecast"), value: t("widgets.daily") },
    ],
    notebook: [
      { label: t("widgets.mode"), value: t("widgets.quick_note") },
      { label: t("widgets.storage"), value: t("widgets.local") },
    ],
    calendar: [
      { label: t("widgets.events"), value: t("widgets.upcoming") },
      { label: t("widgets.source"), value: endpoint ? "ICS" : t("widgets.manual") },
    ],
    iframe: [
      { label: t("widgets.embed"), value: endpoint ? t("widgets.ready") : t("widgets.missing") },
      { label: t("widgets.display"), value: t("widgets.panel") },
    ],
    releases: [
      { label: t("widgets.repo"), value: endpoint || t("widgets.missing") },
      { label: t("widgets.version"), value: t("widgets.latest") },
    ],
    video: [
      { label: t("widgets.stream"), value: endpoint ? t("widgets.ready") : t("widgets.missing") },
      { label: t("widgets.mode"), value: t("widgets.player") },
    ],
    automation: [
      { label: t("widgets.trigger"), value: endpoint ? "Webhook" : t("widgets.missing") },
      { label: t("widgets.safety"), value: t("widgets.confirm") },
    ],
    entity: [
      { label: t("widgets.entity"), value: endpoint || t("widgets.missing") },
      { label: t("widgets.state"), value: t("widgets.live") },
    ],
    stocks: [
      { label: "Symbol", value: endpoint || t("widgets.missing") },
      { label: t("widgets.price"), value: t("widgets.market") },
    ],
    minecraft: [
      { label: "Server", value: endpoint || t("widgets.missing") },
      { label: t("widgets.players"), value: t("tile.online") },
    ],
    notifications: [
      { label: t("widgets.inbox"), value: t("widgets.recent") },
      { label: t("widgets.severity"), value: t("widgets.all") },
    ],
  };
  const values = metrics?.cards?.length ? metrics.cards : rows[widget.type] ?? [{ label: "Status", value: t("widgets.configured") }];

  return (
    <div className="mt-4 space-y-3">
      {label && <div className="truncate rounded-xl border border-line/45 bg-card px-3 py-1.5 text-[11px] font-medium text-t3">{label}</div>}
      <div className="grid grid-cols-2 gap-2">
        {values.slice(0, 4).map((item) => (
          <div key={`${item.label}-${item.value}`} className="min-h-[64px] rounded-2xl border border-line/45 bg-card px-3 py-2.5">
            <div className="mb-1 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-t3">{item.label}</div>
            <div className="truncate text-[13px] font-semibold tabular-nums text-t1">{item.value}</div>
          </div>
        ))}
      </div>
      {metrics?.status === "error" && <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-400">{metrics.error ?? t("widgets.unavailable")}</div>}
      {notes && <p className="text-[12px] leading-relaxed text-t3 line-clamp-2">{notes}</p>}
    </div>
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
    <div className="flex items-center gap-3 rounded-xl border border-line/50 bg-surface px-3 py-2.5 transition-all hover:border-accent/30">
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
  const [dragWidgetId, setDragWidgetId] = useState<number | null>(null);
  const [dockerActionTarget, setDockerActionTarget] = useState<{ container: DiscoveredContainer; action: "start" | "stop" | "restart" } | null>(null);
  const [tileDraft, setTileDraft] = useState<Tile[] | null>(null);
  const [widgetDraft, setWidgetDraft] = useState<WidgetInstance[] | null>(null);
  const { data: tiles } = useTiles();
  const { data: discovery } = useDockerDiscovery();
  const { data: widgets } = useWidgets();
  const { data: catalog = [] } = useWidgetCatalog();
  const deleteWidget = useDeleteWidget();
  const reorderWidgets = useReorderWidgets();
  const reorderTiles = useReorderTiles();
  const dockerAction = useDockerAction();
  const activeCatalog = catalog.filter((item) => ACTIVE_WIDGET_TYPES.has(item.type));
  const visibleWidgets = widgetDraft ?? widgets ?? [];

  const containers = discovery?.containers ?? [];
  const suggestions = containers.filter(
    (container) => !tiles?.some((tile) => tile.url === container.app.href || tile.name === container.app.name)
  );
  const labeledContainers = suggestions.filter((container) => container.app.is_labeled);
  const discoveredContainers = suggestions.filter((container) => !container.app.is_labeled);

  const openAppModal = (initial?: Partial<Tile>) => {
    setDraftApp(initial ?? null);
    setAppModalOpen(true);
  };

  const enterEditMode = () => {
    setTileDraft([...(tiles ?? [])]);
    setWidgetDraft([...(widgets ?? [])]);
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setTileDraft(null);
    setWidgetDraft(null);
    setDragWidgetId(null);
    setEditMode(false);
  };

  const saveEditMode = () => {
    if (tileDraft) reorderTiles.mutate(tileDraft.map((tile, index) => ({ id: tile.id, sort_order: index })));
    if (widgetDraft) reorderWidgets.mutate(widgetDraft.map((widget, index) => ({ id: widget.id, sort_order: index })));
    setTileDraft(null);
    setWidgetDraft(null);
    setEditMode(false);
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

  const moveWidgetBefore = (target: WidgetInstance) => {
    const source = widgetDraft ?? widgets;
    if (!dragWidgetId || dragWidgetId === target.id || !source) return;
    const dragged = source.find((widget) => widget.id === dragWidgetId);
    if (!dragged) return;
    const ordered = source.filter((widget) => widget.id !== dragWidgetId);
    const targetIndex = ordered.findIndex((widget) => widget.id === target.id);
    ordered.splice(targetIndex >= 0 ? targetIndex : ordered.length, 0, dragged);
    setWidgetDraft(ordered);
    setDragWidgetId(null);
  };

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
              <button onClick={() => openAppModal()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg"><Plus size={14} /> {t("dashboard.add_app")}</button>
              <button onClick={() => { setEditingWidget(null); setWidgetModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 hover:text-t1"><Boxes size={14} /> {t("dashboard.add_widget")}</button>
              <button onClick={saveEditMode} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-[13px] font-medium text-emerald-600 dark:text-emerald-400"><Save size={14} /> {t("common.save")}</button>
              <button onClick={cancelEditMode} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2"><X size={14} /> {t("common.cancel")}</button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <section className="rounded-xl bg-card border border-line/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="label-xs flex items-center gap-1.5"><LayoutDashboard size={11} /> {t("dashboard.apps")}</div>
            <span className="text-[11px] text-t3">{tiles?.length ?? 0}</span>
          </div>
          {tiles && tiles.length > 0 ? <TileGrid editMode={editMode} tilesOverride={tileDraft ?? undefined} onReorder={setTileDraft} /> : (
            <div className="rounded-lg border border-dashed border-line py-10 text-center text-[13px] text-t3">
              {t("dashboard.empty_apps")}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl bg-card border border-line/60 p-4">
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

          <section className="rounded-xl bg-card border border-line/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="label-xs flex items-center gap-1.5"><Activity size={11} /> {t("dashboard.widgets")}</div>
              {editMode && <button onClick={() => { setEditingWidget(null); setWidgetModalOpen(true); }} className="text-[12px] text-accent">+ {t("dashboard.widget")}</button>}
            </div>
            <div className="space-y-1.5">
              {visibleWidgets.map((widget) => (
                <div
                  key={widget.id}
                  draggable={editMode}
                  onDragStart={() => setDragWidgetId(widget.id)}
                  onDragOver={(event) => editMode && event.preventDefault()}
                  onDrop={() => moveWidgetBefore(widget)}
                  className={`relative overflow-hidden rounded-[1.35rem] border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-2xl hover:shadow-accent/10 ${editMode ? "cursor-grab border-accent/25 ring-1 ring-accent/10" : "border-line/60"}`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-accent/10 to-transparent opacity-60" />
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line/55 bg-card">
                          <IconBadge value={String(widget.config.icon ?? "")} name={widget.title} size={30} />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold text-t1">{widget.title}</div>
                          <div className="label-xs mt-1">{widget.type}</div>
                        </div>
                      </div>
                    </div>
                    {editMode && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingWidget(widget); setWidgetModalOpen(true); }} className="rounded p-1 text-t3 hover:text-accent"><Pencil size={13} /></button>
                        <button onClick={() => setDeleteWidgetTarget(widget)} className="rounded p-1 text-t3 hover:text-rose-500"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                  <WidgetContent widget={widget} />
                </div>
              ))}
              {!widgets?.length && <div className="text-[13px] text-t3">{t("dashboard.empty_widgets")}</div>}
            </div>
          </section>
        </aside>
      </div>

      {suggestions.length > 0 && (
        <section className="rounded-xl bg-card border border-line/60 p-4">
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
