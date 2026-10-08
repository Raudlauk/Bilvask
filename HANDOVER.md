# Handover: Steam bilvask booking site

Read this first if you are taking over the project, whether you are a developer or an AI coding assistant. It explains what the site is, where everything runs, how to change it safely and what is still unfinished.

Status as of **8 October 2026**.

---

## 1. What this is

A booking and operations website for a car wash run by **Ytre Namdal Vekst AS** (ynvekst.no). The public name is configurable and defaults to "Steam".

- **Customers** book an exterior and/or interior wash with optional extras, get SMS confirmation and reminders, follow wash progress in Vaskestatus, and can move or cancel their own booking (an optional setting).
- **Staff** log in at `/admin` to see the work list, update wash progress, and reschedule or cancel bookings.
- **The admin** also manages prices, booking days, closed dates, users, contact details and the site name.

The live site is at **https://bilvask.handclap-69.workers.dev**.

---

## 2. Where everything lives

| Thing | Where | Notes |
|---|---|---|
| Source code | GitHub `Raudlauk/Bilvask`, branch `main` | **Pushing to `main` deploys to production automatically.** |
| Hosting | Cloudflare Workers, Worker name **`bilvask`** | Connected to GitHub (Workers Builds). Deploys appear under Workers & Pages → bilvask → Deployments, and you can roll back there. |
| Database | Cloudflare D1, database **`bilvask`** (id `b5384c4d-fd9a-417f-816b-a3a9a8ea4256`) | SQLite. Binding name in code: `DB`. The id is not a secret. |
| SMS | LINK Mobility | Confirmation, 24-hour reminder, change and cancellation texts. Capped at 100 per day in code. **Not set up yet:** Ytre Namdal Vekst must create the account and add the credentials (section 9). Until then no SMS are sent. |
| Email | Resend (planned) | Only used for admin password reset. **Not set up yet:** Ytre Namdal Vekst must set it up (section 9). |
| Supabase | A PostgreSQL project exists as a possible future database | **Not in use.** D1 is the only source of truth. |

Make sure the new owners are given access to the GitHub repository, the Cloudflare account and the LINK Mobility account. Without those, nobody can deploy, migrate or fix SMS.

---

## 3. Documents in the repository

| File | Purpose |
|---|---|
| `HANDOVER.md` | This file: the overview and the operational how-to. |
| `AGENTS.md` | Instructions for AI coding assistants: commands, code map, rules that are easy to break, lint policy. Works with any assistant. |
| `CLAUDE.md` | One line that makes Claude Code load `AGENTS.md`. Other tools such as Cursor, Copilot or Codex read `AGENTS.md` directly or can be pointed at it. |
| `README.md` | Setup, environment variables, deployment checklist. |
| `docs/ARCHITECTURE.md` | System design, booking rules, security, data flows, a "what to inspect when changing X" map. |
| `DESIGN.md` | Approved visual decisions (colours, fonts, layout rules). |
| `docs/skill.md` | Design guide for UI work (large; `AGENTS.md` says which sections to read). |
| `docs/LINK-SMS-SETUP.md` | LINK Mobility configuration. |

**Using an AI assistant:** point it at `AGENTS.md` and this file before asking for changes. Ask it to read `docs/ARCHITECTURE.md` before touching bookings, login or the database.

---

## 4. Technology in one paragraph

React 19 and TypeScript, built with **Vinext** (a Next.js-compatible framework on Vite) and running on **Cloudflare Workers**. Pages live in `app/`, server API routes in `app/api/*/route.ts`, and shared business logic in `lib/`. Data is in **Cloudflare D1** (SQLite). The schema is defined in `db/schema.ts` with **Drizzle**, which generates the SQL migrations in `drizzle/`. Queries are plain SQL through `db().prepare(...)`. Styling uses CSS modules plus Tailwind 4. Package manager: **pnpm**. Node 22.13 or newer.

---

## 5. Run it locally

```bash
pnpm install
pnpm dev            # http://localhost:3000, staff login at /admin
```

- Copy `.env.example` to `.env.local` for local settings. **Never commit `.env*` files.** Without LINK credentials, SMS is simply skipped, so local testing never sends real texts.
- The local database is a D1 simulation stored in `.wrangler/state/`. A brand-new database creates the login **`admin` / `admin`**, which must be changed at first login.
- Only one dev server can run per project.

