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
      className={`inline-flex items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent ${className}`}
      style={{ width: size, height: size }}
      title={option?.label ?? name}
    >
      <Icon size={Math.max(14, size * 0.52)} />
    </span>
  );
}
