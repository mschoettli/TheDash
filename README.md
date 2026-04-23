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

## Quick Start (One Command)

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

Update after pulling new changes:

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

## Troubleshooting

Port already in use:
- Change `THEDASH_PORT` in `.env`, then restart.

Docker monitoring shows no containers:
- Start with monitoring profile and `DOCKER_HOST_URL=http://dockerproxy:2375`.
- Ensure Docker socket access is allowed on the host.

Compose command not found:
- Install Docker Compose v2 plugin and verify `docker compose version`.
