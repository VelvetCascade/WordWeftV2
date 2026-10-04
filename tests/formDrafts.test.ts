import test from 'node:test';
import assert from 'node:assert/strict';
import { createFormDraftStore, formDraftKey } from '../utils/formDrafts.ts';

const valid = (value: unknown): value is {title:string} => !!value && typeof (value as any).title === 'string';
function storage() {
    const values = new Map<string,string>();
    return { values, getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => { values.set(key,value); }, removeItem:(key:string)=>{values.delete(key);} };
}
test('recoverable drafts survive remount and remain scoped to their owner and journey', () => {
    const device = storage();
    const first = createFormDraftStore(device);
    first.save('writer', 'new-story', {title:'The crossing'});
    const next = createFormDraftStore(device);
    assert.equal(next.load('writer','new-story',valid)?.value.title, 'The crossing');
    assert.equal(next.load('reader','new-story',valid), null);
    assert.equal(next.load('writer','community-post',valid), null);
    next.remove('writer','new-story');
    assert.equal(next.load('writer','new-story',valid), null);
});
test('blocked storage keeps an honest tab-only recovery rather than throwing', () => {
    const store = createFormDraftStore({getItem(){throw new Error('blocked')},setItem(){throw new Error('quota')},removeItem(){throw new Error('blocked')}});
    assert.equal(store.save('writer','story',{title:'Kept here'}), 'tab');
    assert.equal(store.load('writer','story',valid)?.value.title,'Kept here');
    store.remove('writer','story');
    assert.equal(store.load('writer','story',valid), null);
});
test('corrupt and incompatible stored drafts cannot crash the form', () => {
    const device=storage();
    device.setItem(formDraftKey('writer','story'), '{broken');
    const store=createFormDraftStore(device);
    assert.equal(store.load('writer','story',valid),null);
    device.setItem(formDraftKey('writer','story'),JSON.stringify({version:1,savedAt:Date.now(),value:{title:3}}));
    assert.equal(store.load('writer','story',valid),null);
});

test('a stale tab retains its own copy without replacing newer canonical work', () => {
    const device = storage();
    const first = createFormDraftStore(device, 'first');
    const other = createFormDraftStore(device, 'other');
    first.save('writer', 'story', { title: 'Original' });
    const original = first.revision('writer', 'story');
    other.saveIfCurrent('writer', 'story', { title: 'Newer' }, original);
    const result = first.saveIfCurrent('writer', 'story', { title: 'My alternate' }, original);
    assert.equal(result.conflict, true);
    assert.equal(other.loadStored('writer', 'story', valid)?.value.title, 'Newer');
    assert.equal(first.load('writer', 'story', valid)?.value.title, 'My alternate');
    assert.equal(createFormDraftStore(device, 'first').load('writer', 'story', valid)?.conflict, true);
});
test('submission tombstones reject stale writes and preserve newer drafts from other tabs', () => {
    const device = storage(); const first = createFormDraftStore(device, 'first'); const other = createFormDraftStore(device, 'other');
    first.save('writer', 'story', { title: 'Original' });
    const original = first.revision('writer', 'story');
    other.removeIfCurrent('writer', 'story', original);
    assert.equal(first.saveIfCurrent('writer', 'story', { title: 'Stale copy' }, original).conflict, true);
    assert.equal(other.loadStored('writer', 'story', valid), null);
    other.save('writer', 'story', { title: 'New session' });
    first.removeIfCurrent('writer', 'story', original);
    assert.equal(other.loadStored('writer', 'story', valid)?.value.title, 'New session');
});

test('a tab-only fallback cannot hide a newer durable draft after storage recovers', () => {
    const device = storage(); let quota = false;
    const failing = { ...device, setItem: (key: string, value: string) => { if (quota) throw new Error('quota'); device.setItem(key, value); } };
    const first = createFormDraftStore(failing, 'first'); const other = createFormDraftStore(device, 'other');
    first.save('writer', 'story', { title: 'Original' });
    const original = first.revision('writer', 'story'); quota = true;
    const local = first.saveIfCurrent('writer', 'story', { title: 'Tab only' }, original);
    assert.equal(local.location, 'tab'); assert.equal(first.load('writer', 'story', valid)?.location, 'tab');
    quota = false; other.saveIfCurrent('writer', 'story', { title: 'Newer durable' }, original);
    assert.equal(first.saveIfCurrent('writer', 'story', { title: 'Next local edit' }, local.revision).conflict, true);
    assert.equal(other.loadStored('writer', 'story', valid)?.value.title, 'Newer durable');
});

test('remount detects newer durable work behind a tab-only copy', () => {
    const device = storage(); let quota = false;
    const failing = { ...device, setItem: (key: string, value: string) => { if (quota) throw new Error('quota'); device.setItem(key, value); } };
    const first = createFormDraftStore(failing, 'first'); const other = createFormDraftStore(device, 'other');
    first.save('writer', 'story', { title: 'Original' }); const original = first.revision('writer', 'story');
    quota = true; first.saveIfCurrent('writer', 'story', { title: 'Kept only here' }, original);
    quota = false; other.saveIfCurrent('writer', 'story', { title: 'Other durable version' }, original);
    const recovered = first.load('writer', 'story', valid);
    assert.equal(recovered?.value.title, 'Kept only here'); assert.equal(recovered?.conflict, true); assert.equal(recovered?.location, 'tab');
    first.removeCopy('writer', 'story');
    assert.equal(first.load('writer', 'story', valid)?.value.title, 'Other durable version');
});
test('new document identities preserve distinct alternate versions through repeated reloads', () => {
    const device = storage(); const first = createFormDraftStore(device, 'parent');
    first.save('writer', 'story', { title: 'Original' }); const original = first.revision('writer', 'story');
    const other = createFormDraftStore(device, 'other'); other.saveIfCurrent('writer', 'story', { title: 'Newest canonical' }, original);
    first.saveIfCurrent('writer', 'story', { title: 'Parent alternate' }, original);
    const child = createFormDraftStore(device, 'child', 'parent');
    assert.equal(child.load('writer', 'story', valid)?.value.title, 'Parent alternate');
    child.saveIfCurrent('writer', 'story', { title: 'Child alternate' }, original);
    assert.equal(first.load('writer', 'story', valid)?.value.title, 'Parent alternate');
    const reload = createFormDraftStore(device, 'reload', 'child');
    assert.equal(reload.load('writer', 'story', valid)?.value.title, 'Child alternate');
    const again = createFormDraftStore(device, 'again', 'reload');
    assert.equal(again.load('writer', 'story', valid)?.value.title, 'Child alternate');
});
