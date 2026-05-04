import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Bookmark, Layers3, Settings, Clock3 } from "lucide-react";
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
  { to: "/workspace", icon: Layers3, key: "nav.workspace" },
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
      <header className="shrink-0 bg-surface border-b border-line/60">
        <div className="h-14 px-4 md:px-6 flex items-center gap-5">

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img src="/favicon.svg" alt="TheDash" className="w-6 h-6" />
            <span className="text-[15px] font-bold tracking-tight text-t1">
              The<span className="text-accent">Dash</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-t2 hover:text-t1 hover:bg-line/30"
                  }`
                }
              >
                <Icon size={14} />
                {t(key)}
              </NavLink>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Metrics */}
          <div className="hidden lg:flex items-center gap-1.5">
            <MetricBar label={t("metrics.cpu")} value={`${Math.round(cpu)}%`} percent={cpu} />
            <MetricBar
              label={t("metrics.ram")}
              value={`${formatBytes(ram.used)} · ${Math.round(ram.percent)}%`}
              percent={ram.percent}
            />
            {mainDisk && (
              <MetricBar
                label={t("metrics.disk")}
                value={`${formatBytes(mainDisk.used)} · ${Math.round(mainDisk.percent)}%`}
                percent={mainDisk.percent}
              />
            )}
          </div>

          {/* Datetime */}
          <div className="time-pill hidden sm:flex">
            <Clock3 size={13} className="time-pill__icon" />
            <span className="time-pill__date">
              {now.toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="time-pill__divider" />
            <span className="time-pill__time">
              {now.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-t2 hover:text-t1 hover:bg-line/40 transition-colors"
            title={t("header.settings")}
          >
            <Settings size={17} />
          </button>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden px-4 pb-2.5 flex items-center gap-0.5 border-t border-line/40">
          {navItems.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-t2 hover:text-t1 hover:bg-line/30"
                }`
              }
            >
              <Icon size={14} />
              {t(key)}
            </NavLink>
          ))}
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
