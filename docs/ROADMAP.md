# AgentSystem roadmap

## Phase 0 — foundation
- [x] Private repository, architecture, environment template, and secret ignore rules.
- [x] Local chat UI and OpenRouter-compatible gateway.
- [x] Composer, PHP syntax, smoke, and Node syntax checks.
- [ ] Run on the user's Windows machine with a real model key.

## Phase 1 — model gateway
- [x] Configurable OpenRouter requests and timeouts.
- [x] Configurable multimodal model override.
- [ ] Add rate limiting, request IDs, and mocked HTTP contract tests.
- [ ] Verify live model and quota behavior.

## Phase 2 — coordinator and agents
- [x] Neuron AI agent wrapper for general tasks.
- [x] Coordinator with bounded tool-call rounds and specialist modes.
- [x] Explicit tool schemas and mode-specific permissions.
- [x] Metadata-only task audit log.
- [ ] Multi-agent delegation/planning with per-agent budgets and integration tests.

## Phase 3 — research and vision
- [x] Research mode with public search results and source URLs.
- [x] HTTPS page extraction with response/time limits and private-host checks.
- [x] Image input for multimodal OpenRouter models.
- [x] Browser screenshot can be passed to a configurable vision model.
- [ ] Improve search-provider resilience and verify live multimodal behavior.

## Phase 4 — coding workspace
- [x] Workspace file listing, reading, and writing.
- [x] Path traversal and file-size limits.
- [x] Writing tools are offered only when explicitly enabled in the UI.
- [x] Smoke tests for workspace boundaries and metadata logging.
- [ ] Diff preview, backups, rollback, and approval per file.
- [ ] Isolated test execution; arbitrary host shell execution remains disabled.

## Phase 5 — browser operator
- [x] Separate Node.js + Playwright worker.
- [x] Read-only navigation, visible text extraction, and screenshot capture.
- [x] Browser mode in the coordinator.
- [x] DNS/IP checks for private and reserved addresses.
- [ ] Validate screenshot-to-model flow against a live worker.
- [ ] Controlled interactions with explicit approval; current worker does not click or submit forms.

## Phase 6 — memory and usability
- [x] Metadata-only task history; prompts, images, responses, and keys are excluded.
- [x] Responsive UI with task modes and optional image upload.
- [x] Basic history view showing metadata only.
- [ ] Clear/export controls and opt-in conversation memory.
- [ ] Per-model budgets, cancellation, and regression tests.

## Definition of done
A capability is not production-ready until implementation, permissions, failure handling, and tests exist. Research and browser adapters are experimental; run them locally only.
