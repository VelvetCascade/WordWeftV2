import test from 'node:test';
import assert from 'node:assert/strict';
import { internalNavigationTrail, returnNavigationTarget } from '../utils/navigationHistory.ts';

test('direct policy entry and its section anchors have a local fallback', () => {
    assert.equal(returnNavigationTarget([], '/privacy'), null);
    assert.equal(returnNavigationTarget([{ url: '/privacy', id: '1' }], '/privacy#privacy-2'), null);
});
test('policy chaining and section anchors retain the settings return destination', () => {
    const target = returnNavigationTarget([
        { url: '/edit-profile', id: '1' }, { url: '/privacy', id: '2' }, { url: '/privacy#privacy-2', id: '3' },
    ], '/terms');
    assert.deepEqual(target, { url: '/edit-profile', distance: 3, label: 'Back to settings' });
});
test('catalog return preserves query and fragment and uses the actual app entry', () => {
    assert.deepEqual(returnNavigationTarget([{ url: '/category?genre=Adventure#shelves', id: '1' }], '/book/sea'),
        { url: '/category?genre=Adventure#shelves', distance: 1, label: 'Back to stories' });
});
test('external and malformed entries cannot become back targets', () => {
    assert.deepEqual(internalNavigationTrail([{ url: '//outside.test', id: '1' }, { url: 'https://outside.test', id: '2' },
        { url: '/edit-profile' }, { url: '/library', id: 'valid' }]), [{ url: '/library', id: 'valid' }]);
});
