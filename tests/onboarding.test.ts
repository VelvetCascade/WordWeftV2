import test from 'node:test';
import assert from 'node:assert/strict';
import { onboardingSteps, firstRoleStep, MAX_FAVORITE_GENRES, isQuietJourney } from '../utils/onboarding.ts';

test('each onboarding role selects its own first feature and correct ordered steps', () => {
    assert.deepEqual(onboardingSteps('reader'), [0, 1, 3, 4]);
    assert.equal(firstRoleStep('reader'), 3);
    assert.deepEqual(onboardingSteps('writer'), [0, 1, 2, 4]);
    assert.deepEqual(onboardingSteps('both'), [0, 1, 2, 3, 4]);
    assert.equal(firstRoleStep('both'), 2);
});
test('discovery and settings keep eight favorite genres while focused journeys stay quiet', () => {
    assert.equal(MAX_FAVORITE_GENRES, 8);
    for (const page of ['reader', 'writer-edit-chapter', 'writer-create-book', 'edit-profile', 'founding-writers', 'hook-feed']) assert.equal(isQuietJourney(page), true);
    assert.equal(isQuietJourney('home'), false);
});
