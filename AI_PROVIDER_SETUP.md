# SPEX AI Provider Gateway

SPEX no longer depends on Gemini alone. The server exposes a provider-agnostic AI Gateway with automatic fallback.

## Supported providers

- NVIDIA NIM / OpenAI-compatible endpoints
- OpenAI
- Anthropic Claude
- Google Gemini
- Generic OpenAI-compatible endpoints (OpenRouter, Groq, self-hosted gateways, etc.)

## Configuration

Set one or more provider keys in `.env`:

- `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NVIDIA_MODEL`
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `AI_COMPATIBLE_API_KEY`, `AI_COMPATIBLE_BASE_URL`, `AI_COMPATIBLE_MODEL`

The gateway tries the preferred provider first (when supplied), then falls back to other enabled providers.

## Security

Provider API keys are server-side environment secrets. The browser must not send provider keys in AI requests.

If legacy user-provided API keys are still stored by the profile UI, they are encrypted at rest using `API_KEY_ENCRYPTION_SECRET` and are not returned by `/api/auth/me` or user listing endpoints. They are not used by the new gateway until an explicit per-user provider policy is implemented.

## Production requirements

- Set a strong `JWT_SECRET` (32+ characters).
- Set `API_KEY_ENCRYPTION_SECRET` (32+ characters) if users can save legacy keys.
- Configure at least one AI provider.
- Run Prisma migrations before starting the server.
