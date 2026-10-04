import test from 'node:test';
import assert from 'node:assert/strict';
import { flushHistoryState, readHistoryState, updateHistoryState } from '../utils/historyEntryState.ts';

let sequence = 0;
function browser(t: any) {
  const original = (globalThis as any).window;
  let rejected = false;
  const writes: any[] = [];
  const history = {
    state: { wordWeftEntryId: `history-unit-${++sequence}`, existing: 'keep' } as any,
    replaceState(value: any) {
      if (rejected) throw new DOMException('History write limit', 'SecurityError');
      history.state = structuredClone(value); writes.push(history.state);
    },
  };
  const location = { href: 'https://wordweft.test/category' };
  (globalThis as any).window = { history, location };
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => { rejected = false; flushHistoryState(); (globalThis as any).window = original; });
  return { history, location, writes, reject: (value: boolean) => { rejected = value; } };
}

test('scroll and typing coalesce into the latest snapshot without losing unrelated keys', t => {
  const b = browser(t);
  for (let i = 0; i < 180; i++) {
    updateHistoryState({ wordWeftScroll: { x: 0, y: i } });
    updateHistoryState({ wordWeftCatalog: { query: `draft ${i}` } });
  }
  assert.equal(b.writes.length, 0);
  assert.equal(readHistoryState().wordWeftScroll.y, 179);
  t.mock.timers.tick(500);
  assert.equal(b.writes.length, 1);
  assert.equal(b.history.state.wordWeftCatalog.query, 'draft 179');
  assert.equal(b.history.state.existing, 'keep');
});

test('unchanged state does not consume history writes', t => {
  const b = browser(t);
  updateHistoryState({ wordWeftCatalog: { genres: ['Fantasy'] } }); flushHistoryState();
  for (let i = 0; i < 150; i++) updateHistoryState({ wordWeftCatalog: { genres: ['Fantasy'] } });
  t.mock.timers.tick(1000);
  assert.equal(b.writes.length, 1);
});

test('explicit navigation flush preserves the last position before its timer', t => {
  const b = browser(t);
  updateHistoryState({ wordWeftScroll: { x: 0, y: 937 } });
  assert.equal(flushHistoryState(), true);
  assert.equal(b.history.state.wordWeftScroll.y, 937);
  t.mock.timers.tick(1000); assert.equal(b.writes.length, 1);
});

test('an outgoing pending update never overwrites a different history entry', t => {
  const b = browser(t); const outgoing = b.history.state;
  updateHistoryState({ wordWeftCatalog: { query: 'last query' }, wordWeftScroll: { x: 0, y: 491 } });
  b.history.state = { wordWeftEntryId: 'different-entry' }; b.location.href = 'https://wordweft.test/book/river';
  t.mock.timers.tick(500);
  assert.equal(b.writes.length, 0);
  assert.equal(readHistoryState().wordWeftCatalog, undefined);
  b.history.state = outgoing; b.location.href = 'https://wordweft.test/category';
  assert.equal(readHistoryState().wordWeftCatalog.query, 'last query');
  assert.equal(readHistoryState().wordWeftScroll.y, 491);
  flushHistoryState(); assert.equal(b.writes.length, 1);
});

test('clearing a pending form draft cannot resurrect it at the delayed flush', t => {
  const b = browser(t);
  updateHistoryState({ wordWeftContact: { message: 'draft' } });
  updateHistoryState({ wordWeftContact: undefined });
  t.mock.timers.tick(500);
  assert.equal(readHistoryState().wordWeftContact, undefined);
  assert.equal(b.writes.length, 0);
});

test('a native SecurityError retains optional state and retries without crashing', t => {
  const b = browser(t); b.reject(true);
  updateHistoryState({ wordWeftCatalog: { query: 'preserve this' } });
  assert.doesNotThrow(() => t.mock.timers.tick(500));
  assert.equal(readHistoryState().wordWeftCatalog.query, 'preserve this');
  b.reject(false); t.mock.timers.tick(1500);
  assert.equal(b.history.state.wordWeftCatalog.query, 'preserve this');
  assert.equal(b.writes.length, 1);
});
