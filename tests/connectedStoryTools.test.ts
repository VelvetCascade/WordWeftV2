import test from 'node:test';
import assert from 'node:assert/strict';
import { readLampMode } from '../utils/lampReading.ts';
import { previewBibleEntries, bibleLinksValid } from '../utils/storyBible.ts';
import { chapterTimeline, chronologyTimeline } from '../utils/storyTimeline.ts';
import { isCompatibleForm } from '../utils/formDrafts.ts';
import type { Chapter, Scene, StoryBibleEntry } from '../types.ts';

const chapters = [{ id:'one',title:'Beginning',status:'published' }, { id:'draft',title:'Hidden',status:'draft' }, { id:'two',title:'Return',status:'published' }] as Chapter[];
const entry = (id:string, revealChapterId:string|null=null, visibility:'PUBLIC'|'PRIVATE'='PUBLIC'):StoryBibleEntry => ({id,bookId:'story',kind:'LORE',title:id,detail:'World detail',characterIds:[],revealChapterId,visibility});
const scene = (id:string,chapterId?:string,chronologyOrder?:number|null):Scene => ({id,bookId:'story',title:id,description:'',setting:'',time:'',characterIds:[],chapterId,chronologyOrder});
test('Lamp Reading only restores recognized modes, treating corrupt preferences as off',()=>{
  assert.equal(readLampMode('pointer'),'pointer'); assert.equal(readLampMode('reading'),'reading');
  for(const value of [null,undefined,{},'unknown',true,2])assert.equal(readLampMode(value),'off');
});
test('writer reader-preview hides private, draft and deleted reveals and uses published chapter order',()=>{
  const entries=[entry('start'),entry('first','one'),entry('second','two'),entry('draft','draft'),entry('gone','gone'),entry('private',null,'PRIVATE')];
  assert.deepEqual(previewBibleEntries(entries,chapters,'').map(x=>x.id),['start']);
  assert.deepEqual(previewBibleEntries(entries,chapters,'one').map(x=>x.id),['start','first']);
  assert.deepEqual(previewBibleEntries(entries,chapters,'two').map(x=>x.id),['start','first','second']);
  assert.deepEqual(previewBibleEntries(entries,chapters,'draft').map(x=>x.id),['start']);
});
test('relationship links require two distinct cast members, while lore can stand alone',()=>{
  assert.equal(bibleLinksValid('RELATIONSHIP',['a','a']),false);
  assert.equal(bibleLinksValid('RELATIONSHIP',['a','b']),true);
  assert.equal(bibleLinksValid('RELATIONSHIP',['a','b','c']),false);
  assert.equal(bibleLinksValid('MOTIVATION',[]),false);assert.equal(bibleLinksValid('CHARACTER',['a']),true);
  assert.equal(bibleLinksValid('LORE',[]),true);
});
test('chapter map preserves manuscript order and separates initial lore from unavailable associations',()=>{
  const groups=chapterTimeline([scene('flashback','two',-3),scene('lost','deleted'),scene('free')],chapters,[entry('initial'),entry('later','two'),entry('removed','deleted')]);
  assert.deepEqual(groups.filter(x=>x.chapter).map(x=>x.id),['one','draft','two']);
  assert.deepEqual(groups[3].scenes.map(x=>x.id),['flashback']);
  assert.deepEqual(groups[0].entries.map(x=>x.id),['initial']);
  assert.deepEqual(groups[4].scenes.map(x=>x.id),['lost','free']);
  assert.deepEqual(groups[4].entries.map(x=>x.id),['removed']);
});
test('chronology handles flashbacks, zero and simultaneous events without mutating scenes',()=>{
  const scenes=[scene('later','one',3),scene('origin','two',-2),scene('parallel-b','one',0),scene('parallel-a','two',0),scene('unplaced'),scene('null',undefined,null)];
  const result=chronologyTimeline(scenes);
  assert.deepEqual(result.ordered.map(x=>x.id),['origin','parallel-a','parallel-b','later']);
  assert.deepEqual(result.unplaced.map(x=>x.id),['unplaced','null']);assert.equal(scenes[0].id,'later');
});
test('older scene drafts remain recoverable, but corrupt new fields and missing old fields are rejected',()=>{
  const defaults={title:'',characterIds:[] as string[],kind:'SCENE',chronologyOrder:''};
  const optional:('kind'|'chronologyOrder')[]=['kind','chronologyOrder'];
  assert.equal(isCompatibleForm(defaults,{title:'Kept',characterIds:[]},optional),true);
  assert.equal(isCompatibleForm(defaults,{title:'Kept',characterIds:[],chronologyOrder:12},optional),false);
  assert.equal(isCompatibleForm(defaults,{title:'Kept'},optional),false);
});
