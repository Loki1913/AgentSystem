# AgentSystem roadmap

## Phase 0 — foundation
- [x] Establish private repository and architecture.
- [x] Add environment template and secret-safe ignore rules.
- [x] Define milestones and safety boundaries.
- [x] Add first local chat UI and OpenRouter-compatible gateway.
- [ ] Verify PHP/Composer installation and provider connectivity on the user's computer.

## Phase 1 — harden model gateway
- [ ] Validate configuration and provider model IDs.
- [ ] Add mocked HTTP tests, better error normalization, request logging without secrets.
- [ ] Add rate/size limits and a local session boundary.
- [ ] Verify provider response format and usage metadata.

## Phase 2 — Neuron orchestration
- [ ] Implement one Neuron agent using the installed package's actual API.
- [ ] Add coordinator and named specialist registry.
- [ ] Add task state, cancellation, timeouts, token/cost limits.
- [ ] Prevent unbounded agent loops.

## Phase 3 — research and vision
- [ ] Research tool with URLs, retrieval timestamps, and source list.
- [ ] Image/document input with upload limits and MIME validation.
- [ ] Keep citations and mark uncertain or unsupported claims.

## Phase 4 — coding workspace
- [ ] Sandboxed project workspace, file allowlist, diff preview, test runner.
- [ ] No unrestricted host filesystem access.
- [ ] Require policy checks and user approval before new code executes.

## Phase 5 — browser operator
- [ ] Separate Node.js + Playwright worker.
- [ ] Dedicated browser profile and restricted downloads.
- [ ] Screenshots and page summaries returned to coordinator.
- [ ] Confirm before form submission, purchases, messages, account changes, deletion, or publication.

## Phase 6 — durable memory and usability
- [ ] SQLite task history, settings UI, logs, export/delete controls.
- [ ] User-selectable model and provider quota/error reporting.
- [ ] Regression tests and documented Windows setup.

## Definition of done
A capability is complete only when implementation, permissions, error handling, and tests exist. A checkbox is not complete just because a design exists.
