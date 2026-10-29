# AgentSystem roadmap

## Phase 0 — foundation (current)
- [x] Establish private repository and architecture.
- [x] Add environment template and secret-safe ignore rules.
- [x] Define incremental milestones and safety boundaries.
- [ ] Build and verify first runnable local interface.
- [ ] Verify PHP/Composer installation and OpenRouter connectivity locally.

## Phase 1 — working model gateway
- Validate configuration at startup.
- Implement OpenRouter chat request with timeouts and clear errors.
- Add request-size limits and a basic chat UI.
- Never expose API key or raw provider headers to the browser.
- Add smoke tests with mocked HTTP responses.

## Phase 2 — Neuron orchestration
- Implement one Neuron agent using the current installed API.
- Add a coordinator and a small registry of named specialist agents.
- Add task state, cancellation/timeout handling, and token/cost limits.
- Avoid multi-agent loops without a maximum step count.

## Phase 3 — research and vision
- Research tool with search URLs, retrieval timestamps, and source list.
- Image/document input with explicit upload limits and supported MIME types.
- Preserve citations and mark uncertain or unsupported claims.

## Phase 4 — coding workspace
- Sandboxed project workspace, file allowlist, diff preview, test runner.
- No unrestricted host filesystem access.
- No model-generated shell command executes without policy checks and user approval.

## Phase 5 — browser operator
- Separate Node.js + Playwright worker.
- Dedicated browser profile and restricted downloads.
- Screenshots and page summaries returned to the coordinator.
- Confirm before form submission, purchases, messages, account changes, deletion, or publication.

## Phase 6 — durable memory and usability
- SQLite task history, settings UI, logs, export/delete controls.
- User-selectable model per task and provider quota/error reporting.
- Regression tests and a documented Windows setup.

## Definition of done

A capability is complete only when its implementation, permissions, error handling, and tests are present. A roadmap checkbox must not be marked complete just because a design exists.
