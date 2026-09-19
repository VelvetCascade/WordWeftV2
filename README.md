# WordWeft

WordWeft is a React/Vite reading and writing application backed by Spring Boot and MongoDB.

## Local development

Requirements: Node 22.18+ (or Node 24), Java 17+, Maven, and the environment values listed in [`.env.example`](./.env.example).

1. Start the backend from `backend` with `mvn spring-boot:run` after loading the backend variables into the process environment.
2. Start the frontend from the repository root with `npm run dev`.
3. Open `http://localhost:3000`. Vite proxies `/api` to the backend at `http://127.0.0.1:8080`, so the same frontend URL also works from a phone on the local network.

Run verification with:

```text
npm test
npm run typecheck
npm run build
npm run test:seo
npm run check:bundle
cd backend && mvn test
```

## Storage boundaries

- ImageKit: story covers, user avatars, and character portraits.
- Cloudflare R2: inline chapter images and Founding Writer manuscript files only.

Do not move cover, avatar, or character uploads to R2. Do not use the Render filesystem as durable upload storage.

## Deployment

The exact Vercel, Render, and Cloudflare configuration is documented in [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md). Public SEO setup is documented separately in [`docs/SEO-LAUNCH.md`](./docs/SEO-LAUNCH.md).
