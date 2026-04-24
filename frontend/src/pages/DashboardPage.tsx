import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Eye,
  LayoutDashboard,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Server,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import TileGrid from "../components/tiles/TileGrid";
import { useMetricsStore } from "../store/useMetricsStore";
import { useTiles } from "../hooks/useTiles";
import {
  useCreateDashboardCard,
  useCreateDashboardSection,
  useDashboardSections,
  useDeleteDashboardCard,
  useDeleteDashboardSection,
  useMoveDashboardCard,
} from "../hooks/useDashboardBoard";
import {
  DiscoveredContainer,
  useAdoptContainer,
  useDockerAction,
  useDockerDiscovery,
} from "../hooks/useDockerDiscovery";
import { useCreateWidget, useDeleteWidget, useWidgetCatalog, useWidgets } from "../hooks/useWidgets";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-card border border-line/60 p-4">
      <div className="label-xs mb-2">{label}</div>
      <div className="text-2xl font-semibold text-t1 tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] text-t3">{sub}</div>
    </div>
  );
}

function ContainerRow({ container }: { container: DiscoveredContainer }) {
  const dockerAction = useDockerAction();
  const isRunning = container.state === "running";

  const runAction = (action: "start" | "stop" | "restart") => {
    if (!window.confirm(`${action} ${container.name}?`)) return;
    dockerAction.mutate({ id: container.id, action });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-line/50 bg-surface px-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${isRunning ? "bg-emerald-400" : "bg-t3"}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-t1">{container.name}</div>
        <div className="truncate text-[11px] text-t3">{container.image}</div>
      </div>
      <div className="hidden text-[11px] text-t3 md:block tabular-nums">
        {container.ports.join(", ") || "—"}
      </div>
      <div className="flex items-center gap-0.5">
        <button onClick={() => runAction("start")} className="rounded p-1 text-t3 hover:bg-line/40 hover:text-emerald-400 transition-colors"><Play size={13} /></button>
        <button onClick={() => runAction("stop")} className="rounded p-1 text-t3 hover:bg-line/40 hover:text-amber-400 transition-colors"><Pause size={13} /></button>
        <button onClick={() => runAction("restart")} className="rounded p-1 text-t3 hover:bg-line/40 hover:text-accent transition-colors"><RefreshCw size={13} /></button>
      </div>
    </div>
  );
}

