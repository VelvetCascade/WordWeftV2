import test from 'node:test';
import assert from 'node:assert/strict';

const helper = await import('../utils/discoveryFilters.ts').catch(() => ({})) as any;
test('shortcuts promote only available genres and prioritize reader choices without changing source order', () => {
  assert.equal(typeof helper.availableGenreShortcuts, 'function');
  const rows = [{ name: 'Action', bookCount: 0, readCount: 90 }, { name: 'Fantasy', bookCount: 3, readCount: 20 }, { name: 'Mystery', bookCount: 2, readCount: 2 }];
  assert.deepEqual(helper.availableGenreShortcuts(rows, ['mystery']).map((g: any) => g.name), ['Mystery', 'Fantasy']);
  assert.equal(rows[0].name, 'Action');
});
test('taxonomy search retains selected labels while matching case and whitespace consistently', () => {
  assert.equal(typeof helper.searchGenreCatalog, 'function');
  assert.deepEqual(helper.searchGenreCatalog(['Fantasy', 'Mystery'], ['Hidden genre'], '  MYST '), ['Mystery']);
  assert.deepEqual(helper.searchGenreCatalog(['Fantasy'], ['Hidden genre'], ''), ['Hidden genre', 'Fantasy']);
});
test('recovery suggests nearby available genres and shorter words without fabricating story results', () => {
  assert.equal(typeof helper.searchRecovery, 'function');
  const rows = [{ name: 'Fantasy', bookCount: 3, readCount: 0 }, { name: 'Fantazy', bookCount: 0, readCount: 0 }];
  assert.deepEqual(helper.searchRecovery('fantazy', rows).genres.map((g: any) => g.name), ['Fantasy']);
  assert.deepEqual(helper.searchRecovery('sea of lanterns', rows).queries, ['sea', 'lanterns']);
  assert.deepEqual(helper.searchRecovery('a.', rows).queries, []);
});
