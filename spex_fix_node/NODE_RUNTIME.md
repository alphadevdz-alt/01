# Node.js Runtime for Render

SPEX is pinned to Node.js 22 LTS.

- `.node-version` pins the Render runtime to Node 22.
- `package.json` restricts Node to `>=22.0.0 <23.0.0`.
- `.npmrc` sets `ignore-scripts=true` so npm lifecycle scripts cannot block deployment under newer npm script policies.
- Prisma Client generation is run explicitly by `npm run render:build`.
- Husky is not installed/executed as a production lifecycle hook.

Render build command:

```bash
npm run render:build
```

The build performs:

```bash
npm ci --ignore-scripts
npx prisma generate
npx prisma migrate deploy
npm run build
```
