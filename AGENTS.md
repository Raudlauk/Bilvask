# AGENTS.md

## Purpose

This file is the entry point for agents working in this repository.

Keep it short. It is a map to the repository, not a complete engineering handbook.
Load deeper documentation only when it is relevant to the current task.

## Instruction Priority

Follow higher-priority runtime and user instructions first.
Within the repository, prefer the most specific applicable guidance.
A nested `AGENTS.md` may add to or override this root file for its subtree.

If instructions conflict or required behavior is unclear, inspect the code, tests, and relevant documentation before changing anything.

## Model Workflow

### Main Model Selector — GPT-6 Astra Light

GPT-6 Astra Light is the default coordinator and selector for repository work.
It owns architecture, decomposition, integration, review, and final verification.

Use the smallest capable model for each bounded task rather than sending all work to the strongest implementation model.

### Astra Light — Architecture / Decomposition / Integration

Astra Light should:

- inspect the relevant repository area first
- understand architecture, dependencies, constraints, and affected systems
- break non-trivial work into bounded implementation tasks
- define acceptance criteria and integration expectations
- select the appropriate implementation model for each task
- integrate completed work and resolve cross-task conflicts

Astra Light may implement trivial changes directly when delegation would add unnecessary overhead.

### GPT-6.1 Sol — Main Implementation

Use GPT-6.1 Sol for the main bounded implementation tasks, especially when they involve meaningful logic, multiple files, state, APIs, database behavior, concurrency, or non-trivial debugging.

GPT-6.1 Sol should:

- read relevant code before editing
- follow repository conventions
- satisfy the assigned acceptance criteria
- make the smallest correct change
- preserve unrelated behavior
- add or update meaningful tests
- run relevant validation
- report assumptions, risks, and incomplete items accurately

Do not silently redesign unrelated systems.

### Sol 6.1 Light — Simple Supporting Work

Use Sol 6.1 Light for small, well-bounded tasks such as:

- simple tests
- telemetry or instrumentation additions
- documentation updates
- mechanical edits
- repetitive migrations or configuration edits with clear requirements
- straightforward refactors with low architectural risk

Escalate to GPT-6.1 Sol when the task reveals non-trivial behavior, ambiguity, integration risk, or architectural consequences.

### Astra Light — Review / Integration / Final Verification

After implementation, Astra Light should independently inspect the actual diff and relevant code.

Review for:

- correctness
- regressions
- acceptance-criteria compliance
- security and privacy issues
- error handling
- concurrency and state issues
- API and data compatibility
- maintainability
- missing or misleading tests

Blocking findings should be returned to the appropriate implementation model for focused correction.

Astra Light then:

- integrates the final changes
- runs or coordinates final verification
- checks important regression areas
- confirms documentation or configuration changes when required
- reports what was actually verified and any remaining uncertainty

Approval should be based on inspected code and verification evidence, not only implementation summaries.

## Repository Map

Read only what is relevant. When present, use these as sources of truth:

- `README.md` — project purpose, setup, common commands
- `CONTRIBUTING.md` — contribution and development workflow
- `ARCHITECTURE.md` — system boundaries and architecture
- `docs/` — detailed engineering and product documentation
- `docs/design/` or `docs/design-docs/` — design decisions and technical designs
- `docs/product/` or `docs/product-specs/` — product behavior and requirements
- `docs/security/` or `SECURITY.md` — security requirements
- `docs/reliability/` or `RELIABILITY.md` — reliability and operational constraints
- `docs/exec-plans/` — active and completed execution plans
- `docs/generated/` — generated schemas or machine-maintained references
- tests near the affected code — executable behavior contracts
- local `AGENTS.md` files — area-specific instructions

Do not assume a listed file exists. Discover the repository structure first.
Do not load every document by default.

## Standard Workflow

For non-trivial tasks:

1. **Inspect** — trace the relevant code path, callers, tests, state, and interfaces.
2. **Plan** — define scope, constraints, risks, and observable acceptance criteria.
3. **Implement** — make focused changes using existing patterns where reasonable.
4. **Test** — run the smallest useful tests first, then broader validation when warranted.
5. **Review** — inspect the diff and behavior independently.
6. **Correct** — fix blocking review findings without expanding scope unnecessarily.
7. **Verify** — confirm the requested behavior and important regression areas.
8. **Report** — state what changed, what was tested, and what remains uncertain.

