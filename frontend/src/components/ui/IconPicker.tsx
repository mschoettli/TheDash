import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { detectIconKey, findIconOption, iconKeyFromValue, iconValue, ICON_OPTIONS } from "../../lib/iconRegistry";
import IconBadge from "./IconBadge";

interface IconPickerProps {
  value?: string | null;
  name: string;
  onChange: (value: string) => void;
}

export default function IconPicker({ value, name, onChange }: IconPickerProps) {
  const { t } = useTranslation();
  const selectedKey = iconKeyFromValue(value) ?? detectIconKey(name);
  const detectedKey = detectIconKey(name);
  const categories = useMemo(() => Array.from(new Set(ICON_OPTIONS.map((option) => option.category))), []);

  return (
    <div className="space-y-3 rounded-xl border border-line/60 bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="label-xs mb-1">{t("icons.picker")}</div>
          <div className="text-[12px] text-t3">{t("icons.auto_detected")}: {findIconOption(detectedKey)?.label}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(iconValue(detectedKey))}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent"
        >
          <IconBadge value={iconValue(detectedKey)} name={name} size={22} />
          {t("icons.use_auto")}
        </button>
      </div>

      <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
        {categories.map((category) => (
          <div key={category}>
            <div className="label-xs mb-1.5">{category}</div>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {ICON_OPTIONS.filter((option) => option.category === category).map((option) => {
                const active = selectedKey === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => onChange(iconValue(option.key))}
                    className={`flex h-10 items-center justify-center rounded-lg border transition-colors ${
                      active ? "border-accent bg-accent/15 text-accent" : "border-line/60 bg-card text-t3 hover:border-accent/40 hover:text-accent"
                    }`}
                    title={option.label}
                  >
                    <option.icon size={18} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
