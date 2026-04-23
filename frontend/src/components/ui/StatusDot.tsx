interface StatusDotProps {
  online: boolean;
  size?: "sm" | "md";
}

export default function StatusDot({ online, size = "sm" }: StatusDotProps) {
  const sz = size === "sm" ? "w-2 h-2" : "w-3 h-3";
  return (
    <span className="relative inline-flex">
      <span
        className={`${sz} rounded-full ${online ? "bg-emerald-400" : "bg-slate-400"}`}
      />
      {online && (
        <span
          className={`absolute inset-0 ${sz} rounded-full bg-emerald-400 animate-ping opacity-75`}
        />
      )}
    </span>
  );
}
