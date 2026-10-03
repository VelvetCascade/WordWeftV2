/** Validate the URLs actually used by the built client and the server renderer. */
export function localPreviewApiBase(config, runtimeApiBase) {
    const apiBase = (runtimeApiBase || config.apiBase).replace(/\/+$/, '');
    if (!['localhost', '127.0.0.1'].includes(new URL(apiBase).hostname) || config.clientApiBase !== '/api') {
        throw new Error('Build this local E2E preview with SEO_API_BASE_URL=http://127.0.0.1:8080/api and VITE_API_BASE_URL=/api.');
    }
    return apiBase;
}
