import { useState, useEffect } from "react";

interface FaviconImgProps {
  url: string;
  name: string;
  size?: number;
  className?: string;
}

function letterAvatar(name: string): { letter: string; color: string } {
  const colors = [
    "bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-cyan-500",
    "bg-teal-500", "bg-emerald-500", "bg-rose-500", "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return { letter: name[0]?.toUpperCase() ?? "?", color: colors[Math.abs(hash) % colors.length] };
}

export default function FaviconImg({ url, name, size = 32, className = "" }: FaviconImgProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { letter, color } = letterAvatar(name);

  useEffect(() => {
    setIconUrl(null);
    setFailed(false);
    fetch(`/api/favicon?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.faviconUrl) setIconUrl(data.faviconUrl);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [url]);

  if (!failed && iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name}
        width={size}
        height={size}
        className={`object-contain rounded ${className}`}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded font-semibold text-white ${color} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {letter}
    </span>
  );
}
