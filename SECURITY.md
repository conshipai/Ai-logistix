# MConnect — security model

MConnect holds commercially sensitive information: purchase-order values,
supplier margins, financing terms, KYC documents and audited financials. A
disclosure between competing suppliers, or from a supplier to an unauthorised
financier, is a commercial harm even when no money moves.

This document states what the platform does, what it assumes, and what it does
not yet do. It is written to be checked rather than believed.

---

## 1. Threat model

**Defended against**

| Threat | Control |
|---|---|
| One organization reading another's transactions or documents | Scope predicates composed into every query; UUID keys; NotFound-not-Forbidden |
| A supplier verifying its own purchase order, or approving its own financing | Identity checks in the service layer, independent of role |
| A user escalating their own privileges | Role assignment restricted; a non-staff user cannot mint an AI Logistix role |
| Identifier enumeration | UUID primary keys; out-of-scope reads are indistinguishable from non-existent |
| Credential stuffing and brute force | Per-address and per-account rate limiting; lockout after 8 failures |
| Account enumeration via login, registration or password reset | Uniform responses and constant-work password comparison |
| Session theft via XSS | HTTP-only, Secure, SameSite=Lax cookies; CSP; no token in JavaScript-readable storage |
| Cross-site request forgery | Auth.js CSRF tokens; SameSite cookies; server actions bound to origin |
| Malicious file upload | MIME **and** extension allow-list; size cap; no execution path; downloads served with `nosniff` and a sandbox CSP |
| Direct object reference on a document | Unguessable storage keys; every download re-authorized and audited |
| Workflow bypass (funding an unverified PO) | Enforced state machines |
| Secrets leaking into logs or the audit trail | Redaction at write time; no secret in the repository or the image |

**Not defended against, and out of scope for the MVP**

- A compromised administrator account. `AI_LOGISTIX_ADMIN` is trusted by design.
  MFA is the intended mitigation and is scaffolded, not implemented.
- A compromised host or database. Encryption at rest is the platform operator's
  responsibility (volume or managed-database encryption).
- Sophisticated denial of service. Rate limiting is per-action, not volumetric;
  edge protection belongs in front of the application.
- Malware inside an uploaded document. Files are stored, never executed, and
  served with `nosniff` and a sandboxing CSP, but they are not scanned.

---

## 2. Authentication

- **Hashing:** bcrypt, cost 12. Passwords are never logged, never emailed, never
  returned by an API, and never shown to an administrator.
- **Policy:** minimum 12 characters with upper case, lower case and a digit.
  Length carries most of the strength; the class rules are kept modest so
  suppliers are not pushed toward writing passwords down.
- **Sessions:** Auth.js v5, JWT strategy, 8-hour lifetime, refreshed every 30
  minutes. The cookie is `httpOnly`, `sameSite=lax`, `secure` in production, and
  carries the `__Secure-` prefix there.
- **Revocation:** on refresh, the membership is re-read from the database. A
  suspended user or a deactivated membership stops working on the next request
  rather than when the token expires.
- **Lockout:** 8 consecutive failures locks an account for 15 minutes.
- **Timing:** a sign-in attempt for an unknown address still performs a bcrypt
  comparison against a dummy hash, so response timing does not disclose which
  addresses are registered.
- **Uniform failure:** every unsuccessful sign-in returns the same message.
- **Tokens:** email-verification and password-reset tokens are 256-bit random
  values. Only their SHA-256 hash is stored; the plaintext exists solely in the
  emailed link. They are single-use, expire (48 hours and 1 hour respectively),
  and a successful reset invalidates every other outstanding reset token.
- **Registration:** grants no access. It creates a `PENDING_REVIEW` user and a
  review request. Disposable-email domains are rejected.

**MFA readiness.** `User.mfaEnabled` and `mfaSecret` exist. No secret material
is stored until MFA is implemented, so nothing is sitting in the database
waiting to be stolen.

---

## 3. Authorization

Two independent checks on every action. See
[ARCHITECTURE.md §3](./ARCHITECTURE.md#3-the-two-check-authorization-model).

1. **Capability** — the static role matrix in `src/lib/rbac.ts`.
2. **Scope** — a Prisma predicate composed into the query, so an out-of-scope
   row never leaves the database.

**Hiding a control in the interface is never treated as a control.** Every page,
server action and route handler resolves the session and repeats both checks
server-side. The navigation is a convenience.

**Identity rules enforced in services, not roles:**

- A supplier can never verify its own purchase order — checked against the PO's
  `supplierId`, so it holds even if one of its users is given a verifying role.
- Verification is restricted to the buyer named on the PO, the project's EPC or
  owner, or AI Logistix.
- A financing decision can only be recorded by the assigned institution.
- A supplier cannot accept its own delivery or certify its own invoice.
- An RFI can only be addressed to an organization already party to the
  transaction, so it cannot be used to expose one to a third party.
- A mention only notifies users who can already reach the transaction.
- A procurement line can only reference a vendor belonging to that
  transaction's supplier.

**Read-only access** (`VIEWER`, or a `TransactionAccess` row with
`readOnly: true`) holds no write capability at all, and `assertWritable` refuses
every mutation regardless of role.

---

## 4. Organization isolation

The property this platform lives or dies by: organization A must not learn
anything about organization B.

- Every scoped query composes `transactionScopeWhere` / `purchaseOrderScopeWhere`
  into its `where` clause.
- Every primary key is a UUID; nothing sequential is exposed.
- Out-of-scope and non-existent are the same error.
- Document visibility is filtered server-side after the transaction scope check.
- Financiers see only what has been explicitly shared, and lose access the
  moment `revokedAt` is set.

Nine integration tests exercise exactly this, including the case of an
authenticated supplier from an unrelated organization requesting a known
transaction id (404) and a known document id (404).

---

## 5. Input validation

Every server action parses its input through a Zod schema before anything else.
Client-side validation is a convenience; these schemas are the authority.

Notable rules:

- Money is coerced and bounded; negatives and non-finite values are rejected.
- A financing request cannot exceed the purchase-order value; an approval cannot
  exceed the amount requested; disbursements cannot exceed the approved
  facility; repayments cannot exceed the outstanding balance.
- Use-of-funds lines must reconcile to the total requested.
- Verifying a purchase order requires every checklist item; rejecting one
  requires a comment.
- **Banking fields reject a full account number.** `maskedAccountIdentifier`
  accepts only a masked form; `payeeBankDetails` rejects any run of seven or
  more digits.

---

## 6. Documents

- Uploads validated by MIME type **and** extension against an allow-list (PDF,
  images, Office, CSV, plain text). Executables and scripts are rejected.
- Size capped by `MAX_UPLOAD_BYTES` (default 25 MB) and rate limited per user.
- Storage keys are UUID-based and unguessable; a leaked key still needs an
  authorization pass.
- Downloads pass through one route that re-checks the session, capability,
  transaction scope and visibility, then records an audit event.
- S3 signed URLs expire in `SIGNED_URL_TTL_SECONDS` (default 300) and are issued
  per request. Objects are written with server-side encryption.
- Locally streamed documents are served `private, no-store`, `nosniff`, and
  `Content-Security-Policy: default-src 'none'; sandbox`, with the filename
  sanitised into the `Content-Disposition` header.
- Deletion is soft: the row and its audit history are retained; only the object
  is removed. Administrators only.

---

## 7. Audit trail

Append-only. No code path updates or deletes an `AuditEvent`.

Recorded: sign-in and failed sign-in, sign-out, registration, account creation,
permission changes, password reset requests and completions, organization
creation and status changes, project changes, purchase-order creation,
submission, verification and rejection, transaction creation, stage changes,
sharing and closure, financing requests, decisions, funding and repayments,
disbursements, document upload, view and deletion, procurement and shipment
updates, milestones, approvals, comments, RFIs, invoices and delivery
acceptance.

Each row carries actor, actor email (denormalised so the trail survives a user
being removed), organization, action, entity type and id, before/after data,
metadata, IP address, user agent and timestamp.

**Redaction.** `redact` walks before/after payloads and replaces any value under
a sensitive key — `password`, `passwordHash`, `token`, `tokenHash`, `secret`,
`mfaSecret`, `apiKey`, `accessKey`, `secretKey`, `authorization`, `cookie`,
`sessionToken`, `accountNumber`, `iban`, `swift`, `bankAccount`,
`payeeBankDetails`, `cardNumber`, `cvv`, `ssn` — with `[redacted]`. A test
asserts the trail contains none of these after a full workflow run.

`recordAudit` never throws.

---

## 8. Rate limiting

Fixed-window counters in PostgreSQL, so limits survive a restart and hold across
replicas.

| Action | Limit |
|---|---|
| Sign-in | 10 per 15 min, per address **and** per account |
| Registration | 5 per hour per address |
| Password reset | 5 per hour per address |
| Upload | 60 per hour per user |
| Download | 200 per hour per user |
| Public inquiry | 5 per hour per address |

A rate-limiter outage fails **open** and logs. Locking every user out of a
finance platform because a counter table is unavailable is the worse failure.

The client address is taken from `X-Forwarded-For`, which is trustworthy here
because the only path to the application is through the Coolify proxy. If the
container is ever exposed directly, that assumption breaks and the header must
be treated as spoofable.

---

## 9. Transport and headers

Set in `next.config.ts` and `src/proxy.ts`:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY` and `frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `X-Powered-By` removed
- CSP: `default-src 'self'`; scripts from self; styles from self and Google
  Fonts; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`

**Known CSP limitation:** `'unsafe-inline'` is present on `script-src` and
`style-src`. Next.js's inlined bootstrap and Tailwind's critical CSS require it
without a nonce-threading pass. This weakens the XSS mitigation CSP would
otherwise give; the primary defences remain React's escaping and the absence of
`dangerouslySetInnerHTML` anywhere in the codebase. Tightening this with a
per-request nonce is a Phase 2 item.

TLS is terminated by the Coolify proxy. The application trusts `X-Forwarded-*`.

---

## 10. Secrets

- Nothing sensitive is in the repository. `.env` and `.seed-credentials.txt` are
  gitignored; `.env.example` contains placeholders only.
- Nothing sensitive is in the Docker image. The build-time `DATABASE_URL` and
  `AUTH_SECRET` placeholders are scoped to the build step and are never recorded
  in the image environment.
- Seed passwords are generated per run, written to a mode-600 gitignored file,
  and never committed.
- `AUTH_SECRET` must be at least 32 characters; the application refuses to start
  otherwise. Rotating it signs everyone out and does not invalidate passwords.

---

## 11. Data privacy

MConnect stores as little financial identity data as it can:

- **Banking:** institution, branch, account currency, a *masked* identifier, and
  a relationship-manager contact. Nothing more.
- **Never stored:** online banking credentials, full account numbers, complete
  payment-card details. Validation rejects them on the way in.
- Sensitive-field encryption at rest is designed for but not implemented; today
  this relies on database and volume encryption at the infrastructure layer.

---

## 12. Dependencies

`npm audit --omit=dev` reports **zero vulnerabilities** at the time of writing.
Next.js is pinned to a patched release, and npm `overrides` pin transitive
dependencies (`nodemailer`, `deepmerge-ts`) to patched versions where an
intermediate package's range would otherwise hold them back.

Re-run `npm audit` before each deployment. A high or critical advisory in a
production dependency should block a release.

---

## 13. Known limitations

Stated plainly, because a security document that lists only strengths is not
useful:

1. **MFA is not implemented.** Schema is ready; enrolment and verification are
   not. A compromised password is currently sufficient to sign in.
2. **CSP allows inline scripts and styles.** See §9.
3. **No automated malware scanning** of uploaded documents.
4. **No field-level encryption at rest.** Relies on infrastructure encryption.
5. **Fixed-window rate limiting** allows a burst at a window boundary. Accepted
   for login and upload throttling.
6. **No automated sanctions or PEP screening.** KYC status is a manual
   administrative decision today.
7. **No impersonation, deliberately.** Omitted rather than half-built.
8. **Audit immutability is enforced by convention**, not by a database rule.
   No code path writes or deletes an audit row, but a database user with write
   access could. A revoked-UPDATE/DELETE grant on `audit_events`, or append-only
   replication, would make this structural.
9. **`X-Forwarded-For` is trusted.** Correct behind the Coolify proxy; wrong if
   the container is ever exposed directly.

---

## 14. Deployment checklist

Before exposing an environment publicly:

- [ ] `AUTH_SECRET` generated with `openssl rand -base64 32`, not a placeholder
- [ ] `APP_URL` and `AUTH_URL` set to the real HTTPS origin
- [ ] TLS active; the site is unreachable over plain HTTP
- [ ] Database credentials unique to this deployment
- [ ] Persistent storage attached (volume, or S3 credentials configured)
- [ ] Database backups scheduled **and a restore tested**
- [ ] Demonstration accounts removed or rotated; `.seed-credentials.txt` deleted
- [ ] SMTP configured, so password resets actually reach people
- [ ] `npm audit --omit=dev` clean
- [ ] The first administrator account created and its password stored in a
      password manager

---

## Reporting a vulnerability

Report privately to AI Logistix rather than opening a public issue. Include the
affected endpoint or action, what an attacker could achieve, and reproduction
steps.