**Windows notes** (from the original machine):
- PowerShell may block `pnpm`/`npx` scripts. Use `npx.cmd` / `pnpm.cmd`, or call tools directly, for example `node node_modules\wrangler\bin\wrangler.js …`.
- Commit messages with quotes: write the message to a file and use `git commit -F file`. PowerShell 5.1 breaks quoted arguments.

---

## 6. Checks before every push

```bash
pnpm lint                       # must pass (type-aware, also type checks)
node --test tests/*.test.mjs    # all tests must pass
pnpm build                      # production build must succeed
```

The tests in `tests/` run against an in-memory SQLite database built from `drizzle/*.sql`. Copy an existing test file as a template for new ones.

---

## 7. Deploying

1. Make sure section 6 passes.
2. **If the change adds a database migration, apply it to production first** (section 8). Code that reads a new column will break the live site if the column is missing.
3. Push to `main`. Cloudflare builds and deploys automatically within a few minutes.
4. Check the live site, and roll back from the Cloudflare dashboard if needed.

Manual deploy, if the GitHub connection is ever broken:

```bash
pnpm build
npx wrangler deploy --config dist/server/wrangler.json --name bilvask
```

`--name bilvask` matters: without it, Wrangler deploys to a new Worker called `sites-project`.

**Cloudflare build settings** (only if you set up a new Worker or account): build command `npm run build`, deploy command `npx wrangler deploy --config dist/server/wrangler.json`, and the build variables `CLOUDFLARE_D1_DATABASE_ID` / `CLOUDFLARE_D1_DATABASE_NAME` if you use a different D1 database.

---

## 8. Database changes (migrations)

Migrations are **applied by hand**. Wrangler's migration tracking is not used, so **do not run `wrangler d1 migrations apply`**: it could try to re-run every migration from `0000`.

To change the schema:

1. Edit `db/schema.ts`. Keep changes **additive** (new tables or columns with defaults) so existing data and the currently deployed code keep working.
2. Generate the SQL: `pnpm db:generate`. This creates `drizzle/00NN_name.sql`.
3. Run the tests, which apply all migrations to a fresh database.
4. Apply the migration to production (needs a Cloudflare login, `wrangler login`):

   ```bash
   npx wrangler d1 execute bilvask --remote --config .wrangler/production-database.json --file drizzle/00NN_name.sql
   ```

5. Then push the code.

**Production state:** all migrations up to and including **`0018_site_name.sql`** have been applied (0016-0018 were applied by hand in October 2026). The next migration is `0019`.

Useful commands:

```bash
# Look at production data (read-only query)
npx wrangler d1 execute bilvask --remote --config .wrangler/production-database.json --command "SELECT COUNT(*) FROM bookings"

# Full backup / export of the database to a SQL file
npx wrangler d1 export bilvask --remote --output backup.sql --config .wrangler/production-database.json
```

**Restoring:** D1 has Time Travel (point-in-time restore: 30 days on the Workers Paid plan, 7 on Free) in the dashboard or with `wrangler d1 time-travel restore`.

`.wrangler/production-database.json` is a small local file naming the production database. If it's missing, create it with the binding `DB`, the name `bilvask` and the id from section 2.

---

## 9. Secrets and settings

Set on the Worker as **secrets** (`npx wrangler secret put NAME --name bilvask`), never in code and never as plain dashboard variables. The deploy config contains `"vars": {}`, which wipes plain dashboard variables on every deploy.

| Name | Purpose | Status |
|---|---|---|
| `LINK_SMS_CLIENT_ID`, `LINK_SMS_CLIENT_SECRET` | LINK Mobility login (or `LINK_SMS_BEARER_TOKEN`) | **Not set.** Ytre Namdal Vekst to provide. Without them the site works but sends no SMS. |
| `LINK_SMS_SENDER` | SMS sender name, registered with LINK (default "Steam") | Optional |
| `LINK_SMS_ENABLED` | `false` turns SMS off | Optional |
| `BOOKING_PUBLIC_ORIGIN` | Exact public https address, used in reset links | **Not set.** Ytre Namdal Vekst to set up. |
| `BOOKING_RESEND_API_KEY`, `BOOKING_EMAIL_FROM` | Password-reset email through Resend | **Not set.** Ytre Namdal Vekst to set up. |

Everything else (prices, booking days and horizon, wash durations, polishing, closed dates, Vaskestatus, customer self-service, contact details, Maps link, site name, users) is changed in **`/admin` → Bestillingsinnstillinger / Innloggingsinnstillinger** and stored in the database.

---

## 10. Rules the code relies on

