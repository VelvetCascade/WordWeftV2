import { test as base, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

// Independent disposable journeys must not share the server's per-IP rate bucket.
// playwright.config.ts rejects non-local targets; rate-limit tests may override this header.
const localAddress = (title: string) => {
    const hash = createHash('sha256').update(`${process.pid}:${title}`).digest();
    return `127.${hash[0]}.${hash[1]}.${hash[2]}`;
};

/** Local integration tests exercise WordWeft, without serving live third-party advertisements. */
export const test = base.extend({
    context: async ({ context }, use, testInfo) => {
        await context.setExtraHTTPHeaders({ 'X-Forwarded-For': localAddress(testInfo.titlePath.join(':')) });
        await context.route(/^https:\/\/(?:pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net)\//, route =>
            route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
        await use(context);
    },
    request: async ({ playwright, baseURL }, use, testInfo) => {
        const request = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'X-Forwarded-For': localAddress(testInfo.titlePath.join(':')) } });
        try { await use(request); } finally { await request.dispose(); }
    },
});

export { expect };
export type { APIRequestContext, Page } from '@playwright/test';
