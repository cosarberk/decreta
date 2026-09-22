<div align="center">

# Decreta

**An append-only decision ledger for software teams.**

Record every decision that touches your **analysis, tests, or code** — who decided, who witnessed, why, and what it changed — as an immutable, searchable, linkable trail. So that nine months later, the question _"why is this like this?"_ always has an answer.

`Node.js` · `TypeScript` · `Fastify` · `PostgreSQL` · `React` · `Vite` · `Docker` · `Helm`

</div>

---

## Table of Contents

1. [Why Decreta](#1-why-decreta)
2. [Core Concepts](#2-core-concepts)
3. [Features](#3-features)
4. [Screens & Usage Guide](#4-screens--usage-guide)
   - [Sign in](#sign-in)
   - [Records](#records)
   - [New Record](#new-record)
   - [Record Detail & Linking](#record-detail--linking)
   - [Activity Log](#activity-log)
   - [Reports](#reports)
   - [Profile](#profile)
   - [Administration](#administration)
5. [Architecture](#5-architecture)
6. [Data Model](#6-data-model)
7. [Quick Start (Development)](#7-quick-start-development)
8. [Configuration Reference](#8-configuration-reference)
9. [Email: SMTP, Templates & Notifications](#9-email-smtp-templates--notifications)
10. [Production: Single Image](#10-production-single-image)
11. [Deployment: Kubernetes & Helm](#11-deployment-kubernetes--helm)
12. [CI/CD & Versioning](#12-cicd--versioning)
13. [Developer Guide](#13-developer-guide)
14. [API Reference](#14-api-reference)
15. [Internationalization & Theming](#15-internationalization--theming)
16. [Security Notes](#16-security-notes)
17. [Troubleshooting](#17-troubleshooting)
18. [License](#18-license)

---

## 1. Why Decreta

In long-running projects, a module that was **analysed, approved, and dry-run tested** still produces incompatibilities months later. The usual reason is not a bug — it is **drift**: the analysis document, the code, and the running system each change independently, and nobody notices when they fall out of sync. The decision that moved one of them lived only in someone's head, and was forgotten.

Decreta attacks the root cause: it gives **decisions a home**. Every instruction that affects analysis, tests, or code is captured as a **permanent, timestamped, attributed record** — and once written, it can never be silently altered.

The guiding rule:

> **A decision is not remembered — it is recorded.**

---

## 2. Core Concepts

### Append-only records
A record has a **decision**, a **rationale**, the **areas it affects** (`analiz` / `test` / `kod`), its **modules**, **deciders**, **witnesses**, and **labels**. Once created it is **immutable** — enforced at the database level by a trigger that rejects `UPDATE`/`DELETE` on the `records` table. The evidence chain can never be tampered with.

### Change through linking (not editing)
Because records cannot be edited, corrections are made by opening a **new** record and **linking** it to the old one. Links are **directional and typed** (Jira-style): `Supersedes → Superseded`, `Moved → Moved from`, `Relates to`, `Blocks`, `Depends on`, and so on. Link types are **dynamic** and managed by admins.

A record's **"superseded"** status is **derived automatically**: if any record links to it with a supersede-type link, it is shown as no longer in force. Nothing is set by hand.

### Dynamic taxonomy
**Labels**, **modules**, and **link types** are all dynamic, admin-managed, and carry an optional **description** ("what this means"). They can be **renamed, recoloured, and merged**. An item **in use cannot be deleted** — instead you **merge** it into another item, which moves all usages and then removes the old one, without breaking any record.

### Full audit trail
Every meaningful action (record created/superseded, link added/removed, taxonomy and user changes) is written to an **activity log** — a colour-coded, searchable, exportable, immutable trail that everyone can read.

---

## 3. Features

- **Immutable decision records** with deciders, witnesses (names only, no titles), affected areas, and modules.
- **Jira-style typed linking** between records, with automatic supersede detection and "who linked it" attribution.
- **Advanced faceted search**: full-text (Turkish config) + trigram fuzzy, filtered by area, label, module, person, status, and date range.
- **Dynamic taxonomy** (labels / modules / link types) with descriptions, colours, in-use protection, and **merge**.
- **Activity log** (audit): console-style coloured feed, search + filters, **CSV export**.
- **Reports**: distributions by area, module, label, decider, creator, and month — with **PDF export** (print).
- **Email**: DB-editable templates, event notifications, admin bulk **credential / password-reset** sending with **live per-recipient progress** (streaming).
- **Password reset flow** (tokenised, single-use, 24h) and an admin **user drawer** to set name / email / role / status / password directly.
- **Roles**: `admin` and `user`. Admin panel for users and taxonomy.
- **Bilingual** (Turkish default + English) and **4 themes** (2 light, 2 dark).
- **One image** for production (Fastify serves the SPA and the API on a single port).
- **Helm chart** and **GitHub Actions** with automatic semantic versioning.

---

## 4. Screens & Usage Guide

### Sign in
Reach the app and sign in with an email/password. The first administrator is created automatically on first boot from `BOOTSTRAP_ADMIN_*` (see [Configuration](#8-configuration-reference)).

### Records
The home screen. A left **filter panel** and a paginated list.
- **Search box** filters decision and rationale text.
- **Filters**: status (all / in force / superseded), affected area, labels, modules, and person (records they decided or witnessed).
- Label and module filters have their **own search box** and scroll independently, so long lists stay usable.
- Each card shows the document number (`DCR-0007`), status badge, affected areas, decision, rationale, creator, date, and labels.

### New Record
- **Decision** and **Rationale** (required).
- **Affected area** — one or more of `analiz` / `test` / `kod` (a record is opened only if it touches one of these).
- **Modules** — pick from the admin-curated list or type a new one.
- **Deciders** and **Witnesses** — type full names; existing people autocomplete, new ones are created on save.
- **Labels** — pick or create.
- **Links** — attach this record to existing ones with a type; added links appear in a table, and clicking one opens a side panel with its summary.

Opening a "supersedes" record from a detail page pre-fills a supersede link automatically.

### Record Detail & Linking
A document-style view: decision, rationale, modules, deciders, witnesses, labels, and a **Links** section. Links are shown on **both sides** (the target record also shows the incoming link with its inverse label) together with **who created the link**. You can add and remove links at any time — this is the sanctioned way to correct an immutable record.

### Activity Log
A timestamped, colour-coded feed of everything that happened: `ADDED` / `UPDATED` / `REMOVED` / `LINKED` / `SUPERSEDED`. Search by person, document number, or detail; filter by action and date range; and **export the (filtered) result as CSV** (UTF-8 BOM, Excel-friendly). Visible to everyone.

### Reports
Summary tiles (total / in force / superseded) plus horizontal-bar distributions by affected area, month, module, label, top deciders, and top creators. **"Download as PDF"** opens a print-optimised view (browser → Save as PDF).

### Profile
Every user can edit their own **name** and **change their password** (current + new). Email is shown read-only.

### Administration
Admin-only, tabbed:
- **Users** — create users; a selectable table with bulk **"Send info"** / **"Send reset"** (with a live send panel); per-row **Edit** opens a side **drawer** to change name, email, role, status, and to **set a new password directly** (ideal when no mail server is available); and **Delete** (blocked if the user has authored records or is the last admin).
- **Modules / Labels / Link Types** — create with description (+ colour, + direction/supersede for link types), inline **edit**, **merge**, and **delete** (blocked while in use).
- **Email Templates** — edit the subject and HTML body of each notification, with the available `{{variables}}` listed.

---

## 5. Architecture

A **pnpm-free npm-workspaces monorepo**:

```
decreta/
├── apps/
│   ├── api/            # Node.js + TypeScript + Fastify + PostgreSQL
│   │   ├── migrations/ # plain .sql, applied in order on boot
│   │   └── src/
│   │       ├── config/     # env parsing & validation (zod)
│   │       ├── db/         # pg pool, transaction helper, migration runner
│   │       ├── lib/        # AppError
│   │       ├── mail/       # nodemailer transport + renderer
│   │       ├── plugins/    # JWT auth (authenticate / requireAdmin)
│   │       └── modules/    # feature modules (route → service → repository)
│   │           ├── auth, users, account, persons, labels, modules,
│   │           ├── link-types, records, email-templates,
│   │           └── activity, reports, notifications
│   └── web/            # React + TypeScript + Vite (SPA)
│       └── src/
│           ├── auth/        # AuthContext
│           ├── i18n/        # translations + provider
│           ├── theme/       # theme provider
│           ├── components/  # Layout, drawers, pickers, atoms
│           ├── lib/         # api client, queries, types, format
│           └── pages/       # Records, NewRecord, Detail, Activity, Reports, Admin, Profile, Login, Reset
├── charts/decreta/     # Helm chart (single image)
├── docker-compose.yml  # dev stack (postgres + api + web)
├── Dockerfile          # production single image (multi-stage)
└── .github/workflows/  # ci.yml + publish.yml
```

**Layering (API):** each module is `routes` (HTTP + zod parsing) → `service` (business rules) → `repository` (SQL). No ORM — raw parameterised SQL via `pg`. Migrations are plain `.sql` files run by a small idempotent runner at startup.

**Single image (production):** a multi-stage `Dockerfile` builds the React app to static files and the API to `dist`, then a runtime stage where **Fastify serves both** — the API under `/api/*` and the SPA (with client-side routing fallback) everywhere else — on **port 4000**.

**Development:** `docker-compose` runs three containers — `postgres`, `api` (tsx watch, hot reload), and `web` (Vite dev server) — with the browser talking to the API via CORS.

---

## 6. Data Model

| Table | Purpose |
|---|---|
| `users` | Login accounts (`email`, `password_hash`, `full_name`, `role`, `is_active`). |
| `persons` | People referenced as deciders/witnesses (name only). |
| `labels` | Dynamic tags (`name`, `color`, `description`). |
| `modules` | Affected parts/modules (`name`, `description`). |
| `link_types` | Directional link types (`forward_name`, `inverse_name`, `color`, `is_supersede`, `description`). |
| `records` | **Append-only** decisions (`ref_no`, `decision`, `rationale`, `affects[]`, `created_by`, `search_tsv`). |
| `record_witnesses` / `record_deciders` | Record ↔ person (many-to-many). |
| `record_labels` / `record_modules` | Record ↔ taxonomy (many-to-many). |
| `record_links` | Typed links between records (`from_record`, `to_record`, `link_type_id`, `created_by`). |
| `password_reset_tokens` | Tokenised reset (SHA-256 hash, single-use, expiry). |
| `email_templates` | Editable email subject/body per event key. |
| `activity_log` | Audit trail (`action`, `actor_name`, `target_ref`, `target_text`, `record_id`). |
| `schema_migrations` | Applied migration bookkeeping. |

**Immutability** is guaranteed by a trigger on `records` that raises on any `UPDATE`/`DELETE`. Full-text search uses a generated `tsvector` (`turkish` config) plus `pg_trgm` for fuzzy matching.

---

## 7. Quick Start (Development)

**Requirements:** Docker + Docker Compose. (Node is only needed if you run the workspaces outside Docker.)

```bash
git clone https://github.com/cosarberk/decreta.git
cd decreta
cp .env.example .env      # adjust ports if 5433/5434 are taken
npm run dev               # = docker compose up --build
```

- **Web:** http://localhost:5173
- **API:** http://localhost:4000/api  (health: `/api/health`)
- **First admin** (from `.env`): `admin@decreta.local` / `admin`

Useful scripts:

```bash
npm run dev        # docker compose up --build
npm run dev:down   # stop (keep data)
npm run dev:reset  # stop + drop the database volume
npm run build      # build the production image (docker build -t decreta:latest .)
npm run start      # run the production image on :4000
```

Per-workspace checks:

```bash
npm run typecheck --workspace apps/api
npm run typecheck --workspace apps/web
npm run build --workspace apps/web
```

> The dev database is seeded with recommended labels and link types, and migrations run automatically on API start.

---

## 8. Configuration Reference

Everything is configured through **environment variables** — Helm and Docker Compose merely inject them. Email features are optional: if `SMTP_HOST` is empty, sending is silently disabled (and logged), and the app runs normally.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` / `production` / `test`. |
| `API_PORT` | `4000` | HTTP port the API/single-image listens on. |
| `POSTGRES_HOST` | — | Postgres host. |
| `POSTGRES_PORT` | `5432` | Postgres port (in-container). |
| `POSTGRES_USER` | — | Postgres user. |
| `POSTGRES_PASSWORD` | — | Postgres password. |
| `POSTGRES_DB` | — | Database name. |
| `JWT_SECRET` | — | JWT signing secret (min 8 chars; change in prod). |
| `PUBLIC_URL` | `http://localhost:4000` | Public base URL used to build email links. |
| `BOOTSTRAP_ADMIN_EMAIL` | — | First admin email (created if no admin exists). |
| `BOOTSTRAP_ADMIN_PASSWORD` | — | First admin password. |
| `BOOTSTRAP_ADMIN_NAME` | `Sistem Yöneticisi` | First admin display name. |
| `SMTP_HOST` | _(empty)_ | SMTP server; empty disables email. |
| `SMTP_PORT` | `587` | `587` (STARTTLS) or `465` (SSL). |
| `SMTP_SECURE` | `false` | `true` for port 465, `false` for 587. |
| `SMTP_USER` | — | SMTP username (often the mailbox login). |
| `SMTP_PASS` | — | SMTP password (secret). |
| `SMTP_FROM` | `Decreta <no-reply@decreta.local>` | Envelope/From address. |
| `SMTP_TLS_REJECT_UNAUTHORIZED` | `true` | Set `false` for self-signed certificate servers. |

> In development, `PUBLIC_URL` defaults to `http://localhost:5173` (the web dev server) so email links open the SPA. In Helm it is derived from the ingress host automatically.

---

## 9. Email: SMTP, Templates & Notifications

**Transport.** Nodemailer with connection/greeting/socket timeouts so an unreachable server fails fast instead of hanging; failures are logged (`[mail] Gönderilemedi …`). Sending is **best-effort** — a mail failure never breaks record creation or any request.

**Templates.** Four DB-backed, admin-editable templates (subject + HTML body) with `{{variable}}` placeholders, rendered inside a fixed brand frame:

| Key | Trigger | Variables |
|---|---|---|
| `record_created` | A new record is opened | `actorName`, `decision`, `refNo`, `url` |
| `link_added` | A link is added to a record | `actorName`, `decision`, `refNo`, `url` |
| `user_info` | Admin "Send info" | `fullName`, `email`, `role`, `loginUrl` |
| `password_reset` | Admin "Send reset" / reset flow | `fullName`, `resetUrl` |

**Notifications.** When a record is created or a link is added, all **active users** (except the actor) receive an email.

**Bulk admin sends** stream progress as NDJSON, so the admin sees each recipient go `sending → sent / failed (reason)` live; one failing recipient never stops the others.

---

## 10. Production: Single Image

```bash
npm run build     # docker build -t decreta:latest .
docker run --rm -p 4000:4000 --env-file .env decreta:latest
```

The image serves the SPA and API on port `4000`. Migrations and the bootstrap admin run on startup. Point `POSTGRES_*` at a reachable database and set a strong `JWT_SECRET`.

---

## 11. Deployment: Kubernetes & Helm

The chart in `charts/decreta/` deploys the single image with an in-cluster PostgreSQL `StatefulSet`, a Service, an optional Ingress, and Config/Secret objects. The app runs migrations itself on start.

```bash
helm install decreta charts/decreta \
  --set secrets.jwtSecret=$(openssl rand -base64 48) \
  --set postgres.password=$(openssl rand -base64 24) \
  --set ingress.host=decreta.example.com
```

**Required:** `secrets.jwtSecret`, `postgres.password`.
**Common values:** `image.tag` (default `latest`, or pin `vX.Y.Z`), `ingress.host`, `config.PUBLIC_URL` (auto-derived from the ingress host if empty), the `config.SMTP_*` fields, and `secrets.smtpUser` / `secrets.smtpPass`.

- Default first admin: `config.BOOTSTRAP_ADMIN_EMAIL` / `secrets.adminPassword`.
- `image.pullPolicy: Always` — a Rancher "Redeploy" pulls the fresh `latest`.
- As a Git-based Helm repo in Rancher: repo URL `https://github.com/cosarberk/decreta.git`, branch `main`, chart path `charts/decreta`.

---

## 12. CI/CD & Versioning

Two GitHub Actions workflows:

- **`ci.yml`** — on push to `dev` and PRs to `dev`/`main`: `npm ci`, typecheck (API + web), build (API + web). No image is pushed.
- **`publish.yml`** — on push to `main`:
  1. **Auto-bumps the version and creates a git tag** (patch by default; `#minor` / `#major` in the commit message to control it).
  2. **Bumps the Helm chart version** and pushes it back with `[skip ci]`.
  3. **Builds and pushes the image** to `docker.io/cosarberk/decreta` with tags `latest`, `vX.Y.Z`, and `sha-<commit>`.

Workflow: develop on `dev` (CI validates) → merge/push to `main` (publishes a new version). Repo secrets required for publishing: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

---

## 13. Developer Guide

### Conventions
- **TypeScript, strict.** ESM everywhere; relative imports use `.js` extensions in the API (NodeNext).
- **Layered API:** `routes` validate with zod and call `services`; `services` hold rules and call `repositories`; `repositories` run SQL. Keep HTTP concerns out of services.
- **No hardcoded data.** Everything meaningful (taxonomy, templates) is DB-driven and editable.
- **Barrel exports** per module (`index.ts`).

### Adding an API feature module
1. Create `apps/api/src/modules/<name>/` with `*.repository.ts`, `*.service.ts`, `*.routes.ts`, `index.ts`.
2. Register the routes in `apps/api/src/app.ts` under the `/api` prefix.
3. If it needs schema, add a numbered migration in `apps/api/migrations/NNN_*.sql` (applied automatically, in order, once).

### Adding to the web app
- Add server calls in `apps/web/src/lib/queries.ts` (typed against `lib/types.ts`).
- Use TanStack Query for reads/mutations; add pages under `pages/` and routes in `App.tsx`.
- Add any new strings to **both** languages in `i18n/translations.ts`.

### Migrations
Plain SQL, name them `NNN_description.sql`. The runner records applied files in `schema_migrations` and only runs new ones. They run inside a transaction; a failing migration rolls back and stops boot.

### Local checks
```bash
# API
cd apps/api && npx tsc -p tsconfig.json --noEmit
# Web
cd apps/web && npx tsc --noEmit && npm run build
```

---

## 14. API Reference

All endpoints are under `/api`. Authenticated endpoints expect `Authorization: Bearer <jwt>`; admin endpoints additionally require the `admin` role. Validation errors return `400` with a structured `issues` array; domain errors return the appropriate status with `{ error, message }`.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | – | Returns `{ token, user }`. |
| GET | `/auth/me` | user | Current profile. |
| PATCH | `/auth/me` | user | Update own name. |
| POST | `/auth/me/password` | user | Change own password (`currentPassword`, `newPassword`). |
| POST | `/auth/reset` | – | Set a new password with a reset `token`. |

### Records
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/records` | user | Faceted search: `q, affects, labels, modules, personId, createdBy, dateFrom, dateTo, status, page, pageSize`. |
| GET | `/records/:id` | user | Full record incl. links. |
| POST | `/records` | user | Create (append-only). |
| POST | `/records/:id/links` | user | Add a typed link. |
| DELETE | `/records/:id/links/:linkId` | user | Remove a link. |

### Persons
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/persons` | user | Autocomplete (`q`, `limit`). |
| POST | `/persons` | user | Create a person. |

### Labels / Modules / Link Types
Each of `/labels`, `/modules`, `/link-types` exposes:
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/…` | user | List (with usage counts / descriptions). |
| POST | `/…` | user¹ / admin | Create. |
| PATCH | `/…/:id` | admin | Update. |
| DELETE | `/…/:id` | admin | Delete (blocked if in use). |
| POST | `/…/:id/merge` | admin | Merge into another, then delete. |

¹ Labels can be created by any user (also implicitly from the record form); modules and link types are admin-managed.

### Users (admin) & account
| Method | Path | Description |
|---|---|---|
| GET | `/users` | List users. |
| POST | `/users` | Create user. |
| PATCH | `/users/:id` | Update name + email. |
| POST | `/users/:id/password` | Set a new password directly. |
| PATCH | `/users/:id/role` | Change role. |
| PATCH | `/users/:id/active` | Activate/deactivate. |
| DELETE | `/users/:id` | Delete (blocked if last admin / has records). |
| POST | `/users/send-info` | Bulk send account info (**NDJSON stream**). |
| POST | `/users/send-reset` | Bulk send reset links (**NDJSON stream**). |

### Email templates / Activity / Reports
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/email-templates` | admin | List templates + variables. |
| PATCH | `/email-templates/:key` | admin | Update subject/body. |
| GET | `/activity` | user | Search the audit log. |
| GET | `/activity/actions` | user | Distinct action keys (for the filter). |
| GET | `/activity/export` | user | CSV export (respects filters). |
| GET | `/reports/summary` | user | Aggregated report data. |
| GET | `/health` | – | Liveness. |

---

## 15. Internationalization & Theming

- **i18n:** a lightweight built-in system (dictionary + `t()`), no dependency. Turkish (default) and English, switchable in the top bar and persisted. Dates format per locale.
- **Theming:** four themes via a `data-theme` attribute — **Paper** and **Sepia** (light), **Night** and **Midnight** (dark) — switchable in the top bar and persisted. All colours are CSS tokens, so every screen adapts (including dark mode).

---

## 16. Security Notes

- Passwords are hashed with **bcrypt**; plaintext is never stored, so forgotten passwords cannot be resent — the reset flow or an admin "set password" is used instead.
- **JWT** auth (12h expiry). Set a strong `JWT_SECRET` in production.
- Reset tokens are stored **hashed** (SHA-256), are **single-use**, and expire in 24h.
- Records are immutable at the database level (trigger). Links (navigational metadata) remain editable and are themselves timestamped and attributed.
- Change the default admin password and all default secrets before exposing the app.

---

## 17. Troubleshooting

**Emails time out / "İşlem başarısız".** The server can't reach your SMTP host. Check the pod logs for the real reason (`[mail] Gönderilemedi (…): <code>`). From inside a pod you can test reachability, e.g.:
```bash
kubectl -n <ns> exec deploy/<release> -- node -e \
  "const s=require('net').connect(465,'mail.example.com');s.setTimeout(8000);\
   s.on('connect',()=>{console.log('OK');process.exit()});\
   s.on('timeout',()=>{console.log('TIMEOUT');process.exit()});\
   s.on('error',e=>{console.log('ERR',e.code);process.exit()})"
```
- `ETIMEDOUT` → the mail server (often firewall/fail2ban) is dropping the cluster's egress IP, or the port is wrong. Whitelist the cluster egress IP, or try `465`/`587`.
- `Invalid login / 535` → wrong username/password (some servers want the short login, not the full email).
- `self signed certificate` → set `SMTP_TLS_REJECT_UNAUTHORIZED=false`.

**Rancher shows an old chart version.** The chart version (`Chart.yaml`) is bumped only when the chart changes; the Docker image (`latest` / `vX.Y.Z`) is what carries app updates. Use **Redeploy** to pull the fresh `latest`.

**Port already in use (dev).** Postgres publishes on the host; change `POSTGRES_HOST_PORT` in `.env` if `5432`/`5433` are taken.

---

## 18. License

Proprietary — © Relteco / cosarberk. All rights reserved.
