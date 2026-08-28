# MConnect — architecture

This document explains how MConnect is put together and, where a choice was not
obvious, why it was made that way. It complements the [README](./README.md)
(how to run it) and [SECURITY.md](./SECURITY.md) (the security model).

---

## 1. Shape of the system

MConnect is a single Next.js application backed by PostgreSQL. It is not a
microservice estate, and deliberately so: the workflow it manages is one
transaction moving through one lifecycle, and the integrity rules that matter —
"an unverified purchase order cannot be funded" — are far easier to enforce
correctly inside one database transaction than across a network boundary.

What it does have is a hard internal boundary between the interface and the
domain.

```
Browser
  │
  ├── Server component ──────────► service (read)  ──► Prisma ──► PostgreSQL
  │
  └── Server action ──► Zod ─────► service (write) ──► Prisma ──► PostgreSQL
                                        │
                                        ├──► audit (append-only)
                                        └──► notifications ──► SMTP (optional)
```

Every mutation follows the same path. There is no second way in.

---

## 2. Layers

### `src/app` — routing and interface

Four route groups:

| Group | Contents |
|---|---|
| `(public)` | The marketing site. Statically rendered. |
| `(auth)` | Sign in, register, verify email, reset password. |
| `(app)/app` | The authenticated application. Every page resolves the session server-side. |
| `api` | Auth handler, health check, document downloads. |

Pages are server components. They call services directly and render the result;
they hold no business logic and no authorization decisions of their own beyond
choosing what to display.

### `src/app/actions` — server actions

The only mutation entry points. Each action:

1. resolves the actor from the session (throwing if absent),
2. parses input through a Zod schema,
3. calls a domain service,
4. converts domain errors into form state.

Actions never trust a client-supplied organization id, supplier id or status.
Where a form appears to submit one — the supplier on a purchase order, say — the
service overrides it from the session unless the actor is AI Logistix staff
acting deliberately on another organization's behalf.

### `src/server/services` — the domain

All business logic. Each service function performs **two independent checks**
before touching data:

1. **Capability** — `requirePermission(actor, 'po:verify')`. Does this role hold
   this power at all?
2. **Scope** — `requireTransactionScope(actor, id)`. Is this specific record
   within the actor's reach?

Passing one is never sufficient. A user with the EPC role in a supplier
organization holds `po:verify` and still cannot verify that organization's own
purchase order, because the scope check compares the PO's supplier against the
actor's organization. There is a test for exactly this.

| Service | Responsibility |
|---|---|
| `access` | Scope predicates and the transaction-scope resolver. The security keystone. |
| `purchase-orders` | Creation, editing, submission, verification. |
| `transactions` | Lifecycle, stage history, sharing, closing, audit assembly. |
| `funding` | Requests, review, decisions, funding, disbursements, repayments. |
| `procurement` / `logistics` | The plan, vendors, shipments, milestone events. |
| `milestones` | Execution plan; completion pulls the stage forward. |
| `documents` | Upload validation, visibility scoping, the download choke point. |
| `communications` | Comments, mentions, requests for information. |
| `delivery` | Acceptance, invoicing, buyer payment. |
| `organizations` / `users` / `registration` | Onboarding and administration. |
| `analytics` / `dashboard` / `next-action` | Read models. |
| `approvals` / `notifications` | Cross-cutting decision records and messaging. |

### `src/lib` — cross-cutting

`auth`, `session`, `rbac`, `state-machine`, `audit`, `storage`, `mail`,
`validation`, `rate-limit`, `password`, `ids`, `i18n`, `env`, `db`.

---

## 3. The two-check authorization model

The single most important design decision.

**Capability** answers *"may this role ever do this?"* — a static matrix in
`src/lib/rbac.ts`, one set of permissions per role.

**Scope** answers *"is this record within reach?"* — a Prisma `where` fragment
composed into the query itself:

