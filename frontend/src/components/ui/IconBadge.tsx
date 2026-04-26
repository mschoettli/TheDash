import { detectIconKey, findIconOption, iconKeyFromValue } from "../../lib/iconRegistry";

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

  if (!Icon) return null;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border font-bold tracking-tight text-white shadow-sm ${className}`}
      style={{ width: size, height: size, backgroundColor: option?.brandColor ?? "rgb(var(--accent))", borderColor: "rgba(255,255,255,0.16)", fontSize: size * 0.28 }}
      title={option?.label ?? name}
    >
      {option?.shortLabel ? option.shortLabel : <Icon size={Math.max(14, size * 0.52)} />}
    </span>
  );
}
