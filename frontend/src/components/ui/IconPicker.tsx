import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  detectIconKey,
  findIconOption,
  iconKeyFromValue,
  iconValue,
  ICON_OPTIONS,
  logoLabelFromValue,
} from "../../lib/iconRegistry";
import IconBadge from "./IconBadge";

interface IconPickerProps {
  value?: string | null;
  name: string;
  url?: string;
  image?: string;
  labels?: string;
  onChange: (value: string) => void;
}

interface LogoResolveResult {
  status: "found" | "not_found";
  source: string;
  slug: string | null;
  value?: string | null;
}

export default function IconPicker({ value, name, url = "", image = "", labels = "", onChange }: IconPickerProps) {
  const { t } = useTranslation();
  const selectedKey = iconKeyFromValue(value) ?? detectIconKey(name);
  const detectedKey = detectIconKey(name);
  const [autoLogo, setAutoLogo] = useState<LogoResolveResult | null>(null);
  const categories = useMemo(() => Array.from(new Set(ICON_OPTIONS.map((option) => option.category))), []);

  useEffect(() => {
    if (!name.trim() && !url.trim() && !image.trim() && !labels.trim()) {
      setAutoLogo(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ name, url, image, labels });
      fetch(`/api/logos/resolve?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((result) => setAutoLogo(result))
        .catch(() => setAutoLogo(null));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [name, url, image, labels]);

  const autoValue = autoLogo?.status === "found" && autoLogo.value ? autoLogo.value : iconValue(detectedKey);

  return (
    <div className="space-y-3 rounded-xl border border-line/60 bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="label-xs mb-1">{t("icons.picker")}</div>
          <div className="text-[12px] text-t3">
            {t("icons.auto_detected")}:{" "}
            {autoLogo?.status === "found"
              ? logoLabelFromValue(autoLogo.value) ?? autoLogo.slug
              : findIconOption(detectedKey)?.label}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(autoValue)}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent"
        >
          <IconBadge value={autoValue} name={name} size={22} />
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