```ts
export function transactionScopeWhere(actor: Actor): Prisma.TransactionWhereInput {
  if (isStaff(actor)) return {}
  return {
    OR: [
      { supplierId: actor.organizationId },
      { buyerId: actor.organizationId },
      { project: { projectOwnerId: actor.organizationId } },
      { project: { epcId: actor.organizationId } },
      { access: { some: { organizationId: actor.organizationId, revokedAt: null } } },
    ],
  }
}
```

Because the predicate is composed *into* the query rather than applied to its
results, an out-of-scope row never leaves the database. There is no filtered
list from which something could be forgotten.

An out-of-scope record raises `NotFoundError`, never `AuthorizationError`. The
two are deliberately indistinguishable to the caller, so an identifier cannot be
probed to discover whether a record exists. Combined with UUID primary keys,
this closes the enumeration surface.

---

## 4. State machines

Four explicit machines in `src/lib/state-machine.ts`: purchase orders, funding
requests, transaction stages and procurement items. Each is a map from a state
to the states reachable from it, and every status change goes through
`assertTransition`.

This is what makes the central business rule structural rather than procedural.
`FUNDING_REQUEST_TRANSITIONS` has no edge into `FUNDED` except from `APPROVED`,
and `submitFundingRequest` refuses to leave `DRAFT` unless the purchase order is
`VERIFIED`. There is therefore no sequence of API calls that funds an unverified
purchase order — not a rule someone remembered to write, but a property of the
graph.

**Implied stages.** Real transactions skip steps: a buyer confirming acceptance
implies delivery happened even if nobody recorded a DELIVERY stage. Rather than
silently refusing such an update — which would leave the lifecycle banner
stale — `advanceStageIfAhead` walks the lifecycle one step at a time and records
each intervening stage, marked as implied. The stage history stays a complete
account of how the transaction reached where it is. A target behind the current
stage is ignored: progress is never rolled back by a late-arriving update.

---

## 5. Data model

Twenty-four models. The ones that carry the workflow:

```
Organization ─┬─ OrganizationMembership ── User
              ├─ SupplierProfile
              └─ BankingRelationship

Project ── PurchaseOrder ── Transaction ─┬─ FundingRequest ─┬─ FundingRequestLine ── Vendor
                                         │                  ├─ Disbursement
                                         │                  └─ Repayment
                                         ├─ ProcurementItem ── Vendor
                                         ├─ Shipment ── ShipmentMilestone
                                         ├─ TransactionMilestone
                                         ├─ Document
                                         ├─ Approval
                                         ├─ Comment / Rfi
                                         ├─ Invoice
                                         ├─ TransactionAccess
                                         └─ TransactionStageEvent

AuditEvent · Notification · Inquiry · RegistrationRequest
VerificationToken · RateLimitCounter · PlatformSetting
```

Decisions worth stating:

**UUID primary keys everywhere.** Nothing sequential appears in a URL.
`MCONNECT-2026-000012` is a display column with its own unique index; the
sequence is derived inside the caller's transaction so two concurrent
submissions cannot claim the same number.

**Approvals are records, not booleans.** `Approval` carries who was asked, who
decided, when, and why. A rejected decision stays in the history after a later
approval supersedes it — which is the entire point of an approval trail. Storing
`isApproved: true` would have thrown that away.

**Money is `Decimal(18,2)` with an explicit currency column.** Floating point is
never used for a financial amount.

**`TransactionAccess` is an explicit grant.** A financier or auditor reaches a
transaction only through a row here, revocable by setting `revokedAt`. Access is
data, not an inference from a role.

**Country is always a column.** Nothing assumes Mozambique, a single currency,
or a single language.

**Banking data is deliberately minimal.** `BankingRelationship` holds an
institution, a branch, a currency and a *masked* identifier. The Zod schema
rejects anything resembling a full account number, so one cannot be stored even
by a user pasting it in.

---

## 6. Documents

