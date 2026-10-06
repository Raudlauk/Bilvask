# SteamBilVask

SteamBilVask is a web-based booking and operations system for a car-wash business.

It provides a public booking flow, customer booking/status pages, an administrator and worker interface, configurable pricing and opening rules, booking rescheduling/cancellation, wash-progress tracking, password recovery, and transactional SMS notifications through LINK Mobility.

## Project status

The application currently runs against **Cloudflare D1** through the `DB` binding.

A **Supabase PostgreSQL** schema has also been provisioned as the intended database migration target, but the application code has **not yet been cut over to Supabase**. Until that migration is completed, D1 remains the application's source of truth.

Do not assume D1 and Supabase are synchronized.

## Documentation

Start here, then load deeper documentation only when needed:

- [`AGENTS.md`](./AGENTS.md) — agent instructions: commands, code map, invariants, conventions (loaded by Claude Code via `CLAUDE.md`).
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system boundaries, data flow, ownership, invariants, security boundaries, and database migration direction.
- [`docs/LINK-SMS-SETUP.md`](./docs/LINK-SMS-SETUP.md) — LINK Mobility configuration and reminder behavior.
- [`db/schema.ts`](./db/schema.ts) — current D1/SQLite schema definition.
- [`drizzle/`](./drizzle/) — generated D1 migration history.

## Main features

- Public car-wash booking
- `/` uses the Supreme design and three booking slides; Back/Next retains selections and customer details. `/font-preview` shares the same booking design with a preview banner and is available in development only (production returns 404).
- Availability calculation in the `Europe/Oslo` timezone
- Configurable service duration and pricing
- Large-car and polishing options
- Closed-date and weekday configuration
- Customer confirmation page
- Customer wash-status lookup
- Optional customer self-service: move or cancel a booking from Vaskestatus with phone number and booking code (until 2 hours before; staff see changes in the work list)
- Administrator dashboard
- Read-only / limited worker accounts
- Appointment date/time changes
- Wash-duration changes
- Booking cancellation
- Wash-progress state management
- LINK Mobility SMS confirmation and reminders
- SMS notification after rescheduling or cancellation
- Password recovery email through Resend
- Server-side sessions and rate limiting

## Technology

- React 19
- TypeScript
- Vinext
- Vite
- Cloudflare Workers runtime
- Cloudflare D1
- Drizzle ORM / Drizzle Kit
- Tailwind CSS
- shadcn / Base UI components
- LINK Mobility SMS API
- Resend email API

The repository currently requires **Node.js 22.13 or newer**.

## Repository map

```text
app/
  api/                    Server-side HTTP routes
  admin/                  Admin / worker interface
  bekreftelse/            Booking confirmation
  status/                 Customer wash-status page
  reset-password/         Password reset page

components/                Shared React components

db/
  schema.ts                Current D1 schema
  index.ts                 Database-related exports

drizzle/                   Generated D1 migrations

lib/
  server.ts                D1, sessions, auth, throttling, request helpers
  schedule.ts              Booking and availability rules
  booking-settings.ts      Configurable booking settings
  booking-sql.ts           Atomic booking insertion logic
  link-sms.ts              LINK Mobility integration
  reset-mail.ts            Password-reset email integration

tests/                     Node regression tests
```

See `docs/ARCHITECTURE.md` before making changes that cross these boundaries.

## Prerequisites

Install:

- Node.js `>=22.13.0`
- pnpm

The project uses `pnpm-lock.yaml`; use pnpm unless there is a deliberate dependency-management change.

## Local setup

Install dependencies:

```bash
pnpm install
```

Copy the environment template:

```bash
cp .env.example .env.local
```

Configure any integrations you need, then start development:

```bash
pnpm dev
```

The development server is provided by Vinext and the Cloudflare Vite integration.

### D1 database

The active application expects a Cloudflare D1 binding named:

```text
DB
```

The OpenAI hosting configuration declares that binding in:

```text
.openai/hosting.json
```

The schema source is `db/schema.ts`, with generated migrations in `drizzle/`.

`pnpm db:generate` generates migration files from the Drizzle schema. It does **not** by itself replace the need to initialize/apply the database schema in the target Cloudflare environment.

If a fresh local or deployed D1 database is empty, initialize it using the project's Cloudflare/OpenAI hosting database migration workflow before exercising booking or admin APIs.

## Environment variables

Never commit `.env.local` or production credentials.

### Public-origin / CSRF configuration

```env
BOOKING_PUBLIC_ORIGIN=
```

Optional exact HTTPS origin used when a local tunnel or proxy rewrites the request URL. Do not include a trailing slash.

### Password recovery email

```env
BOOKING_RESEND_API_KEY=
BOOKING_EMAIL_FROM=
```

Both are required for password-recovery email delivery.

`BOOKING_EMAIL_FROM` must be a sender accepted by the configured Resend account.

### LINK Mobility SMS

```env
LINK_SMS_ENABLED=true
LINK_SMS_CLIENT_ID=
LINK_SMS_CLIENT_SECRET=
LINK_SMS_TOKEN_URL=https://sso.linkmobility.com/auth/realms/CPaaS/protocol/openid-connect/token
LINK_SMS_SENDER=Steam
LINK_SMS_BEARER_TOKEN=
```

`LINK_SMS_CLIENT_ID` and `LINK_SMS_CLIENT_SECRET` are the normal production authentication method.

`LINK_SMS_BEARER_TOKEN` is supported as an alternative, primarily for testing or temporary credentials.

Confirm the token URL and permitted sender name with the specific LINK Mobility account before production use.

See [`docs/LINK-SMS-SETUP.md`](./docs/LINK-SMS-SETUP.md) for details.

## SMS behavior

Transactional SMS currently covers:

