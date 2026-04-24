interface MetricBarProps {
  label: string;
  value: string;
  percent: number;
}

export default function MetricBar({ label, value, percent }: MetricBarProps) {
  const safe = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const track =
    safe > 85 ? "bg-rose-500" : safe > 65 ? "bg-amber-400" : "bg-accent";

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-surface border border-line/50 px-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-t2 shrink-0">
        {label}
      </span>
      <div className="w-16 h-1 rounded-full bg-line overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full transition-all duration-700 ${track}`}
          style={{ width: `${safe}%` }}
        />
      </div>
      <span className="text-xs text-t1 tabular-nums whitespace-nowrap">{value}</span>
    </div>
  );
}