One choke point: `authorizeDownload` in `src/server/services/documents.ts`,
reached only through `/api/documents/[id]/download`. It re-checks the session,
the capability, the transaction scope and the document's `visibility`, records an
audit event, and only then mints a short-lived signed URL (S3) or streams the
bytes (local driver). Nothing else in the application hands out a storage key.

`DocumentVisibility` has four levels — owning organization only, transaction
parties, parties plus financiers, and everyone including auditors — filtered
server-side, never hidden in markup.

The `StorageDriver` interface has two implementations today. The upload
allow-list lives in its own Node-free module so client components can read the
`accept` attribute without pulling the filesystem driver into the browser
bundle — a mistake the build caught, and the reason for the split.

---

## 7. Audit

`recordAudit` is append-only: no code path updates or deletes an `AuditEvent`.

It **never throws**. A logging failure must not roll back a business action the
user has already been told succeeded; failures go to stderr instead, where the
Coolify log stream picks them up.

Before/after payloads pass through `redact`, which walks the structure and
replaces any value under a sensitive key — passwords, hashes, tokens, secrets,
account numbers, IBANs, card numbers — with `[redacted]`. A test asserts the
trail contains no such value after a full workflow run.

---

## 8. Read models

Three services exist purely to answer questions the write model would answer
slowly or awkwardly:

- **`dashboard`** — one query set per role, so a dashboard never loads rows the
  actor is not entitled to and then hides them.
- **`analytics`** — computed entirely from stored records. Where the platform
  holds no data for a metric it is reported as `null` and rendered as "no data",
  and named in an `unavailable` list. Nothing is estimated or extrapolated.
- **`next-action`** — resolves "what do I need to do next?" for the actor's role
  against a snapshot of the transaction. The transaction page leads with it, and
  it is the reason a supplier sees "provide vendor quotations" where an EPC sees
  "verify this purchase order".

---

## 9. Designed for, not yet built

The schema and service boundaries anticipate these without implementing them:

| Extension | What is already in place |
|---|---|
| ERP / procurement API verification | `VerificationMethod.ERP_LOOKUP`; verification is a record with a method, not a boolean. |
| Carrier tracking APIs | `ShipmentMilestone.sourceSystem`, `'MANUAL'` today; an integration writes its own identifier and manual and automatic events coexist. |
| Payment rails (Stripe Treasury, banking APIs, SWIFT) | `Disbursement` carries payee, amount, currency, purpose, authorization status, payment status and an external reference. Attaching a rail does not migrate business data. |
| Multi-currency accounting | Every amount already carries its own currency column. |
| Multi-country programmes | Country is explicit throughout; nothing is hard-coded to one market. |
| Portuguese and French | `t(key, locale)`, catalogues per locale, `User.locale`. |
| MFA | `User.mfaEnabled` / `mfaSecret` reserved; no secret material stored until implemented. |
| Sanctions screening, KYB, risk scoring | `KycStatus` as a lifecycle, `Organization.kycNotes`, document categories for KYC evidence. |
| Electronic signature, receivables assignment, insurance | `Approval` types and `Document` categories extend without schema change. |

---

## 10. Things deliberately not done

- **No impersonation.** The brief permitted it only if every event were
  prominently disclosed and audited. Doing that safely is more work than it
  looks, and the risk of a half-built version is that an administrator acts as a
  user without the trail making it obvious. Omitted from the MVP, as the brief
  allowed.
- **No client-side state library.** Pages are server-rendered and forms post to
  server actions. There is no client store to fall out of sync with the
  database, and no authorization decision that exists only in the browser.
- **No component framework.** The UI set is hand-rolled on plain elements. It
  keeps the server-render path simple and avoids a dependency that would have to
  be upgraded in lockstep with Next.
- **No money movement.** Disbursements and repayments are record-keeping only,
  as specified. The shape is close to what a rail would need so one can be
  attached later.
