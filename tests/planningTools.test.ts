import test from 'node:test';
import assert from 'node:assert/strict';
import { copyPlanningDraft } from '../utils/planningTools.ts';
import { filterWriterComments, writerCommentPath } from '../utils/writerComments.ts';
import type { ReaderComment } from '../utils/writerComments.ts';

test('editing a planning draft cannot mutate the saved record on cancel', () => {
  const saved = { name: 'Lyra', characterIds: ['one'] };
  const draft = copyPlanningDraft(saved);
  draft.name = 'Edited'; draft.characterIds.push('two');
  assert.deepEqual(saved, { name: 'Lyra', characterIds: ['one'] });
});
const thread = (id:string, overrides = {}): ReaderComment => ({ id, bookId:'book', chapterId:'chapter', bookTitle:'Story', chapterTitle:'Chapter', userId:'reader', user:{id:'reader',name:'Reader',avatarUrl:''}, parentId:null, paragraphIndex:null, content:'Thought', createdAt:'2026-10-01T00:00:00Z', ...overrides });
test('inbox replied status means a reply from this writer, not any reader', () => {
 const comments = [thread('one'),thread('two'), thread('reply',{parentId:'one'}),thread('writer-reply',{parentId:'two',userId:'writer'})];
 assert.deepEqual(filterWriterComments(comments,'writer','unanswered').map(x=>x.id),['one']);
 assert.deepEqual(filterWriterComments(comments,'writer','replied').map(x=>x.id),['two']);
});
test('New includes threads with reader activity after last inbox visit, and story filter applies',()=>{
 const comments=[thread('old'), thread('new',{bookId:'other',createdAt:'2026-10-03T00:00:00Z'}),thread('reply',{parentId:'old',createdAt:'2026-10-03T00:00:00Z'})];
 assert.deepEqual(filterWriterComments(comments,'writer','new','book','2026-10-02T00:00:00Z').map(x=>x.id),['old']);
});
test('paragraph zero produces an exact passage link and chapter threads retain chapter context',()=>{
 assert.equal(writerCommentPath(thread('one',{paragraphIndex:0})), '/book/book/chapter/chapter?paragraph=0');
 assert.equal(writerCommentPath(thread('two')), '/book/book/chapter/chapter');
});
