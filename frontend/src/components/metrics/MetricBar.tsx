interface MetricBarProps {
  label: string;
  percent: number;
  detail?: string;
}

export default function MetricBar({ label, percent, detail }: MetricBarProps) {
  const color =
    percent > 85
      ? "bg-rose-500"
      : percent > 60
      ? "bg-amber-400"
      : "bg-emerald-400";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="text-xs text-slate-500 dark:text-slate-400 w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right shrink-0">
        {detail ?? `${percent}%`}
      </span>
    </div>
  );
}
