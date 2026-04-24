import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Eye,
  LayoutDashboard,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
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

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-cyan-400/10 bg-slate-950/70 p-4 shadow-[0_18px_60px_rgba(2,8,23,0.25)]">
      <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/60">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-50">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
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
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? "bg-emerald-400" : "bg-slate-500"}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-100">{container.name}</div>
        <div className="truncate text-[11px] text-slate-500">{container.image}</div>
      </div>
      <div className="hidden text-xs text-slate-400 md:block">{container.ports.join(", ") || "no public port"}</div>
      <div className="flex items-center gap-1">
        <button onClick={() => runAction("start")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-300"><Play size={14} /></button>
        <button onClick={() => runAction("stop")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-300"><Pause size={14} /></button>
        <button onClick={() => runAction("restart")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"><RefreshCw size={14} /></button>
      </div>
    </div>
  );
}

function DiscoveryCard({ container }: { container: DiscoveredContainer }) {
  const adopt = useAdoptContainer();
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${container.state === "running" ? "bg-emerald-400" : "bg-slate-500"}`} />
            <h3 className="truncate text-sm font-semibold text-slate-100">{container.app.name}</h3>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{container.app.href ?? container.image}</p>
        </div>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
          {container.app.is_labeled ? "label" : "auto"}
        </span>
      </div>
      {container.app.description && <p className="mt-3 line-clamp-2 text-xs text-slate-400">{container.app.description}</p>}
      <button
        disabled={!container.app.href || adopt.isPending}
        onClick={() => adopt.mutate(container.id)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={15} /> Als App übernehmen
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
  const runningCount = containers.filter((container) => container.state === "running").length;
  const unhealthyCount = containers.filter((container) => /unhealthy|exited|dead/i.test(container.status)).length;
  const mainDisk = disks[0];
  const discoveredSuggestions = containers.filter(
    (container) => !tiles?.some((tile) => tile.url === container.app.href || tile.name === container.app.name)
  );
  const tileMap = useMemo(() => new Map((tiles ?? []).map((tile) => [tile.id, tile.name])), [tiles]);

  return (
    <div className="min-h-full space-y-6 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32rem),radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_28rem)] text-slate-100">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              <ShieldCheck size={14} /> Homelab Command Center
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">TheDash Operations</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Docker-Apps, Systemzustand, Widgets und Arbeitsbereiche in einer kontrollierten Oberfläche.</p>
          </div>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/20">
                <SlidersHorizontal size={16} /> Bearbeiten
              </button>
            ) : (
              <>
                <button onClick={() => setEditMode(false)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"><Save size={16} /> Speichern</button>
                <button onClick={() => setEditMode(false)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300"><X size={16} /> Abbrechen</button>
              </>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="CPU" value={`${Math.round(cpu)}%`} detail="Host load" />
          <StatCard label="RAM" value={`${Math.round(ram.percent)}%`} detail={`${formatBytes(ram.used)} / ${formatBytes(ram.total)}`} />
          <StatCard label="Docker" value={`${runningCount}/${containers.length}`} detail="running containers" />
          <StatCard label="Alerts" value={`${unhealthyCount}`} detail={mainDisk ? `Disk ${Math.round(mainDisk.percent)}%` : "No disk data"} />
        </div>
      </section>

      {editMode && (
        <section className="grid gap-4 rounded-3xl border border-amber-400/20 bg-slate-950/80 p-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-100"><Plus size={16} /> Dashboard bearbeiten</h2>
            <div className="flex gap-2">
              <input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="Neue Sektion" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none" />
              <button onClick={() => { if (!sectionTitle.trim()) return; createSection.mutate({ title: sectionTitle.trim() }, { onSuccess: () => setSectionTitle("") }); }} className="rounded-xl bg-amber-300 px-3 py-2 text-sm font-semibold text-slate-950">+ Sektion</button>
            </div>
          </div>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-100"><Boxes size={16} /> Widget-Katalog</h2>
            <div className="flex gap-2">
              <select value={selectedWidgetType} onChange={(e) => setSelectedWidgetType(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                {catalog?.map((item) => <option key={item.type} value={item.type}>{item.title} · {item.category}</option>)}
              </select>
              <button onClick={() => { const item = catalog?.find((entry) => entry.type === selectedWidgetType); if (item) createWidget.mutate({ type: item.type, title: item.title }); }} className="rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950">+ Widget</button>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/75 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300"><LayoutDashboard size={16} /> Apps</h2>
            <span className="text-xs text-slate-500">{tiles?.length ?? 0} tiles</span>
          </div>
          {tiles && tiles.length > 0 ? <TileGrid /> : <div className="rounded-2xl border border-dashed border-slate-800 py-12 text-center text-sm text-slate-500">Keine Apps angelegt. Im Edit Mode Docker-Apps übernehmen.</div>}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/75 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300"><Server size={16} /> Docker Control</h2>
            <div className="space-y-2">
              {containers.slice(0, 8).map((container) => <ContainerRow key={container.id} container={container} />)}
              {discovery?.status === "disabled" && <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">Docker Monitoring ist deaktiviert oder nicht erreichbar.</div>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/75 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300"><Activity size={16} /> Widgets</h2>
            <div className="grid gap-2">
              {widgets?.map((widget) => (
                <div key={widget.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-100">{widget.title}</div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">{widget.type}</div>
                  </div>
                  {editMode && <button onClick={() => deleteWidget.mutate(widget.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={14} /></button>}
                </div>
              ))}
              {!widgets?.length && <div className="text-sm text-slate-500">Noch keine Widgets konfiguriert.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/75 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300"><Eye size={16} /> Discovered Apps</h2>
          <span className="text-xs text-slate-500">Labels + Auto</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {discoveredSuggestions.slice(0, 8).map((container) => <DiscoveryCard key={container.id} container={container} />)}
          {!discoveredSuggestions.length && <div className="rounded-2xl border border-slate-800 p-4 text-sm text-slate-500">Keine neuen Container-Vorschläge.</div>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/75 p-4">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300"><AlertTriangle size={16} /> Dashboard Board</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {dashboardSections?.map((section) => (
            <div key={section.id} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (!draggedCardId) return; moveCard.mutate({ id: draggedCardId, section_id: section.id, sort_order: 99999 }); setDraggedCardId(null); }} className="w-[320px] shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                <h3 className="truncate text-sm font-semibold text-slate-100">{section.title}</h3>
                {editMode && <button onClick={() => deleteSection.mutate(section.id)} className="rounded p-1 text-slate-500 hover:text-rose-300"><Trash2 size={14} /></button>}
              </div>
              <div className="min-h-[130px] space-y-2 p-3">
                {section.cards.map((card) => (
                  <div key={card.id} draggable={editMode} onDragStart={() => setDraggedCardId(card.id)} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-100">{card.title}</div>
                        {card.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.description}</p>}
                        {card.tile_id && <p className="mt-1 text-[11px] text-cyan-300">{tileMap.get(card.tile_id) ?? `Tile #${card.tile_id}`}</p>}
                      </div>
                      {editMode && <button onClick={() => deleteCard.mutate(card.id)} className="text-slate-500 hover:text-rose-300"><Trash2 size={13} /></button>}
                    </div>
                  </div>
                ))}
                {editMode && (
                  <div className="flex gap-2 pt-1">
                    <input value={cardDrafts[section.id] ?? ""} onChange={(e) => setCardDrafts((prev) => ({ ...prev, [section.id]: e.target.value }))} placeholder="Neue Karte" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100" />
                    <button onClick={() => { const title = (cardDrafts[section.id] ?? "").trim(); if (!title) return; createCard.mutate({ section_id: section.id, title }, { onSuccess: () => setCardDrafts((prev) => ({ ...prev, [section.id]: "" })) }); }} className="rounded-lg bg-cyan-300 px-2 text-xs font-semibold text-slate-950">+</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
