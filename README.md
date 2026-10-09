# WordWeft

WordWeft is a React/Vite reading and writing application backed by Spring Boot and MongoDB.

## Local development

Requirements: Node 22.18+ (or Node 24), a full Java 17+ JDK, Maven, and Docker for the disposable local database.

From the repository root:

```sh
bash scripts/dev-local-mongo.sh
bash scripts/dev-local-backend.sh
# In a second terminal:
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api` to the real backend at `http://127.0.0.1:8080`. The preview runner fixes its database to `mongodb://127.0.0.1:27028/wordweft_local_development`; it uses local fixture configuration instead of production environment values. The runner and fixture configuration live in test sources and are excluded from the production jar.

Local accounts all use `WordWeftLocal123!`:

| Account | Email | ID |
| --- | --- | --- |
| Reader | `reader@example.test` | `local-reader` |
| Writer | `writer@example.test` | `local-writer` |
| Moderator / admin | `admin@example.test` | `local-admin` |

Fixtures include published stories, a draft workspace, a scheduled chapter, character/scene/note planning, a reader library, paragraph discussion, reviews, follows, and community posts. Start reading at `local-story-spring` / `local-story-spring-chapter-1`; write in `local-story-draft`. Local edits survive backend restarts. Stop the backend before running `bash scripts/dev-local-mongo.sh --reset` to discard the disposable database, then restart the backend to seed a clean copy. Stop MongoDB with `docker stop wordweft-local-mongo`.

Registration and password reset use the real backend flow. Emails are captured locally at `http://127.0.0.1:8081/mail`; read the generated OTP or reset link there. Messages are never delivered to external addresses. Google sign-in, ImageKit uploads, and Cloudflare R2 uploads require their real external configuration and are unavailable in this isolated preview. Local covers are fixture artwork; product upload destinations retain the storage boundaries below. Text/Markdown manuscript import works locally, while DOCX imports with embedded images require R2.

If Maven needs a proxy settings file, set `WORDWEFT_MAVEN_SETTINGS=/absolute/path/settings.xml`. To use a Maven installation outside `PATH`, set `WORDWEFT_MAVEN_COMMAND=/absolute/path/mvn`. `JAVA_HOME` can select a full JDK.

For development against a separately configured backend, use the values in [`.env.example`](./.env.example) and run `mvn spring-boot:run` from `backend`.

Run verification with:

```text
npm test
npm run typecheck
npm run build
npm run test:seo
npm run check:bundle
(cd backend && mvn test)
# With the disposable backend running:
node scripts/test-backend-local.mjs
npx playwright install chromium
npm run test:e2e
```

The browser suite uses the real local API and MongoDB, including OTP/password reset, manuscript recovery, revision restoration, publishing and scheduling, reading progress, library shelves, reviews, community posts and moderation. It checks desktop, 393 px and 320 px layouts, keyboard navigation, accessibility, and failed-request recovery. Playwright records traces and screenshots for failures. On Linux, `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` can select an installed system browser.

## Storage boundaries

- ImageKit: story covers, user avatars, and character portraits.
- Cloudflare R2: inline chapter images and Founding Writer manuscript files only.

Do not move cover, avatar, or character uploads to R2. Do not use the Render filesystem as durable upload storage.

## Administration

Production administrators can open the private console at `/admin`. See [Admin console](./docs/ADMIN-CONSOLE.md) for role requirements, live metrics, management limits and rollout checks.

## Deployment

The exact Vercel, Render, and Cloudflare configuration is documented in [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md). Public SEO setup is documented separately in [`docs/SEO-LAUNCH.md`](./docs/SEO-LAUNCH.md).
