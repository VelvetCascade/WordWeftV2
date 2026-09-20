# WordWeft deployment configuration

## Render backend

Set these environment variables on the Spring Boot service:

- `SPRING_DATA_MONGODB_URI`
- `JWT_TOKEN`
- `JWT_EXPIRY` (optional; defaults to 30 days)
- `GOOGLE_CLIENT_ID`
- `GMAIL_APPS_SCRIPT_URL`
- `FRONTEND_HOST=https://www.wordweftstudio.com`
- `READER_SIGN_IN_GATE_ENABLED=true`
- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_URL_ENDPOINT`
- `UPLOAD_SIGNING_SECRET`
- `WORKER_BASE_URL` (the deployed Cloudflare Worker origin, without a trailing route)
- `FCSHEET_URL` (optional; blank disables the Founding Writer Sheet mirror)

`PORT` is supplied by Render. The same `UPLOAD_SIGNING_SECRET` value must be installed as the Cloudflare Worker secret. A missing or mismatched secret makes both manuscript and inline chapter-image uploads fail safely instead of pretending they succeeded.

Render must deploy the `backend` directory using Java 17. No persistent disk is needed for the supported upload paths.

## Vercel frontend

Set these environment variables for Production (and Preview if the preview should use the production backend):

- `VITE_API_BASE_URL=https://wordweftv2.onrender.com/api`
- `SEO_API_BASE_URL=https://wordweftv2.onrender.com/api`
- `VITE_GOOGLE_CLIENT_ID` (the same Google web client used by the backend)
- `SEO_NOINDEX=false` in Production

Do not set `VITE_API_BASE_URL` to localhost in Vercel. Local development intentionally uses `/api` and the Vite proxy so LAN phones reach the computer running the backend instead of trying to reach port 8080 on the phone itself.

## Cloudflare Worker and R2

The Worker configuration lives in `worker/wrangler.toml`.

1. Keep the `CHAPTERS_BUCKET` R2 binding pointed at `wordweft-writer-fw-submission` (or update the binding and bucket together if renamed).
2. Install `UPLOAD_SIGNING_SECRET` with `wrangler secret put UPLOAD_SIGNING_SECRET`.
3. Ensure `ALLOWED_ORIGINS` includes the production Vercel/custom domains used for admin downloads.
4. Deploy from `worker` with `npm run deploy` when Worker code or `wrangler.toml` changes.
5. Copy the resulting Worker origin into Render as `WORKER_BASE_URL`.

The R2 bucket does not need to be public. Chapter images are served through the Worker with immutable public cache headers; Founding Writer files require a short-lived signed download token.

## Post-deploy smoke test

After all three deployments are live:

1. Sign in, create a private story, and upload an inline chapter image.
2. Import a DOCX containing an embedded image and confirm both text and image appear.
3. Publish a later chapter and confirm the story plus its preceding complete chapters become public.
4. Edit a public chapter without publishing and confirm readers still see the previous public version; then use **Publish updates**.
5. Search for the first few letters of an author username.
6. Submit and download a Founding Writer manuscript.
7. Open a chapter on mobile and confirm reader controls and paragraph-comment actions stay inside the viewport.
