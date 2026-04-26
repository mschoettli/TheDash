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
        {option?.shortLabel ? option.shortLabel : <Icon size={Math.max(14, size * 0.52)} />}
      </span>
    </span>
  );
}
