# MConnect

**Local Content Supply Chain Finance** — powered by AI Logistix.

MConnect is the transaction-management infrastructure through which a purchase
order held by a local supplier can be submitted, verified, reviewed, financed,
executed, delivered, paid and closed — with every party seeing exactly the part
of that record their role entitles them to, and nothing beyond it.

Production: **https://mconnect.ailogistix.co**

> MConnect is a supply-chain coordination and transaction-management platform.
> Financing availability is subject to independent review and approval by
> participating financial institutions. Submission of a purchase order or
> financing request does not constitute an offer or commitment to provide
> financing. AI Logistix is not a bank, a licensed lender, or a representative
> of any government agency or project operator.

---

## Contents

- [What MConnect does](#what-mconnect-does)
- [Architecture](#architecture)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database and migrations](#database-and-migrations)
- [Demonstration data](#demonstration-data)
- [Authentication and the role model](#authentication-and-the-role-model)
- [Document storage](#document-storage)
- [Email](#email)
- [Testing](#testing)
- [Docker build](#docker-build)
- [Coolify deployment](#coolify-deployment)
- [DNS](#dns)
- [Backups](#backups)
- [Security](#security)
- [Localisation](#localisation)
- [The legacy static site](#the-legacy-static-site)

---

## What MConnect does

A local supplier may hold the technical capability to fulfil a major project's
requirements while lacking the working capital, USD access, bank credit,
supplier credit or collateral to execute the order in front of it — even when
the end customer is a highly creditworthy international corporation.

MConnect closes that gap by making the underlying transaction visible and
verifiable:

```
Purchase order → Verification → Financing review → Approved → Funded
   → Procurement → Logistics → Manufacturing → Delivery
   → Buyer acceptance → Payment → Repayment → Closed
```

Each stage is a state in an enforced machine. A purchase order that has not
been verified by its buyer has no path to a funded transaction — that is a
property of the code, not a convention.

---

## Architecture

```
src/
├── app/
│   ├── (public)/        Marketing site: home, how it works, local content,
│   │                    financial structure, why MConnect, contact
│   ├── (auth)/          Sign in, register, verify email, password reset
│   ├── (app)/app/       The authenticated application
│   ├── actions/         Server actions — the only mutation entry points
│   └── api/             Auth handler, health check, document downloads
├── components/          UI: shared primitives, marketing, app, transaction tabs
├── lib/                 Cross-cutting: auth, rbac, state machines, audit,
│                        storage, mail, validation, i18n, rate limiting
├── server/services/     Domain services — all business logic lives here
├── messages/            en.json, pt.json
└── proxy.ts             Edge proxy: /app gating and CSP
```

**Layering.** UI components never contain business logic. A server action parses
its input through a Zod schema, then calls a service. The service performs two
independent checks — a capability check (`can(actor, permission)`) and a
record-scope check (is this record within the actor's organization or shared
with it?) — before touching the database. Passing one is never sufficient.

This is what makes future integration possible without a rewrite: an ERP
webhook, a bank API, or a carrier tracking callback calls the same service
functions the UI does, and inherits the same checks.

**Stack.** Next.js 16 (App Router, React 19, server components), TypeScript,
PostgreSQL 16, Prisma 6, Tailwind CSS 3, Auth.js v5, Zod, Docker.

Further detail: [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Local development

Requirements: Node 22+, PostgreSQL 16 (or Docker).

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL and AUTH_SECRET

# Generate a real AUTH_SECRET:
openssl rand -base64 32

npx prisma migrate dev        # create the schema
npm run db:seed               # optional: demonstration data
npm run dev                   # http://localhost:3000
```

Or bring up the whole stack, including PostgreSQL and MinIO:

```bash
docker compose up --build
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Serve a production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm test` | Full test suite |
| `npm run prisma:migrate` | Create and apply a migration in development |
| `npm run prisma:deploy` | Apply committed migrations (production) |
| `npm run db:seed` | Load demonstration data |

---

## Environment variables

`.env.example` is the authoritative list. Never commit real values — in
production they are set in Coolify's Environment Variables panel.

### Required

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. In Coolify use the database service's **internal** hostname, never `localhost`. |
| `AUTH_SECRET` | Session signing key, minimum 32 characters. `openssl rand -base64 32`. Rotating it signs everyone out; it does not invalidate stored passwords. |
| `APP_URL` | Public origin, e.g. `https://mconnect.ailogistix.co`. Used to build links in email. |
| `AUTH_URL` | Same value. Auth.js validates callbacks against it. |

### Optional — email

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`,
`EMAIL_FROM`.

When absent, email degrades gracefully: notifications are still persisted to the
database and written to stdout, and every workflow remains fully usable. The
platform does not need a mail relay to operate.

### Optional — document storage

`STORAGE_DRIVER` (`s3` | `local`), `STORAGE_ENDPOINT`, `STORAGE_BUCKET`,
`STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION`,
`STORAGE_FORCE_PATH_STYLE`, `STORAGE_LOCAL_PATH`.

### Optional — limits and operations

`MAX_UPLOAD_BYTES` (default 25 MB), `SIGNED_URL_TTL_SECONDS` (default 300),
`SKIP_MIGRATIONS`, `SEED_PASSWORD`.

Environment parsing is centralised in `src/lib/env.ts` and validated by Zod. A
missing or malformed required value fails loudly at first use rather than
degrading silently.

---

## Database and migrations

Migrations live in `prisma/migrations/` and are committed.

```bash
npx prisma migrate dev --name describe_the_change   # development
npx prisma migrate deploy                           # production
npx prisma studio                                   # inspect data
```

In production, migrations are applied by `docker-entrypoint.sh` at container
start using `migrate deploy`, which only ever applies committed migration files.
It never resets a database and never generates a migration from schema drift. If
a migration fails, the container exits rather than serving traffic against a
schema the application does not expect.

Set `SKIP_MIGRATIONS=true` to start without applying them — for example when
running several replicas and applying migrations from a single release job.

### Design notes

- Every table uses a **UUID primary key**. Nothing sequential appears in a URL,
  so one organization cannot enumerate another's records.
- Human-readable identifiers (`MCONNECT-2026-000001`, `FR-…`, `SHP-…`) are
  separate unique columns, never primary keys.
- Money is `Decimal(18,2)` with an explicit ISO-4217 currency column. Floating
  point is never used for financial amounts.
- Country is always an explicit column. Nothing assumes a single market.
- Indexes cover organization ids, project ids, transaction ids, PO numbers,
  statuses, created dates and assigned organizations.

---

## Demonstration data

`npm run db:seed` creates a complete, fictional worked example: a Mozambican
supplier with a USD 500,000 verified purchase order, a USD 285,000 financing
request, a USD 250,000 approval, disbursements to vendors, a procurement plan,
two shipments with milestone histories, execution milestones, approvals, an open
information request and an audit trail.

**Every organization and person in it is fictional**, flagged `isDemo` in the
database and badged "Demo" in the interface. No real company is portrayed as
participating in the programme.

Passwords are **generated at seed time** and written to `.seed-credentials.txt`,
which is gitignored and created with mode 600. No password is ever committed.
Set `SEED_PASSWORD` to pin one shared password for a demonstration environment.

Never seed a production database.

---

## Authentication and the role model

Auth.js v5 with a credentials provider and JWT sessions in an HTTP-only,
SameSite=Lax cookie (Secure and `__Secure-` prefixed in production; 8-hour
lifetime).

Self-registration grants **no access**. It creates a user in `PENDING_REVIEW`
and a registration request in the AI Logistix queue. An administrator approves
it, which creates or attaches the organization and activates the account.

### Roles

| Role | Can |
|---|---|
| `SUPPLIER` | Maintain its own profile and users; raise, edit and submit purchase orders; request financing; maintain the procurement plan and milestones; upload documents; invoice; respond to information requests. **Cannot** verify its own PO, approve financing, or accept its own delivery. |
| `EPC` | Verify purchase orders assigned to its organization; confirm delivery and acceptance; accept and pay supplier invoices; raise information requests; upload documents. |
| `PROJECT_OWNER` | Everything an EPC can do, plus project management and programme analytics. |
| `FINANCIER` | Review transactions shared with its institution; record approvals, rates, fees and conditions precedent; record funding and repayments. Sees nothing that has not been shared with it. |
| `AI_LOGISTIX_OPERATIONS` | Coordinate every transaction: review and route financing, manage procurement, logistics and milestones, record disbursements, share transactions, read the audit log. |
| `AI_LOGISTIX_ADMIN` | Everything operations can do, plus the capabilities that change security posture: cross-organization user administration, document deletion, platform settings. |
| `VIEWER` | Read-only access to specifically authorized transactions — auditors, embassies, development-finance institutions, programme sponsors. Holds no write capability at all. |

The capability matrix is `src/lib/rbac.ts`. Record scoping is
`src/server/services/access.ts`. Both are enforced on the server for every
action; hiding a control in the interface is never treated as a control.

---

## Document storage

Abstracted behind `StorageDriver` in `src/lib/storage.ts`, with two drivers:

- **`s3`** — any S3-compatible service: MinIO, Cloudflare R2, Backblaze B2, AWS.
  Downloads are short-lived signed URLs. Objects are written with SSE.
- **`local`** — the filesystem at `STORAGE_LOCAL_PATH`. Requires a persistent
  volume. Downloads stream through the application, behind the same
  authorization check.

Documents are never publicly addressable. Every download passes through
`/api/documents/[id]/download`, which re-checks the session, the capability, the
transaction scope and the document's visibility, then records an audit event.
Storage keys are unguessable, so a leaked key still needs an authorization pass.

Uploads are limited by MIME type **and** extension (PDF, images, Office, CSV,
plain text) and by size. Executables and scripts are rejected outright.

---

## Email

Optional and non-blocking. Notifications are persisted first, then delivery is
attempted. When SMTP is unconfigured the notification is marked `SKIPPED` and
logged to stdout, so the workflow is fully exercisable before a relay exists.

Events: registration received and approved, PO submitted, verification
requested, PO verified or returned, financing submitted, information requested,
financing approved or declined, funding recorded, delivery accepted, payment
recorded, repayment recorded, transaction closed, information request raised,
and mentions.

---

## Testing

```bash
npm test
```

68 tests. The integration tests run against a real PostgreSQL schema, because
the rules they check are enforced partly by query composition and partly by
database constraints — mocking Prisma would test nothing worth testing.

`TEST_DATABASE_URL` must point at a **dedicated, disposable** database. The
suite applies committed migrations with `migrate deploy` (which also proves the
migrations produce the schema the application expects) and truncates tables
between files, so it never drops a schema it did not create.

Coverage:

- a supplier cannot see another supplier's transactions, purchase orders or
  documents, and a guessed identifier reports NotFound rather than Forbidden;
- a supplier cannot verify its own purchase order, even when one of its users
  holds a verifying role;
- an EPC can verify only purchase orders assigned to it;
- a financier sees only transactions shared with its institution, and loses
  access when the share is revoked;
- AI Logistix staff reach everything;
- invalid status transitions fail, and an unverified PO cannot reach funded;
- unauthorized and restricted-visibility document downloads fail, and permitted
  ones are audited;
- organization membership, not role alone, determines reach;
- the full workflow from PO creation to CLOSED, asserting every major action
  lands in the audit trail with no secret or bank identifier in it.

---

## Docker build

```bash
docker build -t mconnect:latest .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://…" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e APP_URL="http://localhost:3000" \
  -e AUTH_URL="http://localhost:3000" \
  mconnect:latest
```

Four stages: dependencies, build, an isolated Prisma CLI tree, and a runtime
carrying only the Next.js standalone output plus that CLI. The final image runs
as a non-root user (`mconnect`, uid 1001), contains no build toolchain, and
bakes in no secret — the build-time placeholders are scoped to the build step
and never recorded in the image environment.

Logs go to stdout/stderr. A `HEALTHCHECK` polls `/api/health`.

---

## Coolify deployment

### 1. PostgreSQL

Create a PostgreSQL 16 service. Note its **internal** hostname — the
application container cannot reach `localhost`.

### 2. Application

- **Build pack:** Dockerfile
- **Dockerfile location:** `/Dockerfile`
- **Base directory:** `/`
- **Port:** `3000`
- **Health check path:** `/api/health`

### 3. Environment variables

Set at minimum:

```
DATABASE_URL=postgresql://USER:PASSWORD@<internal-postgres-host>:5432/mconnect?schema=public
AUTH_SECRET=<openssl rand -base64 32>
APP_URL=https://mconnect.ailogistix.co
AUTH_URL=https://mconnect.ailogistix.co
```

Then SMTP and storage as required.

### 4. Persistent storage

**With `STORAGE_DRIVER=s3`** (recommended): no volume needed. Point
`STORAGE_ENDPOINT` and credentials at your object storage.

**With `STORAGE_DRIVER=local`**: mount a persistent volume at `/app/.storage`.
Without it, uploaded documents are lost on every redeploy.

### 5. Domain and TLS

Set the domain to `https://mconnect.ailogistix.co`. Coolify's Traefik proxy
terminates TLS and forwards `X-Forwarded-*`; the application trusts those
headers (`trustHost: true`) and derives the client address from them for rate
limiting and audit. HSTS is set by the application.

### 6. Deploy

Migrations run automatically at container start. The first deployment creates
the schema.

### 7. First administrator

The seed script is a demonstration tool and should not be run against
production. Create the first real administrator by connecting to the database
and inserting an organization, a user with a bcrypt hash, and a membership with
role `AI_LOGISTIX_ADMIN` — or run the seed once in a staging environment,
confirm the flow, and register the first real user through `/register` and
approve them with a temporarily seeded admin.

### Manual steps after deployment

1. Set the environment variables above (nothing is baked into the image).
2. Attach persistent storage if using the `local` driver.
3. Create the first administrator account.
4. Configure SMTP (until then, notification email is logged, not sent).
5. Create the real projects and organizations through the admin screens.
6. Rotate or remove any demonstration accounts.

---

## DNS

Point `mconnect.ailogistix.co` at the Coolify host:

| Type | Name | Value |
|---|---|---|
| `A` | `mconnect` | Coolify server's public IPv4 |
| `AAAA` | `mconnect` | Coolify server's public IPv6 (if used) |

Or a `CNAME` to the Coolify host's FQDN if that is how the other services on
this server are configured. Coolify issues the Let's Encrypt certificate once
the record resolves.

**No DNS record has been created or modified by this work.**

---

## Backups

The database is the system of record for every transaction, approval and audit
event. Production expectations:

- **PostgreSQL:** nightly `pg_dump` at minimum, retained off-host for 30 days,
  with point-in-time recovery if the volume of transactions justifies it.
  Coolify can schedule database backups to S3-compatible storage.
- **Documents:** if `STORAGE_DRIVER=s3`, enable bucket versioning and a
  lifecycle policy. If `local`, the `/app/.storage` volume must be in the host's
  backup set — it holds the only copy of every uploaded document.
- **Restore drills:** a backup that has never been restored is a hypothesis.
  Restore into a staging environment periodically and confirm the application
  starts against it.
- **Secrets:** `AUTH_SECRET` and storage credentials are not in the repository
  or the image. Keep them in a password manager; losing `AUTH_SECRET` signs
  everyone out, and losing storage credentials orphans every document.

---

## Security

See [SECURITY.md](./SECURITY.md) for the full model, assumptions and known
limitations. In summary: bcrypt password hashing, hashed single-use tokens,
database-backed rate limiting, account lockout, organization isolation enforced
in query composition, an append-only audit trail with redaction, signed and
audited document access, an enforced state machine, security headers and CSP,
and a deliberate refusal to store banking credentials or full account numbers.

**Report a vulnerability** privately to AI Logistix rather than opening a public
issue.

---

## Localisation

English is the MVP default and the only complete catalogue. Portuguese is
scaffolded in `src/messages/pt.json` — it matters for Mozambique — and French is
reserved. User-visible strings resolve through `t(key, locale)` so a later phase
adds a language by adding a catalogue rather than by touching components. The
`User.locale` column already carries the preference.

Full translation is a later phase; the current Portuguese catalogue covers
navigation, common actions and the disclosures, and falls back to English for
anything not yet translated.

---

## The legacy static site

The original single-page AI Logistix corporate site is preserved unchanged in
[`legacy/`](./legacy/), with its own compose file. It was moved there so the
repository root could hold the MConnect application. If that site is deployed
from this repository, update the Coolify application's base directory to
`legacy/` — it is otherwise unaffected.
