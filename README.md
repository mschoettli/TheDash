# TheDash

TheDash is a self-hosted Homelab Command Center for any Docker host. It provides:

- Docker app discovery from container labels and running containers
- App tiles with status and media KPIs
- Optional Docker container monitoring and control
- Bookmarks with tags, preview drawer, favorites, archive state, quick capture, and tag suggestions
- Markdown notes with folders, pins, archive state, autosave, drag-and-drop moves, and a notes dashboard
- Optional OpenAI-compatible AI tag suggestions
- Automatic app logo detection with a local proxy for Simple Icons backed logos
- Prebuilt GHCR images for simple Docker Compose installs

## Requirements

- Docker Engine
- Docker Compose v2 (`docker compose`)

Check your host:

```bash
docker --version
docker compose version
```

## Install

TheDash is installed with one compose file. It pulls prebuilt images from GHCR and does not build locally.

1. Create an application directory:

```bash
mkdir -p thedash
cd thedash
```

2. Download the compose and environment files:

```bash
curl -fsSLO https://raw.githubusercontent.com/mschoettli/TheDash/main/docker-compose.yml
curl -fsSLo .env https://raw.githubusercontent.com/mschoettli/TheDash/main/.env.example
```

3. Review `.env`:

```env
THEDASH_PORT=8080
GHCR_OWNER=mschoettli
THEDASH_IMAGE_TAG=latest
DB_PATH=/data/thedash.db
DOCKER_HOST_URL=http://dockerproxy:2375
AI_TAGGING_PROVIDER=
AI_TAGGING_API_KEY=
AI_TAGGING_BASE_URL=https://api.openai.com/v1
AI_TAGGING_MODEL=gpt-4o-mini
```

4. Start TheDash:

```bash
docker compose pull
docker compose up -d
```

5. Open TheDash:

```text
http://localhost:8080
http://<docker-host-ip>:8080
```

The compose stack uses these containers:

- `thedash-backend`
- `thedash-frontend`
- `thedash-dockerproxy` when Docker monitoring is enabled

It pulls:

- `ghcr.io/<owner>/thedash-backend:<tag>`
- `ghcr.io/<owner>/thedash-frontend:<tag>`

## Docker Monitoring And Control

Docker monitoring is optional. TheDash runs without it, but container discovery and container actions require the `docker-monitoring` profile.

Start with Docker monitoring:

```bash
COMPOSE_PROFILES=docker-monitoring docker compose up -d
```

PowerShell:

```powershell
$env:COMPOSE_PROFILES = "docker-monitoring"
docker compose up -d
Remove-Item Env:COMPOSE_PROFILES
```

The profile starts `thedash-dockerproxy`, which mounts `/var/run/docker.sock` read-only and exposes only the Docker API permissions required by TheDash.

## Docker App Labels

TheDash can read app metadata from Docker labels. It also shows unlabeled containers as discovered suggestions.

Supported label names:

```yaml
labels:
  thedash.name: "My App"
  thedash.group: "Media"
  thedash.href: "http://my-host:8096"
  thedash.icon: "https://example.com/icon.png"
  thedash.description: "Optional short description"
```

## AI Tagging

Bookmarks and notes work without external services. By default TheDash creates local rule-based tag suggestions from URL, title, description, and note content.

To enable AI suggestions, configure an OpenAI-compatible API in `.env`:

```env
AI_TAGGING_PROVIDER=openai
AI_TAGGING_API_KEY=your-api-key
AI_TAGGING_BASE_URL=https://api.openai.com/v1
AI_TAGGING_MODEL=gpt-4o-mini
```

Restart the stack after changing `.env`:

```bash
docker compose up -d
```

If the AI provider is unavailable, TheDash falls back to local tag suggestions.

## Logos

TheDash auto-detects common homelab apps such as Jellyfin, Plex, Sonarr, Radarr, Portainer, Grafana, Home Assistant, Nextcloud, and Docker from app names, URLs, and Docker metadata.

Detected apps use TheDash's logo proxy at `/api/logos/<app>`. The proxy fetches supported SVGs from Simple Icons and caches them in the browser/CDN path. If a logo cannot be loaded, the UI falls back to the internal brand badge.

## Widgets

The widget catalog supports Docker, System, Media, Downloads, Network/DNS, RSS, Weather, Calendar, iFrame, Notebook, Releases, Video, Automations, Entity State, Stocks, Minecraft, and Notifications.

Current live integrations:

- Docker: container count and running container count when Docker monitoring is enabled
- System: CPU, RAM, and disk usage
- RSS: feed item count from the configured feed URL
- Weather: current temperature and wind via `wttr.in` for the configured location

Other widget types keep validated configuration and structured display state, so they can be expanded without changing saved widget data.

Homepage-compatible labels are also recognized:

```yaml
labels:
  homepage.name: "My App"
  homepage.group: "Media"
  homepage.href: "http://my-host:8096"
  homepage.icon: "jellyfin.png"
  homepage.description: "Optional short description"
```

## Operations

Start:

```bash
docker compose up -d
```

Stop:

```bash
docker compose down
```

Update:

```bash
docker compose pull
docker compose up -d --remove-orphans
```

Logs:

```bash
docker compose logs -f
```

Container state:

```bash
docker ps --filter name=thedash
```

## Data And Backup

Runtime data is stored in `./data` on the host and mounted to `/data` in the backend container.

Backup:

```bash
docker compose down
cp -a data data.backup
```

Restore:

```bash
docker compose down
rm -rf data
cp -a data.backup data
docker compose up -d
```

The app also provides JSON export/import in Settings.

## Health Checks

Backend health endpoint:

```text
http://<host>:<port>/api/health
```

Frontend and backend include Docker health checks.

## GHCR Images

GitHub Actions publishes images on every push to `main`:

- `ghcr.io/<repo_owner>/thedash-backend:latest`
- `ghcr.io/<repo_owner>/thedash-frontend:latest`
- `ghcr.io/<repo_owner>/thedash-backend:main`
- `ghcr.io/<repo_owner>/thedash-frontend:main`
- `sha-<commit>` tags
- `v*` tags for version tags

Workflow:

- `.github/workflows/publish-ghcr.yml`

## Troubleshooting

Port already in use:

- Change `THEDASH_PORT` in `.env` and restart the stack.

Image pull fails:

- Verify `GHCR_OWNER` and `THEDASH_IMAGE_TAG` in `.env`.
- Ensure the GHCR packages are public or authenticate Docker with an account that can pull them.

Docker monitoring shows no containers:

- Start with `COMPOSE_PROFILES=docker-monitoring docker compose up -d`.
- Check that `thedash-dockerproxy` is running.
- Check that the host has `/var/run/docker.sock` and Docker permission for the compose user.

Compose command not found:

- Install Docker Compose v2 and verify `docker compose version`.

Reset application data:

```bash
docker compose down
rm -rf data
docker compose up -d
```
