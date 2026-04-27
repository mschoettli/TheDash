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
  brandColor?: string;
  shortLabel?: string;
  logoSlug?: string;
}

export const ICON_PREFIX = "icon:";
export const LOGO_PREFIX = "logo:";
export type LogoSource = "selfhst" | "dashboard-icons" | "simple-icons" | "favicon" | "fallback";

export const ICON_OPTIONS: IconOption[] = [
  { key: "jellyfin", label: "Jellyfin", category: "Media", keywords: ["jellyfin"], icon: Film, brandColor: "#00a4dc", shortLabel: "JF", logoSlug: "jellyfin" },
  { key: "plex", label: "Plex", category: "Media", keywords: ["plex"], icon: PlaySquare, brandColor: "#e5a00d", shortLabel: "PX", logoSlug: "plex" },
  { key: "emby", label: "Emby", category: "Media", keywords: ["emby"], icon: PlaySquare, brandColor: "#52b54b", shortLabel: "EM", logoSlug: "emby" },
  { key: "sonarr", label: "Sonarr", category: "Media", keywords: ["sonarr"], icon: Tv, brandColor: "#35c5f4", shortLabel: "SO", logoSlug: "sonarr" },
  { key: "radarr", label: "Radarr", category: "Media", keywords: ["radarr"], icon: Video, brandColor: "#f5c542", shortLabel: "RA", logoSlug: "radarr" },
  { key: "lidarr", label: "Lidarr", category: "Media", keywords: ["lidarr"], icon: Music, brandColor: "#00b7d8", shortLabel: "LI", logoSlug: "lidarr" },
  { key: "bazarr", label: "Bazarr", category: "Media", keywords: ["bazarr"], icon: Film, brandColor: "#7c3aed", shortLabel: "BA", logoSlug: "bazarr" },
  { key: "prowlarr", label: "Prowlarr", category: "Media", keywords: ["prowlarr"], icon: Radio, brandColor: "#ef7d00", shortLabel: "PR", logoSlug: "prowlarr" },
  { key: "overseerr", label: "Overseerr", category: "Media", keywords: ["overseerr", "jellyseerr"], icon: Film, brandColor: "#6366f1", shortLabel: "OS" },
  { key: "qbittorrent", label: "qBittorrent", category: "Downloads", keywords: ["qbittorrent", "qbit"], icon: Download, brandColor: "#2f67ba", shortLabel: "QB", logoSlug: "qbittorrent" },
  { key: "transmission", label: "Transmission", category: "Downloads", keywords: ["transmission"], icon: Download, brandColor: "#d70008", shortLabel: "TR", logoSlug: "transmission" },
  { key: "sabnzbd", label: "SABnzbd", category: "Downloads", keywords: ["sabnzbd"], icon: Download, brandColor: "#ffb000", shortLabel: "SB" },
  { key: "portainer", label: "Portainer", category: "Infrastructure", keywords: ["portainer"], icon: Container, brandColor: "#13bef9", shortLabel: "PT", logoSlug: "portainer" },
  { key: "proxmox", label: "Proxmox", category: "Infrastructure", keywords: ["proxmox"], icon: Server, brandColor: "#e57000", shortLabel: "PX", logoSlug: "proxmox" },
  { key: "grafana", label: "Grafana", category: "Monitoring", keywords: ["grafana"], icon: Gauge, brandColor: "#f46800", shortLabel: "GF", logoSlug: "grafana" },
  { key: "prometheus", label: "Prometheus", category: "Monitoring", keywords: ["prometheus"], icon: Activity, brandColor: "#e6522c", shortLabel: "PM", logoSlug: "prometheus" },
  { key: "uptime-kuma", label: "Uptime Kuma", category: "Monitoring", keywords: ["uptime kuma", "uptime-kuma", "kuma"], icon: Activity, brandColor: "#5cdd8b", shortLabel: "UK" },
  { key: "home-assistant", label: "Home Assistant", category: "Automation", keywords: ["home assistant", "homeassistant", "hass"], icon: Home, brandColor: "#41bdf5", shortLabel: "HA", logoSlug: "home-assistant" },
  { key: "node-red", label: "Node-RED", category: "Automation", keywords: ["node-red", "nodered"], icon: Workflow, brandColor: "#8f0000", shortLabel: "NR", logoSlug: "node-red" },
  { key: "adguard", label: "AdGuard Home", category: "Network", keywords: ["adguard"], icon: Shield, brandColor: "#67b279", shortLabel: "AG", logoSlug: "adguard" },
  { key: "pihole", label: "Pi-hole", category: "Network", keywords: ["pi-hole", "pihole"], icon: Shield, brandColor: "#96060c", shortLabel: "PH", logoSlug: "pihole" },
  { key: "nginx-proxy-manager", label: "Nginx Proxy Manager", category: "Network", keywords: ["nginx proxy manager", "npm", "nginx"], icon: Network, brandColor: "#009639", shortLabel: "NX" },
  { key: "traefik", label: "Traefik", category: "Network", keywords: ["traefik"], icon: Network, brandColor: "#24a1c1", shortLabel: "TF", logoSlug: "traefik" },
  { key: "vaultwarden", label: "Vaultwarden", category: "Security", keywords: ["vaultwarden", "bitwarden"], icon: Shield, brandColor: "#175ddc", shortLabel: "VW", logoSlug: "vaultwarden" },
  { key: "nextcloud", label: "Nextcloud", category: "Productivity", keywords: ["nextcloud"], icon: CloudSun, brandColor: "#0082c9", shortLabel: "NC", logoSlug: "nextcloud" },
  { key: "paperless", label: "Paperless", category: "Productivity", keywords: ["paperless"], icon: BookOpen, brandColor: "#17541f", shortLabel: "PL" },
  { key: "immich", label: "Immich", category: "Media", keywords: ["immich"], icon: Film, brandColor: "#4250af", shortLabel: "IM", logoSlug: "immich" },
  { key: "frigate", label: "Frigate", category: "Media", keywords: ["frigate"], icon: Video, brandColor: "#3b82f6", shortLabel: "FR" },
  { key: "syncthing", label: "Syncthing", category: "Infrastructure", keywords: ["syncthing"], icon: Workflow, brandColor: "#0882c8", shortLabel: "ST" },
  { key: "gitea", label: "Gitea", category: "Development", keywords: ["gitea"], icon: Code2, brandColor: "#609926", shortLabel: "GT", logoSlug: "gitea" },
  { key: "gitlab", label: "GitLab", category: "Development", keywords: ["gitlab"], icon: Code2, brandColor: "#fc6d26", shortLabel: "GL", logoSlug: "gitlab" },
  { key: "code-server", label: "Code Server", category: "Development", keywords: ["code-server", "codeserver", "vscode"], icon: Code2, brandColor: "#007acc", shortLabel: "CS" },
  { key: "unifi", label: "UniFi", category: "Network", keywords: ["unifi", "ubiquiti"], icon: Network, brandColor: "#0559c9", shortLabel: "UF", logoSlug: "unifi" },
  { key: "truenas", label: "TrueNAS", category: "Infrastructure", keywords: ["truenas"], icon: HardDrive, brandColor: "#0095d5", shortLabel: "TN" },
  { key: "dashboard", label: "Dashboard", category: "Core", keywords: ["dashboard", "home", "start"], icon: Home },
  { key: "docker", label: "Docker", category: "Infrastructure", keywords: ["docker", "container", "compose"], icon: Container, brandColor: "#2496ed", shortLabel: "DK", logoSlug: "docker" },
  { key: "server", label: "Server", category: "Infrastructure", keywords: ["server", "host", "nas"], icon: Server },
  { key: "system", label: "System", category: "Infrastructure", keywords: ["system", "cpu", "ram", "resources", "metrics"], icon: Gauge },
  { key: "storage", label: "Storage", category: "Infrastructure", keywords: ["storage", "disk", "drive", "backup"], icon: HardDrive },
  { key: "network", label: "Network", category: "Network", keywords: ["network", "dns", "proxy"], icon: Network },
  { key: "security", label: "Security", category: "Network", keywords: ["security", "auth", "vault", "vpn"], icon: Shield },
  { key: "media", label: "Media", category: "Media", keywords: ["media", "stream"], icon: Film },
  { key: "downloads", label: "Downloads", category: "Media", keywords: ["download"], icon: Download },
  { key: "rss", label: "RSS", category: "Information", keywords: ["rss", "feed", "news"], icon: Radio },
  { key: "weather", label: "Weather", category: "Information", keywords: ["weather", "forecast"], icon: CloudSun },
  { key: "stocks", label: "Stocks", category: "Information", keywords: ["stock", "stocks", "finance", "price"], icon: LineChart },
  { key: "calendar", label: "Calendar", category: "Productivity", keywords: ["calendar", "date", "events"], icon: CalendarDays },
  { key: "notes", label: "Notes", category: "Productivity", keywords: ["notes", "notebook", "wiki", "trilium", "obsidian"], icon: NotebookTabs },
  { key: "bookmarks", label: "Bookmarks", category: "Productivity", keywords: ["bookmark", "bookmarks", "karakeep", "linkwarden", "linkding"], icon: BookOpen },
  { key: "automation", label: "Automation", category: "Automation", keywords: ["automation"], icon: Workflow },
  { key: "releases", label: "Releases", category: "Development", keywords: ["release", "github", "git", "code", "development"], icon: Code2 },
  { key: "play", label: "Player", category: "Embed", keywords: ["player", "stream", "youtube", "twitch"], icon: PlaySquare },
  { key: "notifications", label: "Notifications", category: "System", keywords: ["notification", "alert", "ntfy", "gotify"], icon: Bell },
  { key: "activity", label: "Activity", category: "System", keywords: ["activity", "status", "health"], icon: Activity },
  { key: "tools", label: "Tools", category: "System", keywords: ["tool", "tools", "settings", "admin"], icon: Wrench },
  { key: "power", label: "Power", category: "System", keywords: ["power", "energy", "ups"], icon: Zap },
  { key: "web", label: "Web", category: "General", keywords: ["web", "site", "http", "url"], icon: Globe },
  { key: "widgets", label: "Widgets", category: "General", keywords: ["widget", "widgets"], icon: Boxes },
];

