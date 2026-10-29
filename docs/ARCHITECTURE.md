# Architecture and safety boundaries

## Request flow

```text
Browser UI
  -> local PHP API
    -> input validation / limits
      -> coordinator
        -> Neuron agent or workflow
          -> model gateway (OpenRouter)
          -> approved tools
    <- structured result + source links + task status
  <- UI rendering (text escaped; links validated)
```

## Components

- **Presentation:** local web UI; does not receive provider secrets.
- **HTTP API:** validates request method, JSON shape, body size, and session/origin assumptions.
- **Model gateway:** provider-specific HTTP details and error normalization.
- **Coordinator:** decides which named agent/workflow to invoke; enforces step and time limits.
- **Tools:** small, typed operations with declared inputs/outputs and permission levels.
- **Workers:** browser and code execution are isolated processes, not capabilities granted to every agent.
- **Audit:** records task IDs, timings, tool names, and outcomes without recording secrets.

## Trust model

Prompt injection can appear in web pages, files, screenshots, code comments, and tool outputs. Such content is data, not authority. The system must not let retrieved content override system policy or grant permissions.

## Approval policy

Automatic: read-only analysis, local calculations, searching, drafting, and tests inside the project workspace.

Approval required: writing outside the workspace, executing new code, installing dependencies, sending messages, submitting forms, publishing, changing accounts, deleting data, or spending money.

Denied by default: secret extraction, credential disclosure, unrestricted shell access, silent browser actions in logged-in profiles, and unbounded autonomous loops.

## Operational limits

- All network calls need timeouts.
- All tools need input/output size limits.
- All agent loops need a maximum step count.
- Provider model IDs are configuration, not hard-coded assumptions.
- Model output is untrusted and must be validated before it reaches tools.
