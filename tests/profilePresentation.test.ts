import test from 'node:test';
import assert from 'node:assert/strict';
import { authorRating, countLabel } from '../utils/profilePresentation.ts';

test('unrated stories cannot reduce an author rating and reviews weight rated stories', () => {
  assert.deepEqual(authorRating([{rating: 5, reviewsCount: 2}, {rating: 3, reviewsCount: 1}, {rating: 0, reviewsCount: 0}]), {average: 13/3, reviews: 3});
  assert.deepEqual(authorRating([{rating: 0, reviewsCount: 0}]), {average: null, reviews: 0});
});
test('singular and plural labels remain explicit', () => {
  assert.equal(countLabel(1, 'follower'), '1 follower');
  assert.equal(countLabel(2, 'story', 'stories'), '2 stories');
});
