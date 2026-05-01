import { ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Image, RotateCcw, Upload } from "lucide-react";
import Modal from "../ui/Modal";
import { useSettingsStore } from "../../store/useSettingsStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const fieldClass =
  "w-full rounded-xl border border-line/50 bg-card px-3 py-2 text-[13px] text-t1 outline-none placeholder:text-t3 focus:border-accent/50";

function SettingSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line/45 bg-card/60 p-4">
      <div className="label-xs mb-3">{title}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1.5 rounded-xl border border-line/45 bg-surface/40 p-1 sm:grid-cols-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${
            value === opt.value
              ? "bg-accent text-bg shadow-sm"
              : "text-t2 hover:bg-line/25 hover:text-t1"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const {
    theme,
    language,
    widgetStyle,
    backgroundMode,
    backgroundImage,
    setTheme,
    setLanguage,
    setWidgetStyle,
    setBackgroundMode,
    setBackgroundImage,
  } = useSettingsStore();
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
    <Modal open={open} onClose={onClose} title={t("settings.title")} maxWidth="max-w-2xl">
      <div className="grid gap-4">
        <SettingSection title={t("settings.appearance")}>
          <ToggleGroup
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light" as const, label: t("settings.theme_light") },
              { value: "dark" as const, label: t("settings.theme_dark") },
              { value: "dashy" as const, label: t("settings.theme_dashy") },
            ]}
          />
          <ToggleGroup
            value={widgetStyle}
            onChange={setWidgetStyle}
            options={[
              { value: "card" as const, label: t("settings.style_card") },
              { value: "compact" as const, label: t("settings.style_compact") },
              { value: "minimal" as const, label: t("settings.style_minimal") },
            ]}
          />
        </SettingSection>

        <div className="grid gap-4 md:grid-cols-2">
          <SettingSection title={t("settings.language")}>
            <ToggleGroup
              value={language}
              onChange={setLanguage}
              options={[
                { value: "de" as const, label: "Deutsch" },
                { value: "en" as const, label: "English" },
              ]}
            />
          </SettingSection>

          <SettingSection title={t("settings.runtime")}>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line/40 bg-surface/40 p-3">
                <div className="label-xs mb-1">{t("settings.ai_tagging")}</div>
                <div className="truncate text-[13px] font-semibold text-t1">
                  {runtime?.aiTagging.enabled ? t("settings.enabled") : t("settings.local_fallback")}
                </div>
                <div className="mt-1 truncate text-[11px] text-t3">
                  {runtime?.aiTagging.provider ?? "local"}{runtime?.aiTagging.model ? ` · ${runtime.aiTagging.model}` : ""}
                </div>
              </div>
              <div className="rounded-xl border border-line/40 bg-surface/40 p-3">
                <div className="label-xs mb-1">{t("settings.logo_provider")}</div>
                <div className="truncate text-[13px] font-semibold text-t1">{runtime?.logos.provider ?? "simple-icons"}</div>
                <div className="mt-1 truncate text-[11px] text-t3">{t("settings.logo_provider_hint")}</div>
              </div>
            </div>
          </SettingSection>
        </div>

        <SettingSection title={t("settings.background")}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12px] leading-5 text-t3">{t("settings.background_hint")}</p>
            <Image size={18} className="shrink-0 text-accent" />
          </div>
          <ToggleGroup
            value={backgroundMode}
            onChange={setBackgroundMode}
            options={[
              { value: "default" as const, label: t("settings.background_default") },
              { value: "custom" as const, label: t("settings.background_custom") },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={backgroundImage}
              onChange={(event) => setBackgroundImage(event.target.value)}
              placeholder="https://example.com/background.jpg"
              className={fieldClass}
            />
            <button
              onClick={() => {
                setBackgroundImage("");
                setBackgroundMode("default");
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line/50 px-3 py-2 text-[13px] font-medium text-t2 transition-colors hover:border-accent/35 hover:text-t1"
            >
              <RotateCcw size={13} /> {t("settings.reset")}
            </button>
          </div>
        </SettingSection>

        <SettingSection title={t("settings.backup")}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line/50 px-3 py-2 text-[13px] font-medium text-t2 transition-colors hover:border-accent/35 hover:text-t1"
            >
              <Download size={13} /> {t("settings.export")}
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line/50 px-3 py-2 text-[13px] font-medium text-t2 transition-colors hover:border-accent/35 hover:text-t1"
            >
              <Upload size={13} /> {t("settings.import")}
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </SettingSection>
      </div>
    </Modal>
  );
}
