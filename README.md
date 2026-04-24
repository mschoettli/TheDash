# TheDash

TheDash is a self-hosted Homelab Command Center for any Docker host. It provides:

- Docker app discovery from container labels and running containers
- App tiles and dashboard sections
- Live host metrics
- Optional Docker container monitoring and control
- Bookmarks with tags, preview drawer, favorites, archive state, and quick capture
- Markdown notes with folders, pins, archive state, autosave, and a notes dashboard
- Prebuilt GHCR images for simple Docker Compose installs

## Requirements

- Docker Engine
- Docker Compose v2 (`docker compose`)

Check your host:

```bash
docker --version
docker compose version
```

## Install With Prebuilt Images

This is the recommended installation path for servers and homelabs. It does not require Node.js or a local build context.

1. Create an application directory:

```bash
mkdir -p thedash
cd thedash
```

2. Download the compose and environment files:

```bash
curl -fsSLO https://raw.githubusercontent.com/mschoettli/TheDash/main/docker-compose.image.yml
curl -fsSLo .env https://raw.githubusercontent.com/mschoettli/TheDash/main/.env.example
```

3. Review `.env`:

```env
THEDASH_PORT=8080
GHCR_OWNER=mschoettli
THEDASH_IMAGE_TAG=latest
DB_PATH=/data/thedash.db
DOCKER_HOST_URL=
```

4. Start TheDash:

```bash
docker compose -f docker-compose.image.yml pull
docker compose -f docker-compose.image.yml up -d
```

5. Open TheDash:

```text
http://localhost:8080
http://<docker-host-ip>:8080
```

The image compose uses these containers:

- `thedash-backend`
- `thedash-frontend`
- `thedash-dockerproxy` when Docker monitoring is enabled

It pulls:

- `ghcr.io/<owner>/thedash-backend:latest`
- `ghcr.io/<owner>/thedash-frontend:latest`

## Install From Git Clone

Use this mode when you want to build the images locally from the repository.

```bash
git clone https://github.com/mschoettli/TheDash.git
cd TheDash
cp .env.example .env
docker compose up -d --build
```

PowerShell:

```powershell
git clone https://github.com/mschoettli/TheDash.git
cd TheDash
Copy-Item .env.example .env
docker compose up -d --build
```

The local build compose uses the same container names:

- `thedash-backend`
- `thedash-frontend`
- `thedash-dockerproxy` when Docker monitoring is enabled

## Docker Monitoring And Control

The default installation does not expose the Docker socket. TheDash still runs without Docker monitoring.

To enable Docker discovery, container status, and controlled actions, start with the `docker-monitoring` profile:

```bash
DOCKER_HOST_URL=http://dockerproxy:2375 COMPOSE_PROFILES=docker-monitoring docker compose -f docker-compose.image.yml up -d
```

For local builds:

```bash
DOCKER_HOST_URL=http://dockerproxy:2375 COMPOSE_PROFILES=docker-monitoring docker compose up -d --build
```

PowerShell example:

```powershell
$env:DOCKER_HOST_URL = "http://dockerproxy:2375"
$env:COMPOSE_PROFILES = "docker-monitoring"
docker compose -f docker-compose.image.yml up -d
Remove-Item Env:DOCKER_HOST_URL
Remove-Item Env:COMPOSE_PROFILES
```

The Docker proxy is optional and only starts when the profile is enabled.

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

Start prebuilt images:

```bash
docker compose -f docker-compose.image.yml up -d
```

Stop prebuilt images:

```bash
docker compose -f docker-compose.image.yml down
```

Update prebuilt images:

```bash
docker compose -f docker-compose.image.yml pull
docker compose -f docker-compose.image.yml up -d --remove-orphans
```

Start local build:

```bash
docker compose up -d
```

Update local build after pulling repository changes:

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

Logs:

```bash
docker compose -f docker-compose.image.yml logs -f
```

Local build logs:

```bash
docker compose logs -f
```

## Data And Backup

Runtime data is stored in `./data` on the host and mounted to `/data` in the backend container.

Recommended backup:

```bash
docker compose -f docker-compose.image.yml down
cp -a data data.backup
```

Restore:

```bash
docker compose -f docker-compose.image.yml down
rm -rf data
cp -a data.backup data
docker compose -f docker-compose.image.yml up -d
```

The app also provides JSON export/import in Settings.

## Health Checks

- Backend: `http://<host>:<port>/api/health`
- Frontend and backend include Docker health checks in both compose files.

Check container state:

```bash
docker ps --filter name=thedash
```

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

Prebuilt image pull fails:

- Verify `GHCR_OWNER` and `THEDASH_IMAGE_TAG` in `.env`.
- Ensure the GHCR packages are public or authenticate Docker with an account that can pull them.

Docker monitoring shows no containers:

- Start with `COMPOSE_PROFILES=docker-monitoring`.
- Set `DOCKER_HOST_URL=http://dockerproxy:2375`.
- Check that `thedash-dockerproxy` is running.

Compose command not found:

- Install Docker Compose v2 and verify `docker compose version`.

Reset application data:

```bash
docker compose -f docker-compose.image.yml down
rm -rf data
docker compose -f docker-compose.image.yml up -d
```
