# CodeLab production deployment

Production is https://code.frontend-team.ru, hosted on `111.88.127.84`.
Deployment runs as the existing `actions-runner` account.

Pull requests build the frontend, backend, and a complete deployment artifact on
GitHub-hosted Ubuntu 24.04. Pushes to `main` and manual runs on `main` also deploy
that exact artifact over SSH. No GitHub Actions runner, checkout, dependency
installation, or application build is needed on the server.

The build uses Node.js 24.20.0, matching the existing production runtime at
`/usr/bin/node`. The artifact contains:

- `web/`: the Vite output with the configured API/WebSocket endpoints.
- `server/`: compiled NestJS output, locked production dependencies, and PM2 config.
- `release.json`: repository, commit, run ID, attempt, and Node version.
- `deploy.sh`: the deployment implementation executed by the restricted server entry point.

The tar archive preserves dependency symlinks and executable permissions. Build
dependencies and PM2 are excluded from the application runtime dependencies. PM2
is provided by the existing server installation at `/usr/bin/pm2`.
Before uploading, CI starts the staged backend with only production dependencies
and checks `/health` on port 33301. A failed startup stops the build and prints its
startup log; no deployment job runs for a failed build.

## Repository secrets

- `CODELAB_DEPLOY_KEY`: the private key whose public key is restricted to the
  codelab deployment entry point for the `actions-runner` account on 111.88.127.84.
- `CODELAB_HOST_KEY`: the verified SSH known_hosts line for 111.88.127.84. Host key
  verification is required; the workflow never obtains it with an unauthenticated
  key scan during deployment.

The existing optional variables `CODELAB_API_BASE` and `CODELAB_WEBSOCKET_URL`
continue to configure the browser application. Their defaults are `/api/v1` and
`/sync`.

## Server contract

The SSH key is bound by `authorized_keys` to `/usr/local/sbin/artifact-deploy` for
codelab. It accepts only this command, with the gzip archive on standard input:

```text
artifact-deploy COMMIT RUN_ID RUN_ATTEMPT SHA256
```

The server entry point validates the parameters and checksum, serializes
deployments, extracts the archive into an isolated staging directory, and runs:

```text
/bin/bash STAGE/deploy.sh STAGE COMMIT RUN_ID RUN_ATTEMPT
```

The one-time server setup must provide this layout, retaining existing web and
server files as the initial rollback release:

```text
/var/www/codelab/releases/legacy-.../{web,server}
/var/www/codelab/current -> releases/legacy-...
/var/www/codelab/web -> current/web
/var/www/codelab/server -> current/server
/var/www/codelab/shared/server/
```

The account must own the releases and shared directories. The deploy script
creates a release named `COMMIT-RUN_ID-RUN_ATTEMPT`, validates its manifest, switches
`current` atomically, and starts/reloads `codelab-server` with the existing PM2.
It waits for `http://127.0.0.1:3300/health` before saving the PM2 process list.
Failure restores the previous symlink and PM2 release. Successful deployment
keeps three releases, including the previous version, to limit disk usage.

Application `.env` files are kept in `shared/server` and linked into releases.
They are never included in GitHub artifacts. Artifacts are retained in GitHub
for three days; runtime releases have their separate three-release retention.

