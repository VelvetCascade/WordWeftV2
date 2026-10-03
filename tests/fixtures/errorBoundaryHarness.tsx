import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PageErrorBoundary } from '../../components/RouteSurface';
import { lockNavigation } from '../../utils/navigation';

let root: Root;
let failing = true;
let activeRoute = '/category?sort=new';
let failureMessage = 'A controlled rendering failure';
function Screen() {
    if (failing) throw new Error(failureMessage);
    return <h1>Recovered screen</h1>;
}
function render() { root.render(<PageErrorBoundary route={activeRoute}><Screen /></PageErrorBoundary>); }
export function mountBoundary(message?: string) {
    failing = true;
    failureMessage = message || failureMessage;
    const container = document.createElement('div');
    container.id = 'boundary-test';
    document.body.appendChild(container);
    root = createRoot(container);
    render();
}
export function resolveFailure(route?: string) {
    failing = false;
    if (route) { activeRoute = route; render(); }
}
export function holdNavigation() { return lockNavigation('Save your draft before leaving.'); }
