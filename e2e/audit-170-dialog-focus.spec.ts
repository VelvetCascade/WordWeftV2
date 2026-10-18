import { test, expect } from './fixtures';
import { mkdirSync, writeFileSync } from 'node:fs';
for (const width of [1440, 390]) test(`history disclosure supports forward/reverse keyboard traversal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const revision = { id: 'recovery', label: 'Opening checkpoint', reason: 'MANUAL_CHECKPOINT', title: 'An opening', content: '<p>The original opening.</p>', plainTextPreview: 'The original opening.', wordCount: 3, createdAt: '2026-10-10T10:00:00Z' };
    let writes = 0;
    await page.route('**/api/**', route => {
        if (/\.[cm]?[jt]sx?$/.test(new URL(route.request().url()).pathname)) return route.continue();
        if (route.request().method() !== 'GET') writes++;
        return route.fulfill({ json: route.request().url().endsWith('/revisions') ? [revision] : revision });
    });
    await page.goto('/e2e/audit-170-dialog.html');
    const trigger = page.getByRole('button', { name: 'View revisions', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Version history', exact: true });
    await dialog.getByRole('button', { name: 'Compare and restore', exact: true }).click();
    const restore = dialog.getByRole('button', { name: 'Restore working draft', exact: true });
    const summary = dialog.locator('.ww-version-restore-actions summary');
    await restore.focus(); await page.keyboard.press('Tab');
    const trace = [{ action: 'Tab after Restore working draft', focus: await page.evaluate(() => document.activeElement?.outerHTML) }];
    await expect(summary).toBeFocused();
    await page.keyboard.press('Tab');
    trace.push({ action: 'Tab after collapsed Publication changes', focus: await page.evaluate(() => document.activeElement?.outerHTML) });
    if (process.env.AUDIT_EVIDENCE_DIR) {
        mkdirSync(process.env.AUDIT_EVIDENCE_DIR, { recursive: true });
        await page.screenshot({ path: `${process.env.AUDIT_EVIDENCE_DIR}/${process.env.AUDIT_PHASE || 'after'}-${width}.png` });
        writeFileSync(`${process.env.AUDIT_EVIDENCE_DIR}/${process.env.AUDIT_PHASE || 'after'}-${width}-keyboard.json`, JSON.stringify(trace, null, 2));
    }
    await expect(dialog.getByRole('button', { name: 'Close version history' })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(summary).toBeFocused();
    await page.keyboard.press('Enter'); await expect(summary.locator('..')).toHaveAttribute('open');
    await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Restore and withdraw release', exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Close version history' })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Restore and withdraw release', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(summary).toBeFocused();
    await page.keyboard.press('Space'); await expect(summary.locator('..')).not.toHaveAttribute('open');
    await page.keyboard.press('Shift+Tab'); await expect(restore).toBeFocused();
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden'); expect(writes).toBe(0);
});

test('shared trap respects browser tab order, excluded controls, and nested ownership', async ({ page }) => {
    await page.goto('/e2e/audit-170-dialog.html');
    await page.getByRole('button', { name: 'Open controls', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Native controls', exact: true });
    // Positive tabindex precedes zero/native controls in the browser's sequential order.
    await expect(dialog.getByText('Positive tab index', { exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Open nested', exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(dialog.getByText('Positive tab index', { exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Close controls', exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(dialog.locator('summary')).toBeFocused();
    await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Open nested', exact: true })).toBeFocused();
    await page.keyboard.press('Enter'); const nested = page.getByRole('dialog', { name: 'Nested', exact: true });
    await expect(nested.getByRole('button', { name: 'Close nested' })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(nested.getByRole('button', { name: 'Last nested' })).toBeFocused();
    await page.keyboard.press('Escape'); await expect(nested).not.toBeVisible(); await expect(dialog.getByRole('button', { name: 'Open nested' })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(page.getByRole('button', { name: 'Open controls', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});
