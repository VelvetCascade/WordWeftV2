import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationCopy } from '../utils/notificationPresentation.ts';

test('notification copy shows an actor only once for older messages', () => {
    assert.deepEqual(notificationCopy({ message: '  Mira Ellery commented on your chapter. ', metadata: { actorName: ' Mira Ellery ' } }), { actor: 'Mira Ellery', message: 'commented on your chapter.' });
    assert.deepEqual(notificationCopy({ message: 'mira ellery followed you.', metadata: { actorName: 'Mira Ellery' } }), { actor: 'Mira Ellery', message: 'followed you.' });
});

test('notification copy preserves newer messages and missing actors', () => {
    assert.deepEqual(notificationCopy({ message: 'followed you.', metadata: { actorName: 'Mira' } }), { actor: 'Mira', message: 'followed you.' });
    assert.deepEqual(notificationCopy({ message: ' Your story is live. ', metadata: {} }), { actor: '', message: 'Your story is live.' });
});

test('notification copy does not remove a different name with the same prefix', () => {
    assert.deepEqual(notificationCopy({ message: 'Miranda liked your story.', metadata: { actorName: 'Mira' } }), { actor: 'Mira', message: 'Miranda liked your story.' });
});