export function iconValue(key: string): string {
  return `${LOGO_PREFIX}${key}`;
}

export function isRegistryIcon(value?: string | null): boolean {
  return Boolean(value?.startsWith(ICON_PREFIX) || value?.startsWith(LOGO_PREFIX));
}

export function iconKeyFromValue(value?: string | null): string | null {
  if (!isRegistryIcon(value)) return null;
  const key = value?.replace(ICON_PREFIX, "").replace(LOGO_PREFIX, "") ?? null;
  if (!key) return null;
  const parts = key.split(":");
  return parts.length >= 2 ? parts.slice(1).join(":") : key;
}

export function logoUrlFromValue(value?: string | null): string | null {
  if (!value?.startsWith(LOGO_PREFIX)) return null;
  const [, source, ...slugParts] = value.split(":");
  const slug = slugParts.join(":");
  if (!source || !slug) return null;
  if (source === "selfhst") return `https://cdn.jsdelivr.net/gh/selfhst/icons/svg/${slug}.svg`;
  if (source === "dashboard-icons") return `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/${slug}.svg`;
  if (source === "simple-icons") return `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`;
  return null;
}

export function logoLabelFromValue(value?: string | null): string | null {
  if (!value?.startsWith(LOGO_PREFIX)) return null;
  const [, source, ...slugParts] = value.split(":");
  if (!source || !slugParts.length) return null;
  return `${source} · ${slugParts.join(":")}`;
}

export function findIconOption(key?: string | null): IconOption | undefined {
  if (!key) return undefined;
  return ICON_OPTIONS.find((option) => option.key === key);
}

export function detectIconKey(value: string): string {
  const normalized = value.toLowerCase().replace(/[_./:-]+/g, " ");
  return ICON_OPTIONS.find((option) => option.keywords.some((keyword) => normalized.includes(keyword)))?.key ?? "web";
}
