export type OnlineStatus = "checking" | "online" | "slow" | "offline";

interface StatusDotProps {
  status: OnlineStatus;
  size?: "sm" | "md";
  className?: string;
}

export default function StatusDot({ status, size = "sm", className = "" }: StatusDotProps) {
  const sz = size === "sm" ? "w-1.5 h-1.5" : "w-2.5 h-2.5";

  if (status === "checking") {
    return (
      <span className={`relative inline-flex ${className}`}>
        <span className={`${sz} rounded-full bg-t3/50 animate-pulse`} />
      </span>
    );
  }

  if (status === "online") {
    return (
      <span className={`relative inline-flex ${className}`}>
        <span className={`${sz} rounded-full bg-emerald-400`} />
        <span className={`absolute inset-0 ${sz} rounded-full bg-emerald-400 animate-ping opacity-60`} />
      </span>
    );
  }

  if (status === "slow") {
    return (
      <span className={`relative inline-flex ${className}`} title="Slow response">
        <span className={`${sz} rounded-full bg-amber-400`} />
        <span className={`absolute inset-0 ${sz} rounded-full bg-amber-400 animate-ping opacity-40`} />
      </span>
    );
  }

  // offline
  return (
    <span className={`relative inline-flex ${className}`} title="Offline">
      <span className={`${sz} rounded-full bg-rose-400/80`} />
    </span>
  );
}
