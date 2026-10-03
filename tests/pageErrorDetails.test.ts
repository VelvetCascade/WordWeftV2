import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPageErrorDetails, diagnosticScreen, retainPageError, sanitizeErrorText } from '../utils/pageErrorDetails.ts';

test('diagnostics identify the build and component while removing credentials and query strings', () => {
  const error = new Error('Request https://wordweftstudio.com/reset-password?token=secret#private failed for private@example.test with Bearer credential');
  const details = createPageErrorDetails(error, '\n at ReaderPage (https://wordweftstudio.com/assets/reader.js?credential=private)', {
    route: '/write/book/private-story/chapter/private-draft/edit?token=private', build: 'release-123', online: false,
  });
  assert.equal(details.build, 'release-123');
  assert.equal(details.screen, '/write/book/:book/chapter/:chapter/edit');
  assert.equal(details.online, false);
  assert.match(details.componentStack, /ReaderPage/);
  assert.doesNotMatch(JSON.stringify(details), /private-story|private-draft|secret|private@example|credential=|Bearer credential/);
});

test('diagnostics never retain search text or reset tokens in the route', () => {
  assert.equal(diagnosticScreen('/search?q=private+search'), '/search');
  assert.equal(diagnosticScreen('/reset-password?token=reset-token'), '/reset-password');
  assert.equal(diagnosticScreen('/community/post/123?context=private'), '/community/post/:post');
  assert.equal(sanitizeErrorText('Bearer abc.def.ghi a@b.com'), 'Bearer [redacted] [email]');
});

test('large error messages and stacks are bounded', () => {
  const error = new Error('A'.repeat(5000));
  error.stack = 'line\n'.repeat(1000);
  const details = createPageErrorDetails(error, 'component\n'.repeat(1000), { route: '/', build: 'test', online: true });
  assert.equal(details.message.length, 1000);
  assert.ok(details.stack.split('\n').length <= 12);
  assert.ok(details.componentStack.split('\n').length <= 20);
});

test('retained local reports survive recovery but cannot grow beyond three entries', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value) };
  for (let index = 0; index < 5; index++) retainPageError(createPageErrorDetails(new Error(`failure-${index}`), '', { route: '/', build: 'test', online: true }), storage);
  const reports = JSON.parse(values.get('wordweft:recent-page-errors')!);
  assert.deepEqual(reports.map((record: {message: string}) => record.message), ['failure-2', 'failure-3', 'failure-4']);
});

test('broken or blocked optional diagnostics storage cannot throw another error', () => {
  const details = createPageErrorDetails(new Error('original'), '', { route: '/', build: 'test', online: true });
  assert.doesNotThrow(() => retainPageError(details, { getItem: () => '{corrupted', setItem: () => { throw new Error('quota'); } }));
  assert.doesNotThrow(() => retainPageError(details, { getItem: () => { throw new Error('blocked'); }, setItem: () => {} }));
});
