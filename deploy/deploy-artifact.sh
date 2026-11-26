#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

if [[ $# != 4 ]]; then
  echo 'Usage: deploy.sh STAGE COMMIT RUN_ID RUN_ATTEMPT' >&2
  exit 2
fi
stage=$1
commit=$2
run_id=$3
attempt=$4
[[ $stage = /* && $stage != / && -d $stage && ! -L $stage ]]
[[ $commit =~ ^[0-9a-f]{40}$ && $run_id =~ ^[0-9]+$ && $attempt =~ ^[0-9]+$ ]]

export PATH="/opt/node-v22.23.2-linux-x64/bin:/usr/local/bin:/usr/bin:/bin"
test "$(node --version)" = v22.23.2
pm2_cli=/usr/local/bin/pm2
test -x "$pm2_cli"

base=/var/www/codelab
releases="$base/releases"
shared="$base/shared/server"
current="$base/current"
release_id="$commit-$run_id-$attempt"
release="$releases/$release_id"
next_link="$base/.current-$release_id"
rollback_link="$base/.rollback-$release_id"

# The one-time server setup converts the existing web/server directories into
# symlinks through current and retains them as the initial rollback release.
test -d "$releases"
test -L "$current"
test -L "$base/web"
test -L "$base/server"
previous=$(readlink -f -- "$current")
[[ $previous = "$releases/"* && -d $previous ]]
test "$(readlink -f -- "$base/web")" = "$previous/web"
test "$(readlink -f -- "$base/server")" = "$previous/server"

node - "$stage/release.json" "$commit" "$run_id" "$attempt" <<'NODE'
const fs = require('node:fs');
const [manifestPath, commit, runId, runAttempt] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const positiveInteger = value => typeof value === 'string' && /^[1-9][0-9]*$/.test(value);
if (manifest.schema !== 1 || manifest.repository !== 'yazart/codelab' ||
    manifest.commit !== commit || manifest.runId !== runId ||
    !positiveInteger(manifest.runAttempt) || !positiveInteger(runAttempt) ||
    BigInt(manifest.runAttempt) > BigInt(runAttempt) || manifest.nodeVersion !== 'v22.23.2') {
  throw new Error('Artifact release metadata does not match this deployment');
}
NODE
test -s "$stage/web/index.html"
test -s "$stage/server/dist/main.js"
test -d "$stage/server/node_modules"
test -s "$stage/server/ecosystem.config.cjs"

wait_for_health() {
  local n
  for n in {1..20}; do
    if curl --fail --silent --max-time 2 http://127.0.0.1:3300/health >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

if [[ -e $release || -L $release ]]; then
  if [[ $previous = "$release" ]] && wait_for_health; then
    echo "Codelab release $release_id is already deployed"
    exit 0
  fi
  echo "Release path already exists: $release" >&2
  exit 1
fi

activated=false
rollback() {
  local status=${1:-1}
  trap - ERR HUP INT TERM
  set +e
  if [[ $activated = true ]]; then
    ln -s -- "$previous" "$rollback_link"
    mv -Tf -- "$rollback_link" "$current"
    "$pm2_cli" startOrReload "$base/server/ecosystem.config.cjs" --only codelab-server --update-env
    "$pm2_cli" save
    if wait_for_health; then
      echo "Restored previous codelab release: $previous" >&2
    else
      echo 'Previous codelab release also failed its health check' >&2
    fi
  fi
  rm -f -- "$next_link" "$rollback_link"
  if [[ $(readlink -f -- "$current") != "$release" ]]; then
    rm -rf -- "$release"
  fi
  exit "$status"
}
trap 'rollback "$?"' ERR
trap 'rollback 129' HUP
trap 'rollback 130' INT
trap 'rollback 143' TERM

mkdir -- "$release"
cp -a -- "$stage/web" "$stage/server" "$stage/release.json" "$release/"
mkdir -p -- "$shared"

# Configuration lives outside releases. Preserve any existing .env files, then
# expose the same shared files to every new release without packaging secrets.
shopt -s nullglob
for config in "$previous/server"/.env "$previous/server"/.env.*; do
  [[ -f $config ]] || continue
  destination="$shared/$(basename -- "$config")"
  if [[ ! -e $destination && ! -L $destination ]]; then
    cp -pL -- "$config" "$destination"
    chmod 600 -- "$destination"
  fi
done
for config in "$shared"/.env "$shared"/.env.*; do
  [[ -f $config ]] || continue
  ln -s -- "$config" "$release/server/$(basename -- "$config")"
done
shopt -u nullglob

ln -s -- "$release" "$next_link"
mv -Tf -- "$next_link" "$current"
activated=true
"$pm2_cli" startOrReload "$base/server/ecosystem.config.cjs" --only codelab-server --update-env
wait_for_health
"$pm2_cli" save
trap - ERR HUP INT TERM

# Keep the current release, its immediate predecessor, and the newest remaining
# release. Unknown directories are preserved rather than treated as releases.
kept=2
while IFS= read -r candidate; do
  name=${candidate##*/}
  [[ $name =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ || $name =~ ^legacy-[A-Za-z0-9-]+$ ]] || continue
  [[ $candidate != "$release" && $candidate != "$previous" ]] || continue
  if (( kept < 3 )); then
    ((kept+=1))
  else
    if ! rm -rf -- "$candidate"; then
      echo "Could not remove old codelab release: $candidate" >&2
    fi
  fi
done < <(find "$releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | cut -d ' ' -f2-)

echo "Codelab deployed: $release_id"
