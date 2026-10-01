#!/usr/bin/env bash
set -euo pipefail

# The fixed loopback port/container isolate all fixture writes from remote databases.
container_name=wordweft-local-mongo
image=public.ecr.aws/docker/library/mongo:7
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for the disposable MongoDB runtime. Install Docker and start its daemon." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed, but its daemon is unavailable. Start Docker before running this script." >&2
  exit 1
fi

if [[ "${1:-}" == "--reset" ]]; then
  if docker container inspect "$container_name" >/dev/null 2>&1; then
    docker rm -f "$container_name" >/dev/null
  fi
elif [[ -n "${1:-}" ]]; then
  echo "Usage: bash scripts/dev-local-mongo.sh [--reset]" >&2
  exit 2
fi

if ! docker container inspect "$container_name" >/dev/null 2>&1; then
  docker run --rm --name "$container_name" -d -p 127.0.0.1:27028:27017 "$image" >/dev/null
else
  docker start "$container_name" >/dev/null
fi
if [[ "$(docker port "$container_name" 27017/tcp)" != "127.0.0.1:27028" ]]; then
  echo "The existing local container has unexpected port mappings. Stop it and rerun with --reset." >&2
  exit 1
fi

for attempt in {1..60}; do
  if docker exec "$container_name" mongosh --quiet --eval 'quit(db.adminCommand({ping: 1}).ok ? 0 : 1)' >/dev/null 2>&1; then
    echo "Disposable MongoDB ready at 127.0.0.1:27028; database wordweft_local_development."
    exit 0
  fi
  sleep 1
done
echo "Local MongoDB did not become ready. Check docker logs $container_name." >&2
exit 1