function DiscoveryCard({ container }: { container: DiscoveredContainer }) {
  const adopt = useAdoptContainer();
  return (
    <div className="rounded-xl bg-card border border-line/60 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${container.state === "running" ? "bg-emerald-400" : "bg-t3"}`} />
            <h3 className="truncate text-[13px] font-semibold text-t1">{container.app.name}</h3>
          </div>
          <p className="truncate text-[11px] text-t3">{container.app.href ?? container.image}</p>
        </div>
        <span className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-t3">
          {container.app.is_labeled ? "label" : "auto"}
        </span>
      </div>
      {container.app.description && (
        <p className="line-clamp-2 text-[11px] text-t2">{container.app.description}</p>
      )}
      <button
        disabled={!container.app.href || adopt.isPending}
        onClick={() => adopt.mutate(container.id)}
        className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        <Plus size={14} /> Übernehmen
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [editMode, setEditMode] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);
  const [cardDrafts, setCardDrafts] = useState<Record<number, string>>({});
  const [selectedWidgetType, setSelectedWidgetType] = useState("docker");
  const { cpu, ram, disks } = useMetricsStore();
  const { data: tiles } = useTiles();
  const { data: discovery } = useDockerDiscovery();
  const { data: dashboardSections } = useDashboardSections();
  const { data: widgets } = useWidgets();
  const { data: catalog } = useWidgetCatalog();
  const createWidget = useCreateWidget();
  const deleteWidget = useDeleteWidget();
  const createSection = useCreateDashboardSection();
  const deleteSection = useDeleteDashboardSection();
  const createCard = useCreateDashboardCard();
  const deleteCard = useDeleteDashboardCard();
  const moveCard = useMoveDashboardCard();

  const containers = discovery?.containers ?? [];
  const runningCount = containers.filter((c) => c.state === "running").length;
  const unhealthyCount = containers.filter((c) => /unhealthy|exited|dead/i.test(c.status)).length;
  const mainDisk = disks[0];
  const discoveredSuggestions = containers.filter(
    (c) => !tiles?.some((t) => t.url === c.app.href || t.name === c.app.name)
  );
  const tileMap = useMemo(() => new Map((tiles ?? []).map((t) => [t.id, t.name])), [tiles]);

  return (
    <div className="space-y-5 text-t1">

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-xs mb-1">Overview</div>
          <h1 className="text-xl font-semibold text-t1">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-t2 hover:text-t1 hover:border-accent/40 transition-colors"
            >
              <SlidersHorizontal size={14} /> Bearbeiten
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-[13px] font-medium text-emerald-400"
              >
                <Save size={14} /> Speichern
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2"
              >
                <X size={14} /> Abbrechen
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="CPU" value={`${Math.round(cpu)}%`} sub="Host load" />
        <StatCard label="RAM" value={`${Math.round(ram.percent)}%`} sub={`${formatBytes(ram.used)} / ${formatBytes(ram.total)}`} />
        <StatCard label="Docker" value={`${runningCount} / ${containers.length}`} sub="Running containers" />
        <StatCard label="Alerts" value={`${unhealthyCount}`} sub={mainDisk ? `Disk ${Math.round(mainDisk.percent)}%` : "No disk data"} />
      </div>

      {/* ── Edit tools ──────────────────────────────────── */}
      {editMode && (
        <div className="grid gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 sm:grid-cols-2">
          <div>
            <div className="label-xs mb-2">Neue Sektion</div>
            <div className="flex gap-2">
              <input
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Sektions-Titel"
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-t1 outline-none focus:border-accent/50"
              />
              <button
                onClick={() => {
                  if (!sectionTitle.trim()) return;
                  createSection.mutate({ title: sectionTitle.trim() }, { onSuccess: () => setSectionTitle("") });
                }}
                className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg"
              >
                + Sektion
              </button>
            </div>
          </div>
          <div>
            <div className="label-xs mb-2"><Boxes size={10} className="inline mr-1" />Widget-Katalog</div>
            <div className="flex gap-2">
              <select
                value={selectedWidgetType}
                onChange={(e) => setSelectedWidgetType(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-t1 outline-none"
              >
                {catalog?.map((item) => (
                  <option key={item.type} value={item.type}>{item.title} · {item.category}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const item = catalog?.find((e) => e.type === selectedWidgetType);
                  if (item) createWidget.mutate({ type: item.type, title: item.title });
                }}
                className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg"
              >
                + Widget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Apps + Docker ────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl bg-card border border-line/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="label-xs flex items-center gap-1.5"><LayoutDashboard size={11} /> Apps</div>
            <span className="text-[11px] text-t3">{tiles?.length ?? 0} tiles</span>
          </div>
          {tiles && tiles.length > 0 ? (
            <TileGrid />
          ) : (
            <div className="rounded-lg border border-dashed border-line py-10 text-center text-[13px] text-t3">
              Keine Apps angelegt. Im Edit-Modus Docker-Apps übernehmen.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-card border border-line/60 p-4">
            <div className="label-xs mb-3 flex items-center gap-1.5"><Server size={11} /> Docker</div>
            <div className="space-y-1.5">
              {containers.slice(0, 8).map((c) => <ContainerRow key={c.id} container={c} />)}
              {discovery?.status === "disabled" && (
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-[12px] text-amber-300">
                  Docker-Monitoring ist deaktiviert.
                </div>
              )}
              {!containers.length && discovery?.status !== "disabled" && (
                <div className="text-[13px] text-t3">Keine Container gefunden.</div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-card border border-line/60 p-4">
            <div className="label-xs mb-3 flex items-center gap-1.5"><Activity size={11} /> Widgets</div>
            <div className="space-y-1.5">
              {widgets?.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-lg border border-line/50 bg-surface px-3 py-2">
                  <div>
                    <div className="text-[13px] font-medium text-t1">{w.title}</div>
                    <div className="label-xs mt-0.5">{w.type}</div>
                  </div>
                  {editMode && (
                    <button onClick={() => deleteWidget.mutate(w.id)} className="rounded p-1 text-t3 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              {!widgets?.length && <div className="text-[13px] text-t3">Keine Widgets konfiguriert.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Discovered Apps ──────────────────────────────── */}
      {discoveredSuggestions.length > 0 && (
        <div className="rounded-xl bg-card border border-line/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="label-xs flex items-center gap-1.5"><Eye size={11} /> Discovered Apps</div>
            <span className="text-[11px] text-t3">Labels + Auto-Detect</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {discoveredSuggestions.slice(0, 8).map((c) => <DiscoveryCard key={c.id} container={c} />)}
          </div>
        </div>
      )}

      {/* ── Dashboard Board ──────────────────────────────── */}
      {((dashboardSections && dashboardSections.length > 0) || editMode) && (
        <div className="rounded-xl bg-card border border-line/60 p-4">
          <div className="label-xs mb-4 flex items-center gap-1.5"><AlertTriangle size={11} /> Dashboard Board</div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {dashboardSections?.map((section) => (
              <div
                key={section.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!draggedCardId) return;
                  moveCard.mutate({ id: draggedCardId, section_id: section.id, sort_order: 99999 });
                  setDraggedCardId(null);
                }}
                className="w-[280px] shrink-0 rounded-xl border border-line/60 bg-surface"
              >
                <div className="flex items-center justify-between border-b border-line/40 px-3 py-2">
                  <h3 className="truncate text-[13px] font-semibold text-t1">{section.title}</h3>
                  {editMode && (
                    <button onClick={() => deleteSection.mutate(section.id)} className="rounded p-0.5 text-t3 hover:text-rose-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className="min-h-[100px] space-y-1.5 p-2">
                  {section.cards.map((card) => (
                    <div
                      key={card.id}
                      draggable={editMode}
                      onDragStart={() => setDraggedCardId(card.id)}
                      className="rounded-lg border border-line/40 bg-card px-3 py-2"
                    >
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-t1">{card.title}</div>
                          {card.description && (
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-t3">{card.description}</p>
                          )}
                          {card.tile_id && (
                            <p className="mt-0.5 text-[10px] text-accent">{tileMap.get(card.tile_id) ?? `Tile #${card.tile_id}`}</p>
                          )}
                        </div>
                        {editMode && (
                          <button onClick={() => deleteCard.mutate(card.id)} className="shrink-0 text-t3 hover:text-rose-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {editMode && (
                    <div className="flex gap-1.5 pt-1">
                      <input
                        value={cardDrafts[section.id] ?? ""}
                        onChange={(e) => setCardDrafts((prev) => ({ ...prev, [section.id]: e.target.value }))}
                        placeholder="Neue Karte"
                        className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1 text-[12px] text-t1 outline-none focus:border-accent/50"
                      />
                      <button
                        onClick={() => {
                          const title = (cardDrafts[section.id] ?? "").trim();
                          if (!title) return;
                          createCard.mutate(
                            { section_id: section.id, title },
                            { onSuccess: () => setCardDrafts((prev) => ({ ...prev, [section.id]: "" })) }
                          );
                        }}
                        className="rounded-lg bg-accent px-2 text-[12px] font-semibold text-bg"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
