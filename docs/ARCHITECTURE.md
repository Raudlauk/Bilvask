# SteamBilVask Architecture

## Purpose

This document describes the system architecture, ownership boundaries, major data flows, and important invariants of SteamBilVask.

Use it when a task affects:

- booking behavior
- database access or schema
- authentication or authorization
- admin workflows
- availability calculations
- SMS or email delivery
- deployment or runtime configuration
- cross-module changes

For coding workflow and agent responsibilities, see `AGENTS.md`.

---

## 1. System Overview

SteamBilVask is a car-wash booking application with:

- a public booking flow
- booking confirmation
- booking status lookup
- an administrator interface
- read-only worker/viewer accounts
- configurable prices and booking rules
- closed-date management
- wash-progress tracking
- LINK Mobility SMS notifications
- email-based administrator password recovery

The application is server-rendered / server-backed and deployed on Cloudflare-compatible infrastructure.

Current architecture:

```text
Browser
  |
  v
React / Vinext application
  |
  v
app/api/* route handlers
  |
  +---- business logic in lib/*
  |
  +---- Cloudflare D1
  |
  +---- LINK Mobility API
  |
  +---- Resend API
```

A Supabase PostgreSQL backend has been provisioned as the intended database migration target, but the application code currently still reads and writes Cloudflare D1.

Do not treat Supabase as the active runtime database until the application database layer has been migrated.

---

## 2. Runtime Stack

Primary technologies:

- React 19
- Vinext
- TypeScript
- Vite
- Cloudflare Workers runtime
- Cloudflare D1
- Drizzle schema/migrations
- Tailwind CSS
- shadcn / Base UI components
- LINK Mobility SMS API
- Resend email API

Relevant configuration:

```text
package.json
vite.config.ts
next.config.ts
.openai/hosting.json
.env.example
```

The Cloudflare runtime is accessed through:

```ts
import { env } from 'cloudflare:workers';
```

The active D1 binding is named:

```text
DB
```

---

## 3. Repository Structure

### `app/`

Application pages and HTTP API routes.

Important pages:

```text
app/page.tsx                  Public booking flow
app/admin/page.tsx            Administrator / worker interface
app/bekreftelse/page.tsx      Booking confirmation
app/status/page.tsx            Customer wash-status lookup
app/reset-password/page.tsx   Password reset
```

### `app/api/`

Server-side HTTP boundary.

Important routes include:

```text
bookings/
availability/
admin/
users/
wash-status/
confirmation/
booking-settings/
closed-dates/
prices/
polish-settings/
contact/
password-reset/
recovery-email/
calendar/
```

API routes should remain thin where practical.

Shared business rules belong in `lib/`.

---

## 4. Core Library Ownership

### `lib/server.ts`

Owns shared server infrastructure:

- D1 access
- JSON responses
- request body limits
- same-origin validation
- password hashing
- session handling
- authentication
- authorization
- throttling

Changes to authentication or security behavior should normally start here.

### `lib/schedule.ts`

Owns appointment scheduling rules:

- `Europe/Oslo` timezone
- date validation
- booking horizon
- opening days
- available slots
- wash duration calculation
- human-readable date/time formatting

This is the canonical location for reusable scheduling logic.

Avoid recreating availability calculations in UI code.

### `lib/booking-settings.ts`

Loads configurable booking behavior from persistence.

Examples:

- weeks available ahead
- enabled weekdays
- service durations
- large-car pricing percentage
- polish availability
- status feature state
- maps URL

### `lib/booking-sql.ts`

Contains the atomic D1 booking insertion query.

The query protects against:

- overlapping bookings
- daily capacity violations
- half-day capacity violations
- bookings on closed dates

Any database migration must preserve these guarantees.

### `lib/link-sms.ts`

Owns LINK Mobility integration.

Responsibilities:

- authentication with LINK
- phone normalization
- immediate messages
- scheduled reminders
- reminder cancellation
- SMS message formatting

LINK credentials must remain server-side.

### `lib/reset-mail.ts`

Owns password-reset email delivery through Resend.

---

## 5. Booking Domain

A booking contains the customer's appointment and selected services.

Important persisted fields include:

