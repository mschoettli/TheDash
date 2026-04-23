import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Bookmark, FileText, Settings } from "lucide-react";
import { useMetricsStore } from "../../store/useMetricsStore";
import MetricBar from "../metrics/MetricBar";
import SettingsModal from "../settings/SettingsModal";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, key: "nav.dashboard" },
  { to: "/bookmarks", icon: Bookmark, key: "nav.bookmarks" },
  { to: "/notes", icon: FileText, key: "nav.notes" },
];

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
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white shrink-0">
              The<span className="text-indigo-500">Dash</span>
            </span>

            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <span>
                {now.toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                {now.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, key }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`
                  }
                >
                  <Icon size={16} />
                  {t(key)}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="hidden lg:flex items-center gap-2 overflow-x-auto max-w-[50vw] pb-1">
              <MetricBar label={t("metrics.cpu")} value={`${Math.round(cpu)}%`} percent={cpu} />
              <MetricBar
                label={t("metrics.ram")}
                value={`${formatBytes(ram.used)} (${Math.round(ram.percent)}%)`}
                percent={ram.percent}
              />
              {mainDisk && (
                <MetricBar
                  label={t("metrics.disk")}
                  value={`${formatBytes(mainDisk.used)} (${Math.round(mainDisk.percent)}%)`}
                  percent={mainDisk.percent}
                />
              )}
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition-colors"
              title={t("header.settings")}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-3 flex items-center gap-1 overflow-x-auto">
          {navItems.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              <Icon size={16} />
              {t(key)}
            </NavLink>
          ))}
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}