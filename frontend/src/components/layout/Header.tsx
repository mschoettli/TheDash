import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import { useMetricsStore } from "../../store/useMetricsStore";
import MetricBar from "../metrics/MetricBar";
import SettingsModal from "../settings/SettingsModal";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function Header() {
  const { t } = useTranslation();
  const { cpu, ram, disks } = useMetricsStore();
  const [now, setNow] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const mainDisk = disks[0];

  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {now.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
            <span className="ml-3 font-mono text-slate-500 dark:text-slate-400">
              {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <MetricBar label={t("metrics.cpu")} percent={cpu} />
            <MetricBar
              label={t("metrics.ram")}
              percent={ram.percent}
              detail={`${formatBytes(ram.used)}`}
            />
            {mainDisk && (
              <MetricBar
                label={t("metrics.disk")}
                percent={mainDisk.percent}
                detail={`${formatBytes(mainDisk.used)}`}
              />
            )}
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            title={t("header.settings")}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