```text
id
name
phone
date
start
duration
inside
outside
fluid
large_car
polish
price
status
status_code
created
```

`start` is stored as minutes after midnight.

Example:

```text
08:00 -> 480
12:30 -> 750
```

Durations are measured in minutes.

---

## 6. Scheduling Invariants

The scheduling layer currently enforces approximately:

- 15-minute slot increments
- operating window from 08:00 to 15:00
- no appointment crossing the midday break
- break from 11:30 to 12:00
- maximum four bookings per date
- maximum two bookings in each half of the day
- no overlapping appointments
- no bookings on configured closed dates
- no bookings on disabled weekdays
- no booking beyond the configured booking horizon
- past times on the current date are unavailable

These are business invariants.

Do not change one representation of these rules without checking all affected paths.

Relevant code:

```text
lib/schedule.ts
lib/booking-sql.ts
app/api/bookings/route.ts
app/api/availability/route.ts
app/api/admin/route.ts
```

Database-level protection should remain the final defense against concurrent bookings.

---

## 7. Booking Creation Flow

```text
Customer selects services
        |
        v
Frontend calculates expected duration / price
        |
        v
POST /api/bookings
        |
        +-- validate request
        +-- reload current settings
        +-- recompute duration
        +-- recompute price
        +-- throttle
        +-- atomically insert booking
        |
        v
Booking committed
        |
        +-- send confirmation SMS
        +-- schedule 24-hour reminder
        |
        v
Return booking confirmation
```

The backend is authoritative for:

- price
- duration
- availability
- booking validity

Never trust frontend-calculated values without recalculating them server-side.

SMS failure must not invalidate an already committed booking.

---

## 8. Admin Booking Changes

The admin interface supports separate operations.

### Change appointment date/time

Rescheduling must:

1. load the existing booking
2. verify the expected old date/time
3. validate the requested date/time
4. ensure the new slot remains available
5. update the booking atomically
6. cancel the previous scheduled reminder
7. schedule a replacement reminder
8. send an immediate change notification

A notification failure does not roll back a successful booking move.

### Change wash duration

Duration changes are separate from rescheduling.

They must ensure the new duration does not:

- overlap another booking
- cross the midday break
- exceed closing time

### Cancel booking

Cancellation flow:

```text
Load booking
    |
    +-- cancel scheduled reminder
    |
    +-- delete booking
    |
    +-- send cancellation SMS
```

Database state is authoritative.

External notification failure should be reported separately.

Staff and customer moves and cancellations share `moveBooking` and `cancelBooking` in `lib/booking-changes.ts`, so both paths keep the same atomic conflict checks and SMS reminder handling.

### Site name

The public name (default "Steam") is stored in `booking_settings.site_name` and edited under Admin > Bestillingsinnstillinger. The root layout reads it once per request with `getSiteName()` (`lib/site-name.ts`) for page titles and passes it to `SiteNameProvider`, so client components use `useSiteName()` instead of fetching. SMS texts, the password-reset email and the calendar invite read it server-side. `getSiteName()` falls back to the default if the column is missing, so code can deploy before migration 0018. Saving a name still needs the migration. The SMS sender ID is separate: it is registered with LINK Mobility (`LINK_SMS_SENDER`).

### Customer self-service changes

When enabled in admin (Vaskestatus settings, off by default, and only while status is enabled), customers can move or cancel their own booking from `/status` through `POST /api/customer-booking`.

Rules, enforced server-side:

- the booking is identified by **phone number and booking code**; a name is not enough
- no changes less than **2 hours** before the appointment (`CUSTOMER_CUTOFF_MINUTES`), and only while status is `0` (booked, not started)
- a new time must also be at least 2 hours ahead
- at most **3** customer moves per booking (`CUSTOMER_MAX_MOVES`); cancelling stays possible
- the move counter and status are checked inside the same atomic `UPDATE`/`DELETE` as the slot conflict checks

Staff visibility: moved bookings carry `customer_moves`/`customer_changed_at`, and every customer move or cancellation is written to `booking_changes`. The admin work list shows the last 7 days of changes. Rows older than 30 days are pruned when new changes are logged.

---

## 9. SMS Architecture

