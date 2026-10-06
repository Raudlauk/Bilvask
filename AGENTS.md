# AGENTS.md

Entry point for coding agents (Claude Code loads this through `CLAUDE.md`).
Keep it short: it's a map plus the rules that are easy to get wrong. Durable detail lives in the docs listed below.

## Project

SteamBilVask is a Norwegian car-wash booking and operations app. It has a public booking flow, a confirmation page, a wash-status lookup, an admin/worker dashboard, LINK Mobility SMS, and Resend password-reset email.

Stack: React 19 + **Vinext** (Next.js-style app router on Vite) running on the **Cloudflare Workers** runtime with **Cloudflare D1** (binding `DB`). Also TypeScript, Tailwind 4, shadcn/Base UI, oxlint/oxfmt, and pnpm. Requires Node ≥ 22.13.

## Environment notes

- The project root is `Steam BIlvask/` (capital `I`, with a space, so quote paths). The parent folder holds `Start-Bilvask.ps1`/`.bat`, a double-click launcher for local use, and a large `Steam BIlvask.zip` backup. Don't modify or unpack either unless asked.
- The dev machine runs Windows with PowerShell 5.1. Use `Copy-Item`, not `cp`, and there's no `&&`. `git` is not on PATH, so don't rely on git for diffs. Inspect the files directly instead.
- The project was scaffolded with OpenAI's site tooling: `.openai/hosting.json`, `@openai/sites-vite-plugin`, and `CODEX_SANDBOX` handling in `vite.config.ts`. These are part of the build. Leave them in place.

## Commands

Run these from `Steam BIlvask/`:

