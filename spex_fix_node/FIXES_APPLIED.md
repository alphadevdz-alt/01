# SPEX — Applied Security and AI Architecture Fixes

## Applied

1. Added provider-agnostic `AI Gateway` with:
   - NVIDIA NIM
   - OpenAI
   - Anthropic Claude
   - Google Gemini
   - Generic OpenAI-compatible endpoints
   - automatic fallback
   - timeout handling
   - provider status and provider test endpoints

2. Removed direct browser-to-provider API key forwarding from AI request helpers.

3. Google login no longer creates an active account automatically. A pre-existing SPEX account is required.

4. Production startup now fails when `JWT_SECRET` is missing or shorter than 32 characters.

5. Public registration can only create `teacher` accounts. Elevated roles must be granted server-side.

6. Removed fake default school/municipality/district data from public registration.

7. User IDs created by registration use `crypto.randomUUID()`.

8. User-provided legacy API keys are encrypted at rest in `encryptedApiKey` and are not returned to clients.

9. Direct-message `senderId` is assigned by the server and cannot be spoofed through payload data.

10. Community notification `senderId` is assigned by the server.

11. District messages always use the authenticated user's `districtId`.

12. Inspector notes can only be created by `admin` or `inspector`.

13. Added `encryptedApiKey` Prisma migration.

14. Added multi-provider environment configuration in `.env.example`.

## Important deployment action

Before deploying, set:

- `JWT_SECRET`
- `API_KEY_ENCRYPTION_SECRET`
- at least one AI provider key (`NVIDIA_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`)

Then run:

```bash
npm ci
npx prisma migrate deploy
npm run build
```

The current review environment could not complete `npm ci` because its internal npm mirror returned HTTP 404 for `@types/react`; therefore a full build/typecheck was not possible in this environment. The source changes were checked statically and no new third-party runtime dependency was introduced.