SMS provider:

```text
LINK Mobility
```

Current message types:

```text
confirmation
24-hour reminder
appointment changed
appointment cancelled
```

Scheduled reminders use a deterministic tag derived from the booking ID:

```text
steam-booking-reminder-{bookingId}
```

This allows the existing reminder to be cancelled when a booking is moved or removed.

Cost guard: at most `SMS_DAILY_CAP` (100) SMS per Oslo day are sent, scheduled reminders included. The count lives in the `attempts` table. Beyond the cap, `send()` throws before calling LINK, callers report it as an SMS warning, and the admin work list shows a notice. Bookings are not affected.

Phone numbers are stored locally as eight Norwegian digits and converted to international format before delivery.

Example:

```text
91234567 -> +4791234567
```

Credentials belong only in server-side environment variables.

---

## 10. Authentication and Authorization

Authentication is application-managed rather than Supabase Auth.

Three roles exist:

```text
admin
manager
viewer
```

The single administrator lives in the `admins` table. Manager and viewer accounts live in the `viewers` table, distinguished by its `role` column (default `viewer`). Role resolution is in `currentUser()` in `lib/server.ts`.

### Admin

May:

- manage bookings
- change configuration, prices and contact settings
- manage users and their access level
- change appointment date/time
- change wash duration
- update wash progress
- cancel bookings

A freshly bootstrapped admin (`version === 1`) must change the default password before performing booking actions.

### Manager

May read the work list and perform the booking actions `progress`, `reschedule`, `duration` and `cancel-booking` (see `app/api/admin/route.ts`).

May not manage users, settings, prices or credentials.

### Viewer

Strictly read-only: may read the work list and wash status but cannot perform any mutating action.

Changing a user's access level or activation increments their `version`, which invalidates existing sessions.

Sessions are stored server-side.

The browser receives an HTTP-only session cookie:

```text
gleam_session
```

Session tokens are hashed before persistence.

Mutating routes use same-origin checks to reduce CSRF exposure.

Rate limiting is persisted in the `attempts` table. Staff login allows 5 failed attempts per username and 10 per IP address within 15 minutes; a successful login clears both counters. There is deliberately no site-wide login limit, because it would let anyone lock every staff member out.

---

## 11. Security Boundaries

Treat the following as privileged server-only data:

- password hashes
- password salts
- sessions
- reset tokens
- LINK credentials
- Resend credentials
- database administrative credentials
- Supabase service-role credentials

Never expose them through:

- frontend JavaScript
- `NEXT_PUBLIC_*`
- API responses
- logs
- committed environment files

Customer booking data contains personal information, particularly:

- names
- phone numbers

Direct anonymous database access to booking records is not part of the architecture.

---

## 12. Persistence

### Current production application

The current code uses:

```text
Cloudflare D1
```

Database access occurs primarily through raw prepared SQL using:

```ts
db().prepare(...)
```

Drizzle is present for schema and migration management, but most application queries do not use the Drizzle query API.

Relevant files:

```text
db/schema.ts
db/index.ts
drizzle/
drizzle.config.ts
lib/server.ts
```

### Supabase migration target

A Supabase PostgreSQL project named `SteamBilVask` has been provisioned.

The target schema includes equivalents for:

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

The Supabase schema also provides PostgreSQL-level booking overlap protection.

Until the application database adapter is migrated, D1 remains the source of truth.

Do not write new features assuming both databases are automatically synchronized.

---

## 13. Database Migration Rule

The long-term application should expose a database abstraction or repository boundary instead of scattering provider-specific behavior across route handlers.

Migration should proceed approximately:

```text
Existing route behavior
        |
        v
Stable database/service interfaces
        |
        v
Supabase implementation
        |
        v
Verification against existing behavior
        |
        v
Remove D1 dependency
```

Preserve:

- concurrency protection
- booking capacity rules
- optimistic admin conflict detection
- authentication semantics
- session invalidation
- throttling
- existing user-visible behavior

Do not perform a mechanical SQLite-to-Postgres syntax conversion without reviewing transactional behavior.

---

## 14. External Integrations

### LINK Mobility

Used for customer SMS.

Failure mode:

