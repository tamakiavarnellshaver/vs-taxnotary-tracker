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

**Terminal output of the smoke test:**

```
> Summarize this repo's structure and write the summary to /workspace/agent-summary.md

● I wrote the summary to /workspace/agent-summary.md.

  What the repo is: VS TaxNotary Tracker, a client and appointment tracker for a solo tax prep, notary and loan-signing
  practice. It's split into two npm packages:
  - server/: an Express API backed by SQLite (better-sqlite3). It has three routers, for clients, appointments and
    document checklists, and its tests run against an in-memory database.
  - client/: a React 19 + Vite frontend with three components (ClientForm, ClientList, ClientDetail) and a small fetch
    wrapper for calling the API.
  - Agent container: Dockerfile, docker-compose.yml and docker/proxy/squid.conf set up a container where the coding
    agent can only reach the internet through a proxy that allows npm and GitHub and blocks everything else. The test
    service has no internet access at all.

  The file also covers the three database tables, all 14 API endpoints, the root npm commands, and the five planned
  features from the README. The test counts (20 server, 6 client) match the README and the number of test cases in the
  test files; I didn't run the suites.

  This is the smoke-test prompt from setup.md, so agent-summary.md in the project root is where that step expects the
  output. I didn't create any other files.

✻ Brewed for 37s · done 6:13 AM
```

Confirmed persisted on the host after exiting the container:

```
PS C:\Users\tamak\Desktop\vs-taxnotary-tracker> dir C:\Users\tamak\Desktop\vs-taxnotary-tracker

    Directory: C:\Users\tamak\Desktop\vs-taxnotary-tracker

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----         9/25/2026   1:14 AM                .git
d-----         9/18/2026   1:42 AM                client
d-----         9/25/2026  12:47 AM                docker
d-----         9/18/2026   1:07 AM                server
-a----         9/25/2026  12:47 AM            110 .dockerignore
-a----         9/18/2026   1:10 AM             81 .gitignore
-a----         9/25/2026   2:13 AM           6188 agent-summary.md
-a----         9/25/2026  12:47 AM           3320 docker-compose.yml
-a----         9/25/2026   1:12 AM           1406 docker-entrypoint.sh
-a----         9/25/2026   1:12 AM           2896 Dockerfile
-a----         9/18/2026   1:10 AM            606 package.json
-a----         9/18/2026   1:10 AM           4021 README.md
-a----         9/25/2026   1:12 AM            117 settings.json
-a----         9/25/2026   1:14 AM           7085 setup.md
-a----         9/25/2026   1:12 AM           5329 statusline.sh
```

`agent-summary.md` landed on the host Desktop folder, not just inside the now-removed container — confirming the bind mount persisted the write, and no files were created outside `/workspace`.

## Network egress check

Ran against the `agent` service defined in `docker-compose.yml`, which is the one actually wired to the `egress-proxy` boundary (the `docker run ... vs-taxnotary-agent` command above uses Docker's default network and is **not** boundary-enforced — see "What risks remain?" below):

```
PS C:\Users\tamak\Desktop\vs-taxnotary-tracker> docker compose run --rm agent curl -m 5 -s -o /dev/null -w "%{http_code}\n" https://example.com
[+] run 1/1
 ✔ Container vs-taxnotary-tracker-egress-proxy-1 Running  0.0s
Container vs-taxnotary-tracker-agent-run-134f0507547e Creating
Container vs-taxnotary-tracker-agent-run-134f0507547e Created
000

PS C:\Users\tamak\Desktop\vs-taxnotary-tracker> docker compose run --rm agent curl -m 5 -s -o /dev/null -w "%{http_code}\n" https://registry.npmjs.org
[+] run 1/1
 ✔ Container vs-taxnotary-tracker-egress-proxy-1 Running  0.0s
Container vs-taxnotary-tracker-agent-run-134f0507547e Creating
Container vs-taxnotary-tracker-agent-run-134f0507547e Created
200
```

`https://example.com` (not allowlisted) returned `000` — `curl` couldn't even complete the connection, confirming the Squid proxy blocked it. `https://registry.npmjs.org` (allowlisted) returned `200`. The egress boundary is verified working, not just configured.

(Note: getting here surfaced a real bug in `docker/Dockerfile` — `useradd --uid 1000 agent` collided with the `node` base image's own pre-existing UID-1000 user and failed the build. Fixed by renaming that existing user instead of creating a new one: `usermod --login agent --home /home/agent --move-home node && groupmod --new-name agent node`.)

## Security decisions (reflection)

**Why did you mount only this folder?**
Because the repo folder is the smallest scope the agent needs to do its job — read/edit the code, install dependencies, run tests — and nothing else; mounting the home directory or Desktop would expose unrelated files (other clients' documents, credentials, personal data) to a process that has no reason to touch them, so if the agent were ever compromised by a bad dependency or a malicious file it reads, the damage stays contained to this one project folder.

**What did you choose to keep ephemeral?**
`node_modules` for both `client/` and `server/` (Docker named volumes rather than the bind mount, since `better-sqlite3`'s native binding is compiled per-platform and a Windows-host build would break inside the Linux container), the test SQLite database (in-memory, created fresh each run), npm's cache, and any scratch/temp files the agent creates while working — only source files written directly under `/workspace` persist on the host.

**What did you choose to persist?**
Only two things: the project source code itself, since that's the bind-mounted `/workspace` folder and the actual point of the exercise — edits, new files, and commits the agent makes need to survive after the container exits — and the Claude Code login credential, via the separate `claude-auth` named volume, so logging in once carries over across container restarts instead of re-authenticating every run.

**What dependencies did you include in your extended Docker image?**
Node.js 22.x (via NodeSource, since Debian bookworm's own apt package is an older 18.x that's behind this project's tooling) and `build-essential` plus `python3` (the C/C++ toolchain `better-sqlite3` needs to compile its native binding on `npm install`) — nothing else, since this is a pure Node.js project with no other runtime dependencies to satisfy.

**What did your smoke test prove?**
It proved the three things that actually matter for this setup: the agent could read and understand the mounted repo well enough to produce an accurate structural summary, a file it wrote to `/workspace` persisted back to the host filesystem after the container exited (confirming the bind mount works both ways, not just for reading), and it wrote only that one requested file with nothing created outside `/workspace` — the filesystem boundary held under real use, not just on inspection.

**What risks remain?**
The interactive `docker run` command (unlike the `docker-compose.yml` `agent` service) uses Docker's default network with no egress proxy, so during that smoke test the agent had full outbound internet access rather than the npm/GitHub-only boundary the egress check above verifies — **mitigation: switch day-to-day agent use to `docker compose run agent` (or `docker compose run agent claude`), which is the service actually wired to `egress-proxy`, and treat the plain `docker run` invocation as build-verification only, not a task-running boundary.** Separately, `npm install` still executes arbitrary third-party package code (postinstall scripts) with the container's privileges, so a compromised dependency isn't fully contained even inside the folder boundary — mitigation: run `npm install` only through the network-restricted `agent`/`test` services (never the unrestricted course image) so a malicious postinstall script has nowhere to exfiltrate to. The course image also runs as root rather than a non-root user (the leaner `docker/Dockerfile` does drop to a non-root `agent` user, fixed above); the `claude-auth` named volume persists a live credential across runs, which a compromised container could try to read; and `GITHUB_TOKEN`, when supplied, grants real push access with no additional scoping beyond whatever the token itself allows.

These are first-pass decisions and expected to evolve — e.g. if a later module needs the agent to call an external API, that host gets added to `squid.conf` explicitly rather than opening the proxy up broadly.