For trivial changes, compress the process proportionally, but do not skip necessary inspection or verification.

## Engineering Principles

### Existing Code First

Before adding new infrastructure, look for existing utilities, abstractions, services, configuration, fixtures, and patterns.
Reuse them when they fit.

### Smallest Correct Change

Prefer focused changes over broad rewrites.
Do not refactor unrelated code unless it directly blocks the task or presents an immediate serious risk.

### Root Cause Over Workaround

Fix the underlying problem when practical.
Avoid unnecessary flags, duplicate state, sleeps, retries, timers, or special cases used only to hide symptoms.

### Preserve Compatibility

Treat public interfaces, persisted data, configuration, file formats, APIs, and user workflows as compatibility boundaries.
Make breaking changes explicit and only when required.

### One Source of Truth

Avoid duplicated authoritative state.
When modifying stateful systems, identify ownership, initialization, mutation, persistence, synchronization, and cleanup.

### Clear Failure Behavior

Do not hide failures.
Prefer explicit errors, useful diagnostics, predictable cleanup, and bounded retries for transient failures only.

## Security

When relevant, review authentication, authorization, input validation, secret handling, file access, network access, SQL/query construction, command execution, dependency risk, and sensitive logging.

Never:

- expose secrets in source, logs, fixtures, screenshots, or client bundles
- weaken authentication or authorization to make a task pass
- trust unvalidated external input at a privileged boundary
- add destructive behavior without a clear requirement and appropriate safeguards

## Data and Migrations

For persistent-data changes, consider:

- migration and rollback behavior
- partial failures and transaction boundaries
- backwards compatibility
- validation and constraints
- existing data
- old application versions or clients

Do not assume a new schema is deployed everywhere immediately.

## Dependencies

Before adding a dependency, check whether the repository or platform already provides the capability.
Prefer dependencies that are maintained, compatible, secure, and justified by meaningful value.
Do not add a package for trivial functionality.

## Testing and Verification

Add tests where they provide meaningful regression protection, especially for bugs, state transitions, calculations, parsing, persistence, authorization, error paths, and integration boundaries.

Prefer deterministic tests.
Avoid unnecessary dependence on timing, external services, or unstable networks.

Be precise about verification:

- **inspected** means code was read
- **tested** means a command or automated test was run
- **manually verified** means behavior was exercised directly
- **unverified** means it remains an assumption

Never claim tests passed if they were not run successfully.

## Review Outcome

Use one of these outcomes for significant code review:

**APPROVED** — no blocking issues remain and verification is proportionate to the risk.

**CHANGES REQUIRED** — list concrete blocking findings, affected code, expected behavior, and the focused correction needed.

Do not use vague review comments such as “make this better.”

## Documentation

Update documentation when a change affects setup, configuration, architecture, deployment, public APIs, developer workflow, or user-visible behavior.

Keep durable knowledge in repository documentation rather than expanding this file.
If a rule becomes important and stable, prefer documenting it in the relevant domain document or enforcing it mechanically with tests, linting, types, schemas, or CI.

For large work, prefer a versioned execution plan under the repository's planning/docs structure instead of placing the plan in `AGENTS.md`.

## Context Hygiene

Context is limited. Use progressive disclosure:

- start from this file and the task
- inspect the relevant code
- open only the documentation needed for the current decision
- summarize large findings instead of repeatedly copying them
- prefer links and repository paths over duplicating long instructions

If documentation and implementation disagree, investigate which is current and update the stale source when appropriate.

## Completion Report

For meaningful changes, report concisely:

### Changed

Files or systems changed and the important behavior implemented.

### Tests

Commands or tests actually run and their results.

### Verification

What was directly verified beyond automated tests.

### Risks / Outstanding

Known limitations, assumptions, follow-up work, or areas not verified.

## Definition of Done

A task is complete when, proportionate to its risk:

- the requested behavior is implemented
- acceptance criteria are satisfied
- relevant tests and validation pass
- important regression areas were considered
- reviewer blocking issues are resolved
- unrelated behavior is preserved
- temporary debugging code is removed
- required documentation is updated
- the final report accurately describes verification and remaining uncertainty

## Core Principle

**Understand → Plan → Implement → Test → Review → Correct → Verify**

Use enough process to protect correctness and maintainability, but no more than the task requires.
