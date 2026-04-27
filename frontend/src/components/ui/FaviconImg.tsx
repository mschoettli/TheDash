import { useState, useEffect } from "react";
import { detectIconKey, findIconOption, iconValue, isRegistryIcon } from "../../lib/iconRegistry";
import IconBadge from "./IconBadge";

interface FaviconImgProps {
  url: string;
  name: string;
  explicitIconUrl?: string | null;
  size?: number;
  className?: string;
}

const iconCache = new Map<string, string | null>();

interface LogoResolveResult {
  status: "found" | "not_found";
  value?: string | null;
  url?: string | null;
}

function letterAvatar(name: string): { letter: string; color: string } {
  const colors = [
    "bg-violet-500",
    "bg-indigo-500",
    "bg-blue-500",
    "bg-cyan-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-rose-500",
    "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return {
    letter: name[0]?.toUpperCase() ?? "?",
    color: colors[Math.abs(hash) % colors.length],
  };
}

export default function FaviconImg({
  url,
  name,
  explicitIconUrl,
  size = 32,
  className = "",
}: FaviconImgProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(explicitIconUrl ?? null);
  const [failed, setFailed] = useState(false);
  const { letter, color } = letterAvatar(name);

  if (isRegistryIcon(explicitIconUrl)) {
    return <IconBadge value={explicitIconUrl} name={name} size={size} className={className} />;
  }

  useEffect(() => {
    const cacheKey = `${name}|${url}|${explicitIconUrl ?? ""}`;
    if (iconCache.has(cacheKey)) {
      const cached = iconCache.get(cacheKey) ?? null;
      setIconUrl(cached);
      setFailed(!cached);
      return;
    }

    let cancelled = false;
    setIconUrl(null);
    setFailed(false);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const params = new URLSearchParams({ url });
    if (explicitIconUrl && /^https?:\/\//i.test(explicitIconUrl)) {
      params.set("candidate", explicitIconUrl);
    }

    const request = explicitIconUrl && /^https?:\/\//i.test(explicitIconUrl)
      ? fetch(`/api/favicon?${params.toString()}`, { signal: controller.signal }).then((r) => r.json())
      : fetch(`/api/logos/resolve?${new URLSearchParams({ name, url }).toString()}`, { signal: controller.signal })
          .then((r) => r.json() as Promise<LogoResolveResult>)
          .then((result) => {
            if (result.status === "found" && result.value) {
              return { faviconUrl: result.value };
            }
            return fetch(`/api/favicon?${params.toString()}`, { signal: controller.signal }).then((r) => r.json());
          });

    request
      .then((data) => {
        if (cancelled) return;
        const discovered = data.faviconUrl ?? null;
        iconCache.set(cacheKey, discovered);
        setIconUrl(discovered);
        setFailed(!discovered);
      })
      .catch(() => {
        if (cancelled) return;
        iconCache.set(cacheKey, null);
        setFailed(true);
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [url, name, explicitIconUrl]);

  if (!explicitIconUrl && isRegistryIcon(iconUrl)) {
    return <IconBadge value={iconUrl} name={name} size={size} className={className} />;
  }

  const detected = findIconOption(detectIconKey(`${name} ${url}`));
  if (!explicitIconUrl && detected?.logoSlug && failed) {
    return <IconBadge value={iconValue(detected.key)} name={name} size={size} className={className} />;
  }

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
