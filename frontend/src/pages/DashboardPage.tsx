import { useTranslation } from "react-i18next";
import { LayoutGrid, Server } from "lucide-react";
import TileGrid from "../components/tiles/TileGrid";
import AddButton from "../components/ui/AddButton";
import { useDockerStore } from "../store/useDockerStore";
import ContainerBadge from "../components/docker/ContainerBadge";
import { useTiles } from "../hooks/useTiles";

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

  const runningContainers = containers.filter((c) => c.state === "running");

  return (
    <div className="space-y-8 pb-20">
      {/* Widgets */}
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

      {/* Docker Container */}
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

      <AddButton />
    </div>
  );
}
