interface MetricBarProps {
  label: string;
  value: string;
  percent: number;
}

export default function MetricBar({ label, value, percent }: MetricBarProps) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const color =
    safePercent > 85
      ? "bg-rose-500"
      : safePercent > 60
      ? "bg-amber-400"
      : "bg-emerald-400";

  return (
    <div className="min-w-[180px] max-w-[240px] rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 bg-white/80 dark:bg-slate-800/70">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="text-xs text-slate-700 dark:text-slate-200 truncate">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
}