| Task | Command |
| --- | --- |
| Dev server (http://localhost:3000, admin at `/admin`) | `pnpm dev` |
| Lint + type check (oxlint is type-aware with `typeCheck: true`) | `pnpm lint` |
| Tests (there is no `pnpm test` script) | `node --test tests/*.test.mjs` |
| Single test | `node --test tests/permissions.test.mjs` |
| Production build | `pnpm build` |
| Run built worker | `pnpm start` |
| Format | `pnpm format` |
| New migration after editing `db/schema.ts` | `pnpm db:generate` |

Check scope: for most changes, run `pnpm lint` plus the relevant tests. For broad or booking/auth changes, run `pnpm lint`, all tests, and `pnpm build`. Only report a check as passing if you actually ran it.

## Code map

```text
app/page.tsx            Public 3-step booking flow (Supreme design)
app/admin/page.tsx      Admin / manager / viewer dashboard
app/bekreftelse/        Booking confirmation    app/status/  Wash-status lookup
app/reset-password/     Password reset          app/font-preview/  Design preview of booking
app/api/*/route.ts      HTTP boundary — keep thin, logic goes in lib/
lib/server.ts           D1 access (db()), json(), sameOrigin CSRF, sessions, auth, roles, throttling
lib/schedule.ts         Canonical scheduling rules (Europe/Oslo, slots, durations)
lib/booking-sql.ts      Atomic booking insert (overlap/capacity/closed-date guard)
lib/booking-settings.ts Configurable booking settings    lib/prices.ts  Price calculation
lib/link-sms.ts         LINK Mobility SMS + reminder scheduling/cancellation
lib/reset-mail.ts       Resend email               lib/translations.json  UI strings
components/             App components; components/ui/ is generated shadcn — avoid hand-editing
db/schema.ts            Drizzle schema (source of truth for tables)
drizzle/                Generated SQL migrations + meta — never hand-edit meta/
tests/*.test.mjs        Node regression tests
```

The `@/` path alias maps to the project root.

## Conventions that matter

- **Data access:** queries use raw prepared SQL through `db().prepare(...)` from `lib/server.ts`. Drizzle is only used for schema and migrations. Follow the raw-SQL style and don't introduce the Drizzle query API piecemeal.
- **Schema changes:** edit `db/schema.ts`, run `pnpm db:generate`, and keep migrations additive so existing D1 data survives. The tests apply every `drizzle/*.sql` in order, so a broken migration breaks the tests.
- **Server is authoritative.** The frontend only previews price, duration, and availability. The API recalculates all three from current settings before writing.
- **Concurrency:** never check availability and then insert as two separate steps. The final write must enforce the invariant atomically, the way `lib/booking-sql.ts` does.
- **Scheduling invariants:** 15-minute steps, open 08:00–15:00, a break from 11:30–12:00 that no booking may cross, at most 4 bookings per day and 2 per half-day, no overlaps, closed dates and disabled weekdays are honoured, and nothing past the configured horizon. `start` is stored as minutes after midnight. If you change a rule, check `lib/schedule.ts`, `lib/booking-sql.ts`, and the `bookings`, `availability`, and `admin` routes.
- **SMS is not transactional:** a committed booking, reschedule, or cancel stands even if LINK fails, and the failure is reported separately. Reminder tags are `steam-booking-reminder-{bookingId}`. A reschedule cancels the old reminder, schedules a new one, and notifies the customer.
- **Roles:** `admin` has full access. `manager` can see the work list, reschedule, change durations and wash status, and cancel. `viewer` is read-only. Only admin manages users, settings, and prices. Changing a role or activation bumps `version` and invalidates sessions. Every mutating route needs `sameOrigin` plus the right role check.
- **UI:** the copy is in Norwegian, routed through `lib/translations.json` and `components/language.tsx`, and route names are Norwegian. Shared styles live in `app/site-design.css` and `components/booking-design.module.css`, and pages use CSS modules. For any visual work, see **Design guide** below.
- **Lint:** `pnpm lint` passes and should stay that way. `.oxlintrc.json` deliberately turns off `prefer-tag-over-role` (`role="status"` is the intended pattern), `nextjs/no-html-link-for-pages` (plain `<a>` full-page navigation is intended), and `nextjs/no-img-element` (the only images are SVG logos). It also ignores the generated `components/ui/`. `react/react-compiler` is a warning: these are fetch effects that set loading state, so refactor them only when you're touching that code anyway.
- **Formatting:** single quotes, 80-column width (oxfmt). Some files are compactly hand-formatted. Don't reformat files you aren't otherwise changing.

## Design guide

`docs/skill.md` is the design guide for all future UI and visual work, including new screens, redesigns, styling, layout, motion and copy presentation. It's large (~90 KB), so load only the sections the task needs:

| Task | Sections |
| --- | --- |
| Any UI task (start here) | §0 Brief inference, §1 Dials and presets (1.B) |
| Typography, color, layout, states, forms | §4 Design engineering directives (4.7 is hard rules) |
| Motion and scroll effects | §5 (5.D forbidden patterns), §6.B Reduced motion |
| Accessibility and performance | §6 |
| Changing an existing screen | §11 Redesign protocol |
| Final check before finishing | §9 AI tells (forbidden patterns, including the em-dash ban) |

How to apply it in this project:

- **Precedence:** `DESIGN.md` records the approved decisions (palette, Supreme typeface, radii, three-step booking flow, per-screen redesign presets). It overrides `docs/skill.md` where they conflict. Use the skill for everything `DESIGN.md` doesn't decide.
- **Presets:** public screens (booking, confirmation, status) are task interfaces. Admin uses *Redesign - preserve*, so keep its tabs, permissions and density. Don't apply landing-page patterns (hero sections, sticky-stack, horizontal pan) to booking or admin flows.
- **Stack overrides:** the skill's stack defaults (§3) give way to the existing project.
  - Keep CSS modules alongside Tailwind 4.
  - Keep `lucide-react` as the single icon family, since it's already a dependency.
  - Use CSS transitions rather than adding Motion.
  - Don't add UI dependencies without asking (§3.F).
- **Behavior is out of scope:** design changes must not alter booking calculations, availability, form submission, permissions or Norwegian copy. Run `node --test tests/*.test.mjs` afterwards, because some tests exercise UI components.
- Record new durable design decisions in `DESIGN.md`, not here.

## Tests

The tests are plain Node ESM with no test framework. They:

- transpile TS sources with `typescript` and `node:vm`
- stub `cloudflare:workers` with an in-memory `node:sqlite` DB built from `drizzle/*.sql`
- call route handlers (`POST`/`GET`) directly with `Request` objects

New tests should copy this pattern. Base them on an existing file such as `tests/permissions.test.mjs`. Never call the real LINK or Resend APIs from tests.

## Security and data

- Never read, print, or commit `.env.local` or other `.env*` files except `.env.example`. Secrets stay server-side, so never put them in `NEXT_PUBLIC_*`, client code, responses, or logs.
- Customer names and phone numbers are personal data. Don't paste real records into output.
- A fresh DB bootstraps `admin`/`admin`. That's for local use only. Don't treat it as a default or bake it into anything.
- Don't weaken auth, CSRF, or throttling to make something work.

## Don't touch

`node_modules/`, `dist/`, `.vinext/`, `.next/`, `.wrangler/` (local D1 state and logs), `work/` (local server logs), `tsconfig.tsbuildinfo`, `drizzle/meta/`, `pnpm-lock.yaml` (change it only through pnpm), and `components/ui/` (regenerate it through shadcn instead).

## Database transition

D1 is the **only active database**. A Supabase Postgres schema exists as a future migration target, but nothing reads from or writes to it. Never dual-write, and never assume the two are in sync. Migration work belongs behind a repository/service boundary. See the architecture doc §12–13.

## Deeper docs (load only when relevant)

- `docs/ARCHITECTURE.md`: boundaries, flows, invariants, roles, and a change map. Read it before cross-module, booking, auth, or DB work.
- `README.md`: setup, environment variables, deployment checklist.
- `docs/LINK-SMS-SETUP.md`: LINK Mobility configuration.
- `DESIGN.md`: approved visual decisions and redesign scope. This takes precedence over `docs/skill.md`.
- `docs/skill.md`: the design guide for UI work. See **Design guide** above for which sections to load.

## Working style

- Read the affected code path, its callers, and its tests before editing. Make the smallest correct change and don't refactor unrelated code.
- For multi-file or risky work (booking rules, auth, migrations), plan first. Plan mode works well here.
- Delegate broad read-only searches to the Explore subagent. Do small or focused work directly.
- Fix root causes. Don't add sleeps, retries, or flags that hide symptoms.
- Update `README.md` or the architecture doc when setup, integrations, roles, invariants, or deployment change. Keep this file short.
- Finish with a brief report: what changed, which commands ran and their results, and what is still unverified.
