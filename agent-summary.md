# Repo Summary — VS TaxNotary Tracker

A client and appointment tracker for VS TaxNotary, a solo tax prep, notary, virtual notary and loan-signing practice in Chattanooga, TN. It's a small monorepo with two npm packages (an Express API and a React client), plus a Dockerized, network-restricted environment for running a coding agent.

## Layout

```
/workspace
├── package.json            # root scripts only: install:all, dev:*, test, build:client
├── README.md               # features, testing strategy, planned work
├── setup.md                # how the agent container is built and run, plus security reasoning
├── server/                 # Node.js + Express API (ESM)
│   ├── src/
│   │   ├── server.js       # entrypoint (PORT=4000, DB_PATH=data.sqlite)
│   │   ├── app.js          # createApp(db): CORS, JSON, routers, /api/health, error handler
│   │   ├── db.js           # createDb(path): better-sqlite3, WAL, foreign keys, schema
│   │   └── routes/
│   │       ├── clients.js       # /api/clients
│   │       ├── appointments.js  # /api/appointments
│   │       └── documents.js     # /api/clients/:id/documents, /api/documents/:id
│   └── tests/              # Vitest + Supertest against in-memory SQLite
├── client/                 # React 19 + Vite 8 frontend
│   ├── index.html, vite.config.js, .oxlintrc.json
│   └── src/
│       ├── main.jsx, App.jsx        # App holds the client list, filters and selection
│       ├── api/client.js            # fetch wrapper (VITE_API_BASE, default localhost:4000/api)
│       ├── components/              # ClientForm, ClientList, ClientDetail (+ tests)
│       └── setupTests.js            # jest-dom for Vitest/jsdom
├── Dockerfile              # agent image (course-derived: python:3.12-slim + Node 22 + build tools + Claude Code)
├── docker-entrypoint.sh    # saves Claude Code credentials to the /claude-auth volume
├── docker-compose.yml      # test / agent / egress-proxy services
├── docker/
│   ├── Dockerfile          # smaller project-only image used by compose
│   └── proxy/squid.conf    # egress allowlist: npm registry and GitHub only
├── settings.json           # Claude Code settings (statusLine config)
└── statusline.sh           # Claude Code status-line script (model, context %, tokens/cost)
```

## Data model (SQLite, `server/src/db.js`)

| Table            | Key columns                                                                 |
|------------------|------------------------------------------------------------------------------|
| `clients`        | name, email, phone, `service_type` (tax_prep / notary / virtual_notary / loan_signing), notes |
| `appointments`   | `client_id` → clients (cascade delete), `scheduled_at`, service_type, `status` (scheduled / completed / cancelled / no_show), notes |
| `document_items` | `client_id` → clients (cascade delete), `label`, `received` (0/1)            |

## API

| Method | Path                                  | Purpose                                     |
|--------|---------------------------------------|---------------------------------------------|
| GET    | `/api/health`                         | Health check                                |
| GET    | `/api/clients?service_type=&q=`       | List clients, filtered by type and search (name/email/phone) |
| GET    | `/api/clients/:id`                    | Get one client                              |
| POST   | `/api/clients`                        | Create a client                             |
| PATCH  | `/api/clients/:id`                    | Update a client                             |
| DELETE | `/api/clients/:id`                    | Delete a client                             |
| GET    | `/api/appointments?status=&client_id=&from=&to=` | List appointments, filtered        |
| POST   | `/api/appointments`                   | Create an appointment                       |
| PATCH  | `/api/appointments/:id/status`        | Change an appointment's status              |
| DELETE | `/api/appointments/:id`               | Delete an appointment                       |
| GET    | `/api/clients/:clientId/documents`    | Get a client's document checklist           |
| POST   | `/api/clients/:clientId/documents`    | Add a checklist item                        |
| PATCH  | `/api/documents/:id`                  | Set `received` (boolean)                    |
| DELETE | `/api/documents/:id`                  | Remove a checklist item                     |

Each router is a factory that takes the `db` handle (`clientsRouter(db)`, and so on), so tests can pass in an in-memory database.

## Commands (root `package.json`)

- `npm run install:all`: installs server and client dependencies
- `npm run dev:server`: starts the API on :4000 (`node --watch`)
- `npm run dev:client`: starts the Vite dev server on :5173
- `npm test`: runs both suites (server: 20 tests in 3 files; client: 6 tests in 2 files)
- `npm run build:client`: production Vite build

## Agent container and network boundary

- **`docker-compose.yml`**:
  - `test` runs `install:all && npm test` on an `internal: true` network, so it has no internet access.
  - `agent` bind-mounts only the repo, keeps `node_modules` in named volumes so the native `better-sqlite3` binary built on the host (Windows) doesn't clash with the Linux one, and can reach the internet only through the proxy.
  - `egress-proxy` runs Squid, which allows only npm and GitHub and denies everything else.
- **Root `Dockerfile` + `docker-entrypoint.sh`**: the course-derived interactive image with Claude Code installed. Login persists in the `claude-auth` named volume.
- There are no secrets. `GITHUB_TOKEN` is optional (used only for pushing), and `VITE_API_BASE` is not sensitive.

## Planned features (from README)

1. Appointment conflict detection
2. CSV export of clients and appointments
3. Notary commission renewal tracking
4. Single-user basic auth
5. Reminders for appointments in the next 24 hours
