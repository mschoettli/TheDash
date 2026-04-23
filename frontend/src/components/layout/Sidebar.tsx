import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { LayoutDashboard, Bookmark, FileText } from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, key: "nav.dashboard" },
  { to: "/bookmarks", icon: Bookmark, key: "nav.bookmarks" },
  { to: "/notes", icon: FileText, key: "nav.notes" },
];

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
      <div className="h-14 flex items-center px-5 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
        <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
          The<span className="text-indigo-500">Dash</span>
        </span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200"
              }`
            }
          >
            {({ isActive }) => (
              <motion.span
                className="flex items-center gap-3 w-full"
                whileHover={{ x: isActive ? 0 : 3 }}
              >
                <Icon size={18} />
                {t(key)}
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