Full details are in `docs/ARCHITECTURE.md`. The most important:

- **The server decides** price, duration and availability. The browser only shows previews.
- **Bookings are checked and inserted in one atomic SQL statement** (`lib/booking-sql.ts`, `lib/booking-changes.ts`). Never split this into "check, then insert".
- **Opening hours:** 08:00-15:00 Oslo time, 15-minute steps, a break from 11:30 to 12:00, at most 4 bookings per day and 2 per half-day. These are fixed in `lib/schedule.ts`, not admin settings.
- **Roles:** `admin` (everything), `manager` (move, cancel, change duration and progress), `viewer` (read-only).
- **SMS failures never undo a booking change.** At most 100 SMS per day (`SMS_DAILY_CAP` in `lib/link-sms.ts`).
- **Login limits:** 5 failed attempts per username and 10 per IP address within 15 minutes; a successful login resets them.
- **Customer self-service:** phone number plus booking code, no changes within 2 hours of the appointment, at most 3 moves.
- **Personal data:** names and phone numbers are personal data. Never put them in logs, URLs or test fixtures from production.

---

## 11. Unfinished work and open decisions

1. **Approval from Ytre Namdal Vekst.** The project has not formally been approved by them yet.
2. **Privacy notice and data cleanup:** done on the GitHub branch **`privacy-retention`** (one commit on top of `main` as of 8 October 2026), **not merged and not live**. It adds a `/personvern` page and automatically anonymises bookings 90 days after the appointment. It needs Ytre Namdal Vekst to approve the text and the 90-day period, and to check whether bookkeeping requires keeping names longer. When approved:
   - rebase it onto the latest `main` if `main` has moved on
   - replace the hard-coded "Steam bilvask" in its text with the site-name setting
   - merge and push

3. **SMS (LINK Mobility):** Ytre Namdal Vekst must set up the account, register the sender name and add the credentials as Worker secrets (section 9). Until then customers get no confirmation or reminder texts.
4. **Password-reset email** (section 9), also for Ytre Namdal Vekst: needs a sending domain verified in Resend (for example `mail.ynvekst.no`, EU region, which requires Ytre Namdal Vekst's DNS), an API key and the three secrets. Until then, the admin's own password can only be reset by someone with database access, while other users can be reset by the admin.
5. **GDPR paperwork:** data processing agreements with Cloudflare, LINK Mobility and, later, Resend. Ytre Namdal Vekst is the data controller.
6. **Customer self-service** is built and deployed, and is **off by default**. Check whether it is on under Bestillingsinnstillinger → Vaskestatus.
7. **Cloudflare plan:** on the Free plan the site cannot create a bill (it stops at the daily limits). On Workers Paid there is no spending cap, so set up usage alerts under Notifications.
8. **LINK Mobility costs:** prefer prepaid credit or a spending limit on the account. The in-code 100-SMS cap is a second line of defence.
9. **Supabase migration** (moving off D1) was planned at some point. Nothing is migrated. If revived, follow "Database Migration Rule" in `docs/ARCHITECTURE.md` and keep D1 as the only source of truth until the switch.

---

## 12. Moving to another host or database

The app is written for Cloudflare Workers + D1, but most of it is portable:

- **Data:** `wrangler d1 export` (section 8) gives a standard SQLite SQL dump. It loads into SQLite directly and into PostgreSQL with small changes.
- **Code coupled to Cloudflare:** `import { env } from 'cloudflare:workers'` in `lib/server.ts`, `db/index.ts`, `lib/link-sms.ts` and `lib/reset-mail.ts`, plus the `db().prepare(...).bind(...).first()/all()/run()` D1 API. Moving hosts mainly means replacing `db()` with an adapter that offers the same methods. The tests already do exactly that with Node's built-in SQLite (see any file in `tests/`), which is a working template.
- **Keep the atomic booking checks** when changing databases (see `docs/ARCHITECTURE.md`, "Important Concurrency Boundaries").

---

## 13. First day checklist for a new owner

- [ ] Access to GitHub `Raudlauk/Bilvask`, the Cloudflare account (Worker `bilvask`, D1 `bilvask`) and LINK Mobility.
- [ ] `pnpm install`, `pnpm dev`, log in locally, run the section 6 checks.
- [ ] Take a production database export (section 8) and store it safely.
- [ ] Set up LINK Mobility and Resend and add their secrets (section 9). Neither is set yet.
- [ ] Decide on the open items in section 11, starting with the `privacy-retention` branch.
