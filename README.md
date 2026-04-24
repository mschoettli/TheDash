# TheDash

Self-hosted dashboard with:
- App tiles
- Bookmarks
- Notes
- Live host metrics
- Optional Docker container monitoring

## Prerequisites

- Docker Engine
- Docker Compose v2 plugin (`docker compose`)

Verify:

```bash
docker --version
docker compose version
```

## Quick Start With Prebuilt Images

Use `docker-compose.image.yml` to run directly from prebuilt GHCR images without a local build context.

1. Download the compose and environment files from GitHub:

```bash
curl -fsSLO https://raw.githubusercontent.com/mschoettli/TheDash/main/docker-compose.image.yml
curl -fsSLo .env https://raw.githubusercontent.com/mschoettli/TheDash/main/.env.example
```

2. Review `.env` and adjust if needed:

```env
THEDASH_PORT=8080
GHCR_OWNER=mschoettli
THEDASH_IMAGE_TAG=main
```

3. Pull and start TheDash:

```bash
docker compose -f docker-compose.image.yml pull
docker compose -f docker-compose.image.yml up -d
```

4. Open:

`http://localhost:8080` or `http://<docker-host-ip>:8080`

This pulls:
- `ghcr.io/<owner>/thedash-backend:<tag>`
- `ghcr.io/<owner>/thedash-frontend:<tag>`

## Quick Start With Local Build

Use this mode when you clone the repository and want Docker to build the images locally.

1. Copy environment defaults:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Start TheDash:

```bash
docker compose up -d --build
```

3. Open:

`http://localhost:8080` or `http://<docker-host-ip>:8080`

## Optional: Enable Docker Container Monitoring

Default installation does not mount the host Docker socket.
To enable container monitoring, start with the `docker-monitoring` profile and set `DOCKER_HOST_URL`.

### Prebuilt Images

```bash
DOCKER_HOST_URL=http://dockerproxy:2375 COMPOSE_PROFILES=docker-monitoring docker compose -f docker-compose.image.yml up -d
```

### Local Build

```bash
DOCKER_HOST_URL=http://dockerproxy:2375 COMPOSE_PROFILES=docker-monitoring docker compose up -d --build
```

### PowerShell

```powershell
$env:DOCKER_HOST_URL = "http://dockerproxy:2375"
$env:COMPOSE_PROFILES = "docker-monitoring"
docker compose -f docker-compose.image.yml up -d
Remove-Item Env:DOCKER_HOST_URL
Remove-Item Env:COMPOSE_PROFILES
```

## Operations

Start with prebuilt images:

```bash
docker compose -f docker-compose.image.yml up -d
```

Start with local build:

```bash
docker compose up -d
```

Stop prebuilt images:

```bash
docker compose -f docker-compose.image.yml down
```

Stop local build:

```bash
docker compose down
```

Update prebuilt images:

```bash
docker compose -f docker-compose.image.yml pull
docker compose -f docker-compose.image.yml up -d --remove-orphans
```

Update after pulling repository changes for local builds:

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

Logs for prebuilt images:

```bash
docker compose -f docker-compose.image.yml logs -f
```

Logs for local build:

```bash
docker compose logs -f
```

## Backup and Restore

Data is stored in `./data` via bind mount.

Recommended backup:
- Stop services.
- Copy the `data` directory.

Restore:
- Stop services.
- Replace `./data` with the backup.
- Start services again.

You can also use in-app JSON export/import in Settings.

## Health Checks

- Backend health endpoint: `/api/health`
- Frontend and backend include Docker health checks in both compose files.

## GHCR Publishing

GitHub Actions workflow:
- `.github/workflows/publish-ghcr.yml`

On push to `main`, images are published to GHCR:
- `ghcr.io/<repo_owner>/thedash-backend:main`
- `ghcr.io/<repo_owner>/thedash-frontend:main`

Also published:
- `sha-<commit>` tags
- `v*` tags when you push version tags

## Troubleshooting

Port already in use:
- Change `THEDASH_PORT` in `.env`, then restart.

Docker monitoring shows no containers:
- Start with the monitoring profile and `DOCKER_HOST_URL=http://dockerproxy:2375`.
- Ensure Docker socket access is allowed on the host.

Compose command not found:
- Install Docker Compose v2 plugin and verify `docker compose version`.

Prebuilt images cannot be pulled:
- Ensure the GHCR packages are public or authenticate Docker with an account that can pull them.
- Verify `GHCR_OWNER` and `THEDASH_IMAGE_TAG` in `.env`.
