import { test as base, expect } from '@playwright/test';

/** Local integration tests exercise WordWeft, without serving live third-party advertisements. */
export const test = base.extend({
    context: async ({ context }, use) => {
        await context.route(/^https:\/\/(?:pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net)\//, route =>
            route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
        await use(context);
    },
});

export { expect };
export type { APIRequestContext, Page } from '@playwright/test';
