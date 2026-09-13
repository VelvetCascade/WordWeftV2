<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Production SEO

Use Node 22.18+ or Node 24. `npm run build` generates the Vercel Build Output API deployment, including public HTML and live sitemaps. Deploy the backend SEO endpoints first and configure both API URLs before deploying the frontend. See [the SEO launch guide](docs/SEO-LAUNCH.md) for indexing rules, search intent, environment settings, verification commands and Search Console setup.

Use `npm run preview:seo` to check crawler-visible HTML locally; Vite's static preview does not run the SEO renderer.
