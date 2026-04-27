import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Download, Upload } from "lucide-react";
import Modal from "../ui/Modal";
import { useSettingsStore } from "../../store/useSettingsStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="label-xs mb-2">{label}</div>
      <div className="inline-flex overflow-hidden rounded-lg border border-line/60">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
              value === opt.value
                ? "bg-accent text-bg"
                : "text-t2 hover:bg-line/30 hover:text-t1"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { theme, language, widgetStyle, setTheme, setLanguage, setWidgetStyle } = useSettingsStore();
  const importRef = useRef<HTMLInputElement>(null);
  const [runtime, setRuntime] = useState<{ aiTagging: { enabled: boolean; provider: string; model: string | null }; logos: { provider: string } } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings/runtime")
      .then((res) => res.json())
      .then(setRuntime)
      .catch(() => setRuntime(null));
  }, [open]);

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
      if (res.ok) window.location.reload();
      else alert(t("settings.import_error"));
    } catch {
      alert(t("settings.import_error"));
    }
    e.target.value = "";
  };

  return (
    <Modal open={open} onClose={onClose} title={t("settings.title")}>
      <div className="space-y-5">
        <ToggleGroup
          label={t("settings.theme")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light" as const, label: `☀ ${t("settings.theme_light")}` },
            { value: "dark" as const, label: `☾ ${t("settings.theme_dark")}` },
          ]}
        />

        <ToggleGroup
          label={t("settings.language")}
          value={language}
          onChange={setLanguage}
          options={[
            { value: "de" as const, label: "🇩🇪 Deutsch" },
            { value: "en" as const, label: "🇬🇧 English" },
          ]}
        />

        <ToggleGroup
          label={t("settings.widget_style")}
          value={widgetStyle}
          onChange={setWidgetStyle}
          options={[
            { value: "card" as const, label: t("settings.style_card") },
            { value: "compact" as const, label: t("settings.style_compact") },
            { value: "minimal" as const, label: t("settings.style_minimal") },
          ]}
        />

        <div className="grid gap-3 border-t border-line/40 pt-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line/60 bg-surface p-3">
            <div className="label-xs mb-1">{t("settings.ai_tagging")}</div>
            <div className="text-[13px] font-semibold text-t1">
              {runtime?.aiTagging.enabled ? t("settings.enabled") : t("settings.local_fallback")}
            </div>
            <div className="mt-1 text-[11px] text-t3">
              {runtime?.aiTagging.provider ?? "local"}{runtime?.aiTagging.model ? ` · ${runtime.aiTagging.model}` : ""}
            </div>
          </div>
          <div className="rounded-xl border border-line/60 bg-surface p-3">
            <div className="label-xs mb-1">{t("settings.logo_provider")}</div>
            <div className="text-[13px] font-semibold text-t1">{runtime?.logos.provider ?? "simple-icons"}</div>
            <div className="mt-1 text-[11px] text-t3">{t("settings.logo_provider_hint")}</div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-line/40">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 hover:text-t1 hover:border-accent/40 transition-colors"
          >
            <Download size={13} /> {t("settings.export")}
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-t2 hover:text-t1 hover:border-accent/40 transition-colors"
          >
            <Upload size={13} /> {t("settings.import")}
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>
    </Modal>
  );
}
