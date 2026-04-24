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

## OpenMediaVault (Stack) Install

Use `docker-compose.omv.yml` to run directly from prebuilt GHCR images (no local build context needed).

1. In OMV Compose plugin, create a new stack and paste:

- `docker-compose.omv.yml` from:
  `https://raw.githubusercontent.com/mschoettli/TheDash/main/docker-compose.omv.yml`
- `.env.example` from:
  `https://raw.githubusercontent.com/mschoettli/TheDash/main/.env.example`

2. Save env as `.env` and keep defaults or adjust:
- `THEDASH_PORT`
- `GHCR_OWNER`
- `THEDASH_IMAGE_TAG`

3. Deploy the stack.

This pulls:
- `ghcr.io/<owner>/thedash-backend:<tag>`
- `ghcr.io/<owner>/thedash-frontend:<tag>`

Optional Docker monitoring in OMV:
- Set `DOCKER_HOST_URL=http://dockerproxy:2375`
- Enable compose profile `docker-monitoring`

## Quick Start (Local Build from Git Clone)

1. Copy environment defaults:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Start TheDash (local build):

```bash
docker compose up -d
```

3. Open:

`http://localhost:8080` (or your configured `THEDASH_PORT`)

## Optional: Enable Docker Container Monitoring

Default installation does not mount the host Docker socket.
To enable container monitoring, start with the `docker-monitoring` profile and set `DOCKER_HOST_URL`.

### Linux/macOS

```bash
DOCKER_HOST_URL=http://dockerproxy:2375 COMPOSE_PROFILES=docker-monitoring docker compose up -d
```

### PowerShell

```powershell
$env:DOCKER_HOST_URL = "http://dockerproxy:2375"
$env:COMPOSE_PROFILES = "docker-monitoring"
docker compose up -d
Remove-Item Env:DOCKER_HOST_URL
Remove-Item Env:COMPOSE_PROFILES
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

Update after pulling new changes (local build compose):

```bash
docker compose build --no-cache
docker compose up -d
```

Logs:

```bash
docker compose logs -f
```

## Backup and Restore

Data is stored in `./data` via bind mount.

Recommended backup:
- Stop services: `docker compose down`
- Copy the `data` directory

Restore:
- Stop services
- Replace `./data` with backup
- Start services: `docker compose up -d`

You can also use in-app JSON export/import in Settings.

## Health Checks

- Backend health endpoint: `/api/health`
- Frontend and backend include Docker health checks in `docker-compose.yml`

## GHCR Publishing

GitHub Actions workflow:
- `.github/workflows/publish-ghcr.yml`

On push to `main`, images are published to GHCR:
- `ghcr.io/<repo_owner>/thedash-backend:main`
- `ghcr.io/<repo_owner>/thedash-frontend:main`

Also published:
- `sha-<commit>` tags
- `v*` tags when you push version tags

## OMV Auto Update Script

For OpenMediaVault hosts, you can use:

`scripts/update-omv-stack.sh`

It performs:
- download latest `docker-compose.omv.yml` from GitHub
- download latest `.env.example`
- create `.env` if missing
- append missing env keys from `.env.example` into `.env`
- run `docker compose pull` and `docker compose up -d --remove-orphans`

Example:

```bash
chmod +x scripts/update-omv-stack.sh
STACK_DIR=/srv/dev-disk-by-uuid-XXXX/stacks/thedash \
REPO_OWNER=mschoettli \
REPO_NAME=TheDash \
REPO_REF=main \
scripts/update-omv-stack.sh
```

## Troubleshooting

Port already in use:
- Change `THEDASH_PORT` in `.env`, then restart.

Docker monitoring shows no containers:
- Start with monitoring profile and `DOCKER_HOST_URL=http://dockerproxy:2375`.
- Ensure Docker socket access is allowed on the host.

Compose command not found:
- Install Docker Compose v2 plugin and verify `docker compose version`.

OMV stack cannot pull images:
- Ensure GHCR package visibility allows pulling (or provide credentials in OMV if private).
- Verify `GHCR_OWNER` and `THEDASH_IMAGE_TAG` in `.env`.
