interface StatusDotProps {
  online: boolean;
  size?: "sm" | "md";
}

export default function StatusDot({ online, size = "sm" }: StatusDotProps) {
  const sz = size === "sm" ? "w-1.5 h-1.5" : "w-2.5 h-2.5";
  return (
    <span className="relative inline-flex">
      <span className={`${sz} rounded-full ${online ? "bg-emerald-400" : "bg-t3"}`} />
      {online && (
        <span className={`absolute inset-0 ${sz} rounded-full bg-emerald-400 animate-ping opacity-60`} />
      )}
    </span>
  );
}