```text
booking operation succeeds
SMS operation may fail independently
```

### Resend

Used for password-reset email.

Configured through server-side environment variables.

### Maps

The configured maps URL is stored as booking settings and used by customer-facing location functionality.

---

## 15. Error Handling Strategy

User-facing endpoints should:

- validate input at the HTTP boundary
- return specific 4xx errors for invalid requests or conflicts
- return 409 for stale/conflicting booking state where appropriate
- return 429 for throttling
- return generic 5xx responses for unexpected infrastructure failures

Do not leak:

- SQL errors
- provider credentials
- authentication internals
- raw external provider responses containing sensitive information

External notification failures should be logged and surfaced as warnings when the primary state change succeeded.

---

## 16. Important Concurrency Boundaries

Concurrency matters most for:

- creating bookings
- rescheduling bookings
- changing booking duration
- changing wash-progress status
- user/session invalidation

Do not rely on:

```text
SELECT availability
then
INSERT booking
```

as two independent operations.

Another request can occupy the slot between those operations.

The final write must enforce the relevant invariant atomically or transactionally.

---

## 17. Frontend Responsibilities

Frontend code may:

- collect user input
- display availability
- preview price and duration
- present admin controls
- show validation feedback

Frontend code must not be authoritative for:

- final price
- final duration
- slot ownership
- administrator authorization
- notification delivery
- persisted booking state

The backend always revalidates state-changing requests.

---

## 18. Testing

Current repository tests include coverage for areas such as:

```text
large-car behavior
permissions / authorization
```

Relevant commands:

```bash
pnpm lint
pnpm build
node --test tests/*.test.mjs
```

For changes to booking behavior, prioritize tests around:

- overlap handling
- capacity
- break boundaries
- date/time rescheduling
- cancellation
- stale admin updates
- price recalculation
- authorization

External SMS/email APIs should normally be tested through controlled mocks or isolated integration tests rather than real production delivery.

---

## 19. Change Map

When changing:

### Booking availability

Inspect:

```text
lib/schedule.ts
lib/booking-sql.ts
app/api/availability/route.ts
app/api/bookings/route.ts
app/api/admin/route.ts
```

### Prices or service duration

Inspect:

```text
lib/prices.ts
lib/schedule.ts
lib/booking-settings.ts
app/api/prices/
app/api/booking-settings/
app/api/polish-settings/
```

### Authentication / permissions

Inspect:

```text
lib/server.ts
app/api/admin/
app/api/users/
app/api/password-reset/
app/api/recovery-email/
```

### SMS

Inspect:

```text
lib/link-sms.ts
app/api/bookings/route.ts
app/api/admin/route.ts
docs/LINK-SMS-SETUP.md
```

### Database

Inspect:

```text
db/
drizzle/
lib/server.ts
lib/booking-sql.ts
relevant API routes
```

---

## 20. Architectural Principles

Preserve these unless a deliberate architecture change is being made:

1. Server is authoritative for booking state.
2. Scheduling rules have one canonical implementation.
3. Booking conflicts must be protected at the persistence boundary.
4. Customer PII is not directly exposed through database APIs.
5. Secrets remain server-side.
6. External notification failures do not corrupt booking state.
7. Admin mutations use optimistic conflict checks where stale data matters.
8. Permissions stay strictly ordered: viewer ⊂ manager ⊂ admin.
9. Oslo local time is the business timezone.
10. D1 and Supabase must not silently become competing sources of truth.

---

## 21. Known Architecture Transition

The largest current architectural transition is:

```text
Cloudflare D1
      ->
Supabase PostgreSQL
```

The Supabase schema exists, but application queries have not yet been migrated.

Until that work is complete:

```text
D1 = active application database
Supabase = migration target
```

Update this section when the application database cutover occurs.

---

## 22. Documentation Maintenance

Update this file when changes affect:

- runtime platform
- major module ownership
- persistence provider
- authentication model
- external integrations
- significant booking invariants
- system boundaries

Do not use this file for:

- temporary implementation plans
- individual bug histories
- detailed API payload documentation
- coding style rules
- model workflow instructions

Those belong in execution plans, tests, API docs, or `AGENTS.md`.