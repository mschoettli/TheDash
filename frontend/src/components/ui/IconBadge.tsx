import { useState } from "react";
import { detectIconKey, findIconOption, iconKeyFromValue, logoUrlFromValue } from "../../lib/iconRegistry";

interface IconBadgeProps {
  value?: string | null;
  name: string;
  size?: number;
  className?: string;
}

export default function IconBadge({ value, name, size = 32, className = "" }: IconBadgeProps) {
  const key = iconKeyFromValue(value) ?? detectIconKey(name);
  const option = findIconOption(key);
  const Icon = option?.icon;
  const [logoFailed, setLogoFailed] = useState(false);
  const externalLogoUrl = logoUrlFromValue(value);
  const logoSrc = externalLogoUrl ?? (option?.logoSlug ? `/api/logos/${option.logoSlug}` : null);

  if (logoSrc && !logoFailed) {
    return (
      <span
        className={`inline-flex items-center justify-center overflow-hidden ${className}`}
        style={{ width: size, height: size }}
        title={option?.label ?? name}
      >
        <img
          src={logoSrc}
          alt=""
          className="h-full w-full object-contain"
          onError={() => setLogoFailed(true)}
        />
      </span>
    );
  }

  if (!Icon && !option?.shortLabel && !key) return null;

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl border font-black tracking-tight text-white shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${option?.brandColor ?? "rgb(var(--accent))"}, rgba(0,0,0,0.45))`,
        borderColor: "rgba(255,255,255,0.18)",
        fontSize: size * 0.27,
      }}
      title={option?.label ?? name}
    >
      <span className="absolute -right-1 -top-1 h-1/2 w-1/2 rounded-full bg-white/20 blur-[1px]" />
      <span className="relative inline-flex items-center gap-0.5">
        {option?.shortLabel ? option.shortLabel : Icon ? <Icon size={Math.max(14, size * 0.52)} /> : key?.slice(0, 2).toUpperCase()}
      </span>
    </span>
  );
}
