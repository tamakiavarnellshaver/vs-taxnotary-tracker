# Agent Container Setup — VS TaxNotary Tracker

This documents the Dockerized agent environment for this project: how it was built, why, and the exact commands to run it. It's the baseline for Module 1 of the agentic engineering course; expect these choices to evolve as the project needs more (or different) access.

## Why this exists

The coding agent (Claude Code) needs to read and edit this repo's files, install npm packages, run tests, and occasionally push commits. It does **not** need broad access to the host machine, arbitrary internet access, or any real credentials — this project has none to protect (no API keys, no external services; SQLite is a local file). The container enforces that boundary at the filesystem and network level instead of relying on the agent simply "not doing" things it technically could.

## Files

- `Dockerfile` — this project's agent image, extending the course's `module_1/Dockerfile` (copied in unmodified as a reference — see below). Adds Node.js 22 and a C/C++ build toolchain (`build-essential`) so `better-sqlite3` can compile its native binding; drops the course's Python AI/ML stack (`requirements.txt` — streamlit, pandas, fastapi, etc.), since this is a pure Node.js project with no Python dependencies; drops `ngrok` (a tunneling tool that opens an *inbound* hole through the network boundary this container exists to enforce) and OpenCode (an alternate agent not in use here).
- `docker-compose.yml` — defines three services:
  - `test` — runs `npm test` against an in-memory SQLite DB and mocked fetches. No network at all (`internal_only` network, no route out).
  - `agent` — the interactive dev environment. Bind-mounts the repo read-write; reaches the internet *only* through `egress-proxy`.
  - `egress-proxy` — a Squid proxy (`docker/proxy/squid.conf`) that allowlists exactly `*.npmjs.org`/`registry.npmjs.org` (installs) and `github.com`/`api.github.com`/`objects.githubusercontent.com`/`codeload.github.com` (git fetch/push). Everything else is denied and logged.
- `docker/Dockerfile` — a leaner, project-only image used by `docker-compose.yml` (Node 22 + build toolchain, non-root user, no Claude Code/course tooling baked in — compose mounts the live repo instead).

## Build

Run this in the project root (`vs-taxnotary-tracker/`), on a machine with normal internet access:

```bash
docker build -t vs-taxnotary-agent -f Dockerfile .
```

(This uses the course-derived `Dockerfile`, which includes Claude Code. The `docker compose build agent` / `docker compose build test` path builds the separate `docker/Dockerfile` instead — see docker-compose.yml.)

## Run

```bash
docker run -it --rm \
  -v claude-auth:/claude-auth \
  -v "$PWD":/workspace \
  vs-taxnotary-agent
```

- `-v "$PWD":/workspace` — mounts **only this project folder** into the container at `/workspace`. Nothing else on the host (home directory, SSH keys, cloud credentials, other projects) is visible inside the container.
- `-v claude-auth:/claude-auth` — a named volume that persists Claude Code's login across runs, without baking any credential into the image itself.
- No `-p`/port mapping and no explicit `--network` flag is used here since this project has no web UI to expose from the container — the API/client run on the host side via `npm run dev:*` if needed, not inside this agent container.
- Network mode: default Docker bridge (full outbound access) for this course-image run, since it's meant as an interactive dev shell. For a stricter boundary matching the `docker-compose.yml` setup (network access limited to npm + GitHub only), use `docker compose run agent` instead — see docker-compose.yml.

Inside the container, verify the boundary before doing anything else:

```bash
ls /workspace              # should show this project's files only
ls /                        # confirm no host home dir, no ~/.ssh, no cloud creds mounted
```

Ephemeral vs. persistent: anything written under `/workspace` persists on the host (it's the bind-mounted project folder); anything written elsewhere in the container (e.g. `/tmp`, caches, the `node_modules` named volumes in `docker-compose.yml`) disappears or resets when the container is removed.

## Launch the agent

Inside the running container:

```bash
claude
```

(First run will prompt Claude Code's normal login flow; the `claude-auth` volume persists it after that.)

## Smoke test

Prompt given to the agent inside the container:

> Summarize this repo's structure and write the summary to /workspace/agent-summary.md

Expected result: a new file at `agent-summary.md` in the project root, visible on the host after the container exits (proving `/workspace` writes persist), and no files created outside `/workspace`.

**Terminal output of the smoke test:** *(paste here after running locally)*

```
<paste the container session output here>
```

## Security decisions (reflection)

- **Local services expected:** none external. The API server and SQLite are both self-contained inside the project folder; no database server, no third-party API the app depends on to run tests.
- **Environment variables / credentials referenced:** none required. The only optional env var is `VITE_API_BASE` (client build-time override, not a secret), and `GITHUB_TOKEN` is referenced in `docker-compose.yml` purely so the agent *can* push commits if the user supplies one — it's never baked into the image and defaults to empty.
- **Credentials mocked/omitted:** all of them — there are none to mock. Tests run against an in-memory SQLite DB and mocked `fetch` calls, so no real network or credentials are needed to validate the app.
- **Smallest safe mount:** the project repo root (`vs-taxnotary-tracker/`) — not the home directory, not the Desktop. Node's native `better-sqlite3` module and its `node_modules` are kept in named volumes rather than the bind mount, so a Windows-built binary on the host never collides with the Linux container's build.
- **Network access needed:** yes, but narrowly — `npm install` needs the npm registry, and pushing commits needs GitHub. Both are the only allowlisted destinations in `docker/proxy/squid.conf`; everything else is denied and logged. The `test` service needs no network at all and sits on a Docker network with no route out.
- **Install/test/build commands already defined:** `npm run install:all`, `npm test` (runs both `test:server` and `test:client`), `npm run build:client` — all defined in the root `package.json`, unchanged by this container work.
- **Runtime/package manager/tools needed:** Node.js 22, npm, git, and a C/C++ build toolchain (`python3`, `make`, `g++`) for `better-sqlite3`'s native binding — nothing else. The course image's Python/AI stack and `ngrok` were deliberately left out as unnecessary for this project, per the "keep the image focused" guidance.

These are first-pass decisions and expected to evolve — e.g. if a later module needs the agent to call an external API, that host gets added to `squid.conf` explicitly rather than opening the proxy up broadly.
