#!/usr/bin/env sh
set -eu

REPO_OWNER="${REPO_OWNER:-mschoettli}"
REPO_NAME="${REPO_NAME:-TheDash}"
REPO_REF="${REPO_REF:-main}"
STACK_DIR="${STACK_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.omv.yml}"
ENV_FILE="${ENV_FILE:-.env}"
ENV_EXAMPLE_FILE="${ENV_EXAMPLE_FILE:-.env.example}"

RAW_BASE_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_REF}"
COMPOSE_URL="${RAW_BASE_URL}/docker-compose.omv.yml"
ENV_EXAMPLE_URL="${RAW_BASE_URL}/.env.example"

download_to_file() {
  url="$1"
  target="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$target"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -qO "$target" "$url"
    return
  fi

  echo "ERROR: curl or wget is required." >&2
  exit 1
}

append_missing_env_keys() {
  env_example="$1"
  env_file="$2"

  missing_keys=0
  while IFS= read -r line; do
    case "$line" in
      ""|\#*)
        continue
        ;;
      *=*)
        key="${line%%=*}"
        if ! grep -q "^${key}=" "$env_file"; then
          printf "\n%s\n" "$line" >>"$env_file"
          missing_keys=$((missing_keys + 1))
        fi
        ;;
    esac
  done <"$env_example"

  if [ "$missing_keys" -gt 0 ]; then
    echo "Added ${missing_keys} missing keys to ${env_file}."
  fi
}

run_compose() {
  compose_file="$1"
  env_file="$2"

  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker command not found." >&2
    exit 1
  fi

  docker compose -f "$compose_file" --env-file "$env_file" pull
  docker compose -f "$compose_file" --env-file "$env_file" up -d --remove-orphans
}

main() {
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT INT TERM

  mkdir -p "$STACK_DIR"
  cd "$STACK_DIR"

  echo "Downloading latest compose file from ${COMPOSE_URL}..."
  download_to_file "$COMPOSE_URL" "${tmp_dir}/docker-compose.omv.yml"

  if [ -f "$COMPOSE_FILE" ]; then
    cp "$COMPOSE_FILE" "${COMPOSE_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  fi
  mv "${tmp_dir}/docker-compose.omv.yml" "$COMPOSE_FILE"

  echo "Downloading latest env example from ${ENV_EXAMPLE_URL}..."
  download_to_file "$ENV_EXAMPLE_URL" "${tmp_dir}/.env.example"
  cp "${tmp_dir}/.env.example" "$ENV_EXAMPLE_FILE"

  if [ ! -f "$ENV_FILE" ]; then
    cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
    echo "Created ${ENV_FILE} from ${ENV_EXAMPLE_FILE}."
  else
    append_missing_env_keys "$ENV_EXAMPLE_FILE" "$ENV_FILE"
  fi

  echo "Pulling images and recreating stack..."
  run_compose "$COMPOSE_FILE" "$ENV_FILE"
  echo "Update complete."
}

main "$@"
