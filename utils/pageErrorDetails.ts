export interface PageErrorDetails {
  incidentId: string;
  interactions?: import('./reliabilityDiagnostics.ts').InteractionRecord[];
  occurredAt: string;
  build: string;
  screen: string;
  online: boolean;
  name: string;
  message: string;
  stack: string;
  componentStack: string;
}

// Queries can contain password-reset tokens, searches and authentication intents.
export function sanitizeErrorText(value: string): string {
  return value.replace(/https?:\/\/[^\s"'<>]+/gi, raw => {
    try { const url = new URL(raw); return `${url.origin}${url.pathname}`; }
    catch { return '[URL]'; }
  }).replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[token]');
}

export function diagnosticScreen(route: string): string {
  try {
    const path = new URL(route, 'https://wordweft.invalid').pathname;
    return path.replace(/(\/book\/)[^/]+/g, '$1:book')
      .replace(/(\/chapter\/)[^/]+/g, '$1:chapter')
      .replace(/(\/author\/)[^/]+/g, '$1:author')
      .replace(/(\/community\/post\/)[^/]+/g, '$1:post')
      .replace(/(\/search|\/reset-password)\/.*$/, '$1');
  } catch { return '/unknown'; }
}

export function createPageErrorDetails(error: unknown, componentStack: string, context: {
  route: string; build: string; online: boolean;
}): PageErrorDetails {
  const failure = error instanceof Error ? error : new Error(String(error));
  return {
    incidentId: `WW-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    occurredAt: new Date().toISOString(),
    build: context.build,
    screen: diagnosticScreen(context.route),
    online: context.online,
    name: failure.name,
    message: sanitizeErrorText(failure.message).slice(0, 1000),
    stack: sanitizeErrorText(failure.stack || '').split('\n').slice(0, 12).join('\n').slice(0, 4000),
    componentStack: sanitizeErrorText(componentStack).split('\n').slice(0, 20).join('\n').slice(0, 4000),
  };
}

/** Local, bounded diagnostics; no network reporting and no request/form payloads. */
export function retainPageError(details: PageErrorDetails, storage: Pick<Storage, 'getItem' | 'setItem'>): void {
  try {
    const previous = JSON.parse(storage.getItem('wordweft:recent-page-errors') || '[]');
    const records = Array.isArray(previous) ? previous.slice(-2) : [];
    storage.setItem('wordweft:recent-page-errors', JSON.stringify([...records, details]));
  } catch { /* Reporting must never become another page failure. */ }
}
