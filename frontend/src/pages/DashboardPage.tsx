import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Plus, Server, Trash2 } from "lucide-react";
import TileGrid from "../components/tiles/TileGrid";
import AddButton from "../components/ui/AddButton";
import { useDockerStore } from "../store/useDockerStore";
import ContainerBadge from "../components/docker/ContainerBadge";
import { useTiles } from "../hooks/useTiles";
import {
  useCreateDashboardCard,
  useCreateDashboardSection,
  useDashboardSections,
  useDeleteDashboardCard,
  useDeleteDashboardSection,
  useMoveDashboardCard,
} from "../hooks/useDashboardBoard";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {children}
      </h2>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const containers = useDockerStore((s) => s.containers);
  const { data: tiles } = useTiles();
  const { data: dashboardSections } = useDashboardSections();
  const createSection = useCreateDashboardSection();
  const deleteSection = useDeleteDashboardSection();
  const createCard = useCreateDashboardCard();
  const deleteCard = useDeleteDashboardCard();
  const moveCard = useMoveDashboardCard();

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);
  const [cardDrafts, setCardDrafts] = useState<Record<number, string>>({});

  const runningContainers = containers.filter((c) => c.state === "running");
  const tileMap = useMemo(() => new Map((tiles ?? []).map((tile) => [tile.id, tile.name])), [tiles]);

  return (
    <div className="space-y-8 pb-20">
      <section>
        <SectionTitle>
          <LayoutGrid size={13} className="inline mr-1" />
          {t("dashboard.docker_apps")}
        </SectionTitle>

        {tiles && tiles.length > 0 ? (
          <TileGrid />
        ) : (
          <div className="text-center py-16 text-slate-400">
            <LayoutGrid size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("dashboard.add_first")}</p>
            <p className="text-xs mt-1 opacity-70">{t("dashboard.add_hint")}</p>
          </div>
        )}
      </section>

      {containers.length > 0 && (
        <section>
          <SectionTitle>
            <Server size={13} className="inline mr-1" />
            Docker
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {runningContainers.map((c) => (
              <ContainerBadge key={c.id} container={c} />
            ))}
            {containers
              .filter((c) => c.state !== "running")
              .map((c) => (
                <ContainerBadge key={c.id} container={c} />
              ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>{t("dashboard.kanban")}</SectionTitle>

        <div className="flex items-center gap-2 mb-4">
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder={t("dashboard.new_section")}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          />
          <button
            onClick={() => {
              const title = newSectionTitle.trim();
              if (!title) return;
              createSection.mutate({ title }, { onSuccess: () => setNewSectionTitle("") });
            }}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm"
          >
            <Plus size={14} /> {t("dashboard.add_section")}
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {dashboardSections?.map((section) => (
            <div
              key={section.id}
              className="w-[320px] shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggedCardId) return;
                moveCard.mutate({ id: draggedCardId, section_id: section.id, sort_order: 99999 });
                setDraggedCardId(null);
              }}
            >
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {section.title}
                </h3>
                <button
                  onClick={() => deleteSection.mutate(section.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-500"
                  title={t("common.confirm_delete")}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="p-3 space-y-2 min-h-[120px]">
                {section.cards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDraggedCardId(card.id)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 cursor-grab"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-100">
                          {card.title}
                        </div>
                        {card.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-3">{card.description}</p>
                        )}
                        {card.tile_id && (
                          <p className="text-[11px] text-indigo-500 mt-1">
                            {tileMap.get(card.tile_id) ?? `Tile #${card.tile_id}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteCard.mutate(card.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-1 flex gap-2">
                  <input
                    value={cardDrafts[section.id] ?? ""}
                    onChange={(e) =>
                      setCardDrafts((prev) => ({
                        ...prev,
                        [section.id]: e.target.value,
                      }))
                    }
                    placeholder={t("dashboard.new_card")}
                    className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                  />
                  <button
                    onClick={() => {
                      const title = (cardDrafts[section.id] ?? "").trim();
                      if (!title) return;
                      createCard.mutate(
                        { section_id: section.id, title },
                        {
                          onSuccess: () =>
                            setCardDrafts((prev) => ({
                              ...prev,
                              [section.id]: "",
                            })),
                        }
                      );
                    }}
                    className="px-2 py-1.5 rounded-md bg-indigo-500 text-white text-xs"
                  >
                    {t("dashboard.add_card")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AddButton />
    </div>
  );
}