- New booking confirmation
- 24-hour booking reminder when enough time remains
- Appointment date/time change
- Booking cancellation

A booking's reminder uses a deterministic LINK schedule tag so the server can cancel the old reminder when the booking is moved or cancelled.

SMS delivery is intentionally **non-transactional with booking persistence**: if LINK Mobility is unavailable, a valid booking/reschedule/cancellation should remain committed. Notification failure is reported separately.

## Authentication

The project currently uses application-managed authentication rather than Supabase Auth.

Roles:

- `admin` — full administrative access
- `manager` — reads the work list and changes booking dates, times, durations and wash status; cancels/removes bookings using the existing cancellation flow
- `viewer` — strictly read-only work list and wash status

Only the administrator manages users, settings, prices and login credentials. New and existing user accounts default to `viewer`; administrators select or edit the access level under user management. Changing access level or activation invalidates existing sessions and requires signing in again. Apply the generated database migration before deploying the updated application.

Sessions are persisted server-side and represented in the browser by an HTTP-only `gleam_session` cookie.

### Fresh-database administrator

The current server code bootstraps an administrator when no admin row exists:

```text
username: admin
password: admin
```

**Change this immediately before exposing a fresh installation to real users.**

Do not treat the bootstrap credential as a production default.

## Booking rules

Scheduling rules are centralized primarily in `lib/schedule.ts` and protected again at the persistence layer where concurrency matters.

Important current rules include:

- Business timezone: `Europe/Oslo`
- 15-minute scheduling increments
- Configurable enabled weekdays
- Configurable booking horizon
- Closed-date support
- Service-based duration calculation
- No overlapping bookings
- Daily / half-day capacity constraints
- Midday-break restrictions

The backend is authoritative for availability, duration and price. Frontend-calculated values are previews only and must be recalculated server-side before a booking is committed.

## Admin booking operations

The admin workflow supports separate operations for:

- Changing appointment date/time
- Changing wash duration
- Updating wash progress
- Cancelling a booking

Rescheduling should preserve the booking while replacing the old SMS reminder and sending an immediate change notification.

Cancellation should remove the scheduled reminder and send a cancellation notification.

See `docs/ARCHITECTURE.md` for the relevant invariants and flow.

## Supabase migration target

A Supabase PostgreSQL project has been prepared with equivalents for the application's main persistence objects, including:

```text
bookings
booking_settings
prices
contact
polish_settings
closed_dates
admins
viewers
sessions
password_resets
attempts
sms_messages
```

The Supabase schema is intentionally locked down for server-side use; customer/admin data should not be exposed directly through an anonymous browser database client.

The application still uses D1 today. Migration work must preserve:

- Atomic booking conflict protection
- Capacity rules
- Rescheduling conflict detection
- Session semantics
- Authorization boundaries
- Throttling
- SMS behavior
- Existing user-visible workflows

Do not implement new code that silently writes to both databases as independent sources of truth.

## Development commands

Start development:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Run the built Cloudflare worker locally:

```bash
pnpm start
```

Lint:

```bash
pnpm lint
```

Format:

```bash
pnpm format
```

Generate a Drizzle migration after an intentional D1 schema change:

```bash
pnpm db:generate
```

Run the current regression tests:

```bash
node --test tests/*.test.mjs
```

There is currently no `test` script in `package.json`, so use the explicit Node test command unless the project scripts are updated.

## Verification before merging

At minimum, run the checks relevant to the change. For broad application changes, prefer:

```bash
pnpm lint
node --test tests/*.test.mjs
pnpm build
```

Do not claim a check passed unless it was actually run.

For booking changes, additionally verify the affected flows manually or with focused tests, especially:

- Availability boundaries
- Overlap prevention
- Price and duration recalculation
- Rescheduling
- Cancellation
- Admin/viewer permissions
- SMS reminder replacement

## Security notes

Keep these server-only:

- D1 administrative access
- Supabase service-role / secret credentials
- LINK Mobility credentials
- Resend API key
- Password hashes and salts
- Session tokens
- Password-reset tokens

Do not expose secrets through `NEXT_PUBLIC_*`, browser bundles, API responses, logs, or committed files.

Booking data contains customer names and phone numbers and should be treated as personal data.

## Deployment

The project is configured for a Cloudflare-compatible Vinext deployment and uses `.openai/hosting.json` to declare the D1 binding.

For your own Cloudflare Workers account, create a D1 database and set
`CLOUDFLARE_D1_DATABASE_ID` and `CLOUDFLARE_D1_DATABASE_NAME` in the Worker's
**build environment variables** to override the configured production database.
These identifiers are not secrets. Production builds default to the project's
Cloudflare database; development uses the local preview placeholder.
Use `npm run build` as the build command and
`npx wrangler deploy --config dist/server/wrangler.json` as the deploy command.
Initialize a fresh database with the SQL migrations in `drizzle/` before using
booking or admin features; deployment alone does not create the application tables.

Before production deployment, verify:

1. The target D1 database has the expected schema/migrations.
2. The default administrator password has been changed.
3. Production environment variables are configured server-side.
4. The Resend sender is verified if password recovery is enabled.
5. LINK credentials, token URL, and sender ID are valid if SMS is enabled.
6. Contact/address settings are correct because they are used in customer SMS.
7. Lint, tests, and production build pass.
8. Booking creation, rescheduling, cancellation, and admin authorization are tested in the deployed environment.

## Contributing / agent work

Read [`AGENTS.md`](./AGENTS.md) before starting implementation work.

For non-trivial changes, also read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and the implementation of the affected subsystem before editing.

Prefer the smallest correct change, preserve existing behavior outside the requested scope, and update this README only when setup, deployment, external integrations, or developer workflow changes.
