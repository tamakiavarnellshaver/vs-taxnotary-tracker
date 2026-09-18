# VS TaxNotary Tracker

A client & appointment tracker for VS TaxNotary (tax preparation, notary, virtual notary, and loan signing services in Chattanooga, TN). Built as the Target Codebase for a multi-agent engineering course.

## Stack

- **server/** — Node.js + Express API, SQLite (via `better-sqlite3`) for storage
- **client/** — React + Vite frontend

## Setup

```bash
npm run install:all      # installs server + client dependencies

npm run dev:server        # starts the API on http://localhost:4000
npm run dev:client        # starts the frontend on http://localhost:5173 (in a second terminal)
```

The frontend expects the API at `http://localhost:4000/api` by default (override with `VITE_API_BASE` in `client/.env.local`).

## Testing strategy

**What command runs the checks?**

```bash
npm test                  # runs both suites
npm run test:server       # 20 tests — API behavior (Vitest + Supertest, in-memory SQLite)
npm run test:client       # 6 tests — component behavior (Vitest + React Testing Library)
npm run build:client      # production build check (Vite)
```

**What does a passing result tell you?**

- `test:server` exercises every API route (clients, appointments, document checklist) against real request/response cycles hitting an in-memory database — covering both the happy path (create/list/update/delete) and validation failures (missing fields, invalid enum values, referencing a nonexistent client, invalid dates). A pass means the API's contract (status codes, required-field validation, filtering) behaves as documented.
- `test:client` renders the `ClientForm` and `ClientList` components in isolation with mocked API calls and asserts on what the user would see and the calls that get made. A pass means the UI wires user input to the right API calls and surfaces errors correctly.
- `build:client` is a build-check: a failing build means broken imports, syntax errors, or type issues that would break production.

These three checks are the candidates for the first GitHub Action.

## Current features

- Client records (name, contact info, service type: tax prep / notary / virtual notary / loan signing) with search and service-type filtering
- Appointment scheduling per client with status tracking (scheduled / completed / cancelled / no_show) and date-range filtering
- Per-client document checklist (e.g. W-2, 1099, driver's license) with received/not-received tracking

## Planned features / improvements (candidates for agentic implementation)

1. **Appointment conflict detection** — reject or warn when a new appointment overlaps an existing one for the same day, since notary/loan-signing appointments are in-person and time-boxed.
2. **CSV export** — export a client list or a date-ranged appointment log to CSV, for tax-season recordkeeping and handoff to an accountant.
3. **Notary commission renewal tracking** — a `renewal_due_at` field plus a "due for renewal" report, since notary commissions expire and need proactive tracking.
4. **Basic auth** — a single-user login (this is a solo practice) so the tracker isn't wide open if ever deployed beyond localhost.
5. **Appointment reminders** — a scheduled job that flags appointments happening in the next 24 hours, as a foundation for an eventual email/SMS reminder.

## Project structure

```
vs-taxnotary-tracker/
├── server/
│   ├── src/
│   │   ├── db.js              # SQLite schema + connection
│   │   ├── app.js             # Express app wiring
│   │   ├── server.js          # entrypoint
│   │   └── routes/
│   │       ├── clients.js
│   │       ├── appointments.js
│   │       └── documents.js
│   └── tests/                 # Vitest + Supertest
├── client/
│   └── src/
│       ├── api/client.js      # fetch wrapper for the API
│       ├── components/        # ClientForm, ClientList, ClientDetail
│       └── App.jsx
└── README.md
```
