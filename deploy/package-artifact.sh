#!/usr/bin/env bash
set -Eeuo pipefail

: "${RUNNER_TEMP:?RUNNER_TEMP is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
: "${GITHUB_RUN_ATTEMPT:?GITHUB_RUN_ATTEMPT is required}"
: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

test "$(node --version)" = v22.23.2
stage=$(mktemp -d "$RUNNER_TEMP/codelab-package.XXXXXX")
smoke_pid=
cleanup() {
  local status=$?
  trap - EXIT HUP INT TERM
  set +e
  if [[ -n $smoke_pid ]]; then
    kill "$smoke_pid" 2>/dev/null
    wait "$smoke_pid" 2>/dev/null
  fi
  if [[ $status != 0 && -f $stage/runtime-smoke.log ]]; then
    echo 'Packaged backend startup log:' >&2
    cat "$stage/runtime-smoke.log" >&2
  fi
  rm -rf -- "$stage"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
artifact_dir="$RUNNER_TEMP/codelab-artifact"
mkdir -p "$stage/web" "$stage/server" "$artifact_dir"

cp -a codelab-editor/dist/. "$stage/web/"
cp -a codelab-server/dist "$stage/server/dist"
cp codelab-server/package.json codelab-server/package-lock.json "$stage/server/"
cp codelab-server/ecosystem.config.cjs "$stage/server/"
cp deploy/deploy-artifact.sh "$stage/deploy.sh"

CODELAB_CONFIG_PATH="$stage/web/assets/config.json" node <<'NODE'
const fs = require('node:fs');
const config = {
  webSocketUrl: process.env.CODELAB_WEBSOCKET_URL || '/sync',
  apiBase: process.env.CODELAB_API_BASE || '/api/v1',
};
fs.writeFileSync(process.env.CODELAB_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
NODE

# Resolve and install runtime dependencies on GitHub, never on the deployment host.
npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefix "$stage/server"

# Start exactly the staged runtime with only its production dependencies. No
# source checkout, development dependencies, or production secrets are available.
smoke_port=33301
(
  cd "$stage/server"
  exec env -i PATH="$PATH" HOME="$HOME" NODE_ENV=production PORT="$smoke_port" node dist/main.js
) > "$stage/runtime-smoke.log" 2>&1 &
smoke_pid=$!
smoke_ready=false
smoke_deadline=$((SECONDS + 20))
while (( SECONDS < smoke_deadline )); do
  kill -0 "$smoke_pid" 2>/dev/null || break
  if response=$(curl --fail --silent --max-time 1 "http://127.0.0.1:$smoke_port/health") && [[ $response = OK ]]; then
    smoke_ready=true
    break
  fi
  sleep 0.5
done
if [[ $smoke_ready != true ]]; then
  echo 'The packaged production backend did not pass its startup health check.' >&2
  exit 1
fi
kill "$smoke_pid"
wait "$smoke_pid" 2>/dev/null || true
smoke_pid=

RELEASE_MANIFEST_PATH="$stage/release.json" node <<'NODE'
const fs = require('node:fs');
const release = {
  schema: 1,
  repository: process.env.GITHUB_REPOSITORY,
  commit: process.env.GITHUB_SHA,
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  nodeVersion: process.version,
};
fs.writeFileSync(process.env.RELEASE_MANIFEST_PATH, `${JSON.stringify(release, null, 2)}\n`);
NODE

test -s "$stage/web/index.html"
test -s "$stage/server/dist/main.js"
test -d "$stage/server/node_modules"
test ! -e "$stage/server/node_modules/pm2"

# Tar preserves executable bits, .bin entries, and symlinks in production node_modules.
tar -C "$stage" -czf "$artifact_dir/codelab.tar.gz" web server deploy.sh release.json
(
  cd "$artifact_dir"
  sha256sum codelab.tar.gz > codelab.tar.gz.sha256
)
echo "artifact_dir=$artifact_dir" >> "$GITHUB_OUTPUT"
echo "artifact_name=codelab-$GITHUB_SHA-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT" >> "$GITHUB_OUTPUT"
