import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Download, Upload } from "lucide-react";
import Modal from "../ui/Modal";
import { useSettingsStore } from "../../store/useSettingsStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { theme, language, widgetStyle, setTheme, setLanguage, setWidgetStyle } =
    useSettingsStore();
  const importRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const res = await fetch("/api/export");
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "thedash-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert(t("settings.import_error"));
      }
    } catch {
      alert(t("settings.import_error"));
    }
    e.target.value = "";
  };

  const styleOptions: Array<{ value: "card" | "compact" | "minimal"; label: string }> = [
    { value: "card", label: t("settings.style_card") },
    { value: "compact", label: t("settings.style_compact") },
    { value: "minimal", label: t("settings.style_minimal") },
  ];

  return (
    <Modal open={open} onClose={onClose} title={t("settings.title")}>
      <div className="space-y-6">
        {/* Theme */}
        <div>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">
            {t("settings.theme")}
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                theme === "light"
                  ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
              }`}
            >
              <Sun size={15} /> {t("settings.theme_light")}
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                theme === "dark"
                  ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
              }`}
            >
              <Moon size={15} /> {t("settings.theme_dark")}
            </button>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">
            {t("settings.language")}
          </label>
          <div className="flex gap-2">
            {(["de", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  language === lang
                    ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                {lang === "de" ? "🇩🇪 Deutsch" : "🇬🇧 English"}
              </button>
            ))}
          </div>
        </div>

        {/* Widget Style */}
        <div>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">
            {t("settings.widget_style")}
          </label>
          <div className="flex gap-2">
            {styleOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setWidgetStyle(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  widgetStyle === value
                    ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Export / Import */}
        <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download size={15} /> {t("settings.export")}
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Upload size={15} /> {t("settings.import")}
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>
    </Modal>
  );
}
