import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  CloudSun,
  Code2,
  Container,
  Download,
  Film,
  Gauge,
  Globe,
  HardDrive,
  Home,
  LineChart,
  Music,
  Network,
  NotebookTabs,
  PlaySquare,
  Radio,
  Server,
  Shield,
  Tv,
  Video,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";

export interface IconOption {
  key: string;
  label: string;
  category: string;
  keywords: string[];
  icon: React.ElementType;
}

export const ICON_PREFIX = "icon:";

export const ICON_OPTIONS: IconOption[] = [
  { key: "dashboard", label: "Dashboard", category: "Core", keywords: ["dashboard", "home", "start"], icon: Home },
  { key: "docker", label: "Docker", category: "Infrastructure", keywords: ["docker", "container", "compose", "portainer"], icon: Container },
  { key: "server", label: "Server", category: "Infrastructure", keywords: ["server", "host", "nas", "proxmox"], icon: Server },
  { key: "system", label: "System", category: "Infrastructure", keywords: ["system", "cpu", "ram", "resources", "metrics"], icon: Gauge },
  { key: "storage", label: "Storage", category: "Infrastructure", keywords: ["storage", "disk", "drive", "backup"], icon: HardDrive },
  { key: "network", label: "Network", category: "Network", keywords: ["network", "dns", "adguard", "pihole", "traefik", "nginx", "proxy"], icon: Network },
  { key: "security", label: "Security", category: "Network", keywords: ["security", "auth", "vault", "bitwarden", "authentik", "vpn"], icon: Shield },
  { key: "media", label: "Media", category: "Media", keywords: ["media", "jellyfin", "plex", "emby", "stream"], icon: Film },
  { key: "tv", label: "TV", category: "Media", keywords: ["sonarr", "series", "tv"], icon: Tv },
  { key: "video", label: "Video", category: "Media", keywords: ["video", "radarr", "movie", "camera", "frigate"], icon: Video },
  { key: "music", label: "Music", category: "Media", keywords: ["music", "audio", "lidarr", "navidrome"], icon: Music },
  { key: "downloads", label: "Downloads", category: "Media", keywords: ["download", "sabnzbd", "qbittorrent", "transmission", "nzbget"], icon: Download },
  { key: "rss", label: "RSS", category: "Information", keywords: ["rss", "feed", "news"], icon: Radio },
  { key: "weather", label: "Weather", category: "Information", keywords: ["weather", "forecast"], icon: CloudSun },
  { key: "stocks", label: "Stocks", category: "Information", keywords: ["stock", "stocks", "finance", "price"], icon: LineChart },
  { key: "calendar", label: "Calendar", category: "Productivity", keywords: ["calendar", "date", "events"], icon: CalendarDays },
  { key: "notes", label: "Notes", category: "Productivity", keywords: ["notes", "notebook", "wiki", "trilium", "obsidian"], icon: NotebookTabs },
  { key: "bookmarks", label: "Bookmarks", category: "Productivity", keywords: ["bookmark", "bookmarks", "karakeep", "linkwarden", "linkding"], icon: BookOpen },
  { key: "automation", label: "Automation", category: "Automation", keywords: ["automation", "home assistant", "node-red", "nodered"], icon: Workflow },
  { key: "releases", label: "Releases", category: "Development", keywords: ["release", "github", "git", "code", "development"], icon: Code2 },
  { key: "play", label: "Player", category: "Embed", keywords: ["player", "stream", "youtube", "twitch"], icon: PlaySquare },
  { key: "notifications", label: "Notifications", category: "System", keywords: ["notification", "alert", "ntfy", "gotify"], icon: Bell },
  { key: "activity", label: "Activity", category: "System", keywords: ["activity", "status", "uptime", "health"], icon: Activity },
  { key: "tools", label: "Tools", category: "System", keywords: ["tool", "tools", "settings", "admin"], icon: Wrench },
  { key: "power", label: "Power", category: "System", keywords: ["power", "energy", "ups"], icon: Zap },
  { key: "web", label: "Web", category: "General", keywords: ["web", "site", "http", "url"], icon: Globe },
  { key: "widgets", label: "Widgets", category: "General", keywords: ["widget", "widgets"], icon: Boxes },
];

export function iconValue(key: string): string {
  return `${ICON_PREFIX}${key}`;
}

export function isRegistryIcon(value?: string | null): boolean {
  return Boolean(value?.startsWith(ICON_PREFIX));
}

export function iconKeyFromValue(value?: string | null): string | null {
  if (!isRegistryIcon(value)) return null;
  return value?.slice(ICON_PREFIX.length) ?? null;
}

export function findIconOption(key?: string | null): IconOption | undefined {
  if (!key) return undefined;
  return ICON_OPTIONS.find((option) => option.key === key);
}

export function detectIconKey(value: string): string {
  const normalized = value.toLowerCase();
  return ICON_OPTIONS.find((option) => option.keywords.some((keyword) => normalized.includes(keyword)))?.key ?? "web";
}
