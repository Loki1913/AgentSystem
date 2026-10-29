# AgentSystem

**Personal, modular AI-agent workspace** built incrementally around Neuron AI (PHP), OpenRouter, and isolated tools.

> **Current status:** Phase 0. A local chat interface and OpenRouter-compatible gateway are committed. The full autonomous agent system is not complete yet; each capability will be added and tested separately.

## Goals
- A single interface to assign tasks to specialist agents.
- Configurable cloud models through OpenRouter, including eligible free models.
- Research with source links and a distinction between evidence and conclusions.
- Image/document understanding.
- Coding workflows with workspace boundaries, tests, and reviewable diffs.
- Browser automation through Playwright in a separate, restricted worker.
- Human approval before external side effects.

## Architecture
1. Local web UI and HTTP entry point.
2. Coordinator and workflow limits.
3. Model gateway for OpenRouter-compatible requests.
4. Neuron AI for agent orchestration.
5. Explicit, permissioned tool registry.
6. Separate research, vision, coding, and browser workers.
7. Audit trail, approval gates, timeouts, and cost/step limits.

## Technology
- PHP 8.2+ and Composer.
- Neuron AI package: `neuron-core/neuron-ai`.
- OpenRouter as initial model gateway.
- HTML/CSS/JavaScript for the local UI.
- Node.js + Playwright as a later browser worker.
- SQLite may be added for durable task history.

## Quick start (Windows)
1. Install PHP 8.2+ with cURL and mbstring enabled, plus Composer.
2. Copy `.env.example` to `.env`.
3. Add your OpenRouter API key to `.env` locally. **Never commit it.**
4. Run `composer install`.
5. Run `composer serve` or `php -S 127.0.0.1:8080 -t public`.
6. Open http://127.0.0.1:8080.

Set `OPENROUTER_MODEL` to a model ID currently available to your OpenRouter account. Free model availability and quotas can change. If the key or model is missing, the app will show a configuration error instead of sending a request.

## Security baseline
- Bind only to `127.0.0.1` during local development.
- Keep API keys in `.env` only.
- Never execute model-generated shell commands automatically.
- Treat web pages, files, and tool output as untrusted data.
- Require explicit approval for external side effects.
- Use per-tool permissions, timeouts, and output limits.
- Never upload private files to a model unless the user explicitly selects them.

## Roadmap and current limitations
See [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). At this stage the app can send text to a configured model; it does **not** yet browse websites, analyze uploaded images, run code, or operate desktop applications.
