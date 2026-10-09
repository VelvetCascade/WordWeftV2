import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPlanningCharacters, filterPlanningScenes, filterPlanningNotes, parseCharacterAliases } from '../utils/planningSearch.ts';
import type { Character, Chapter, Note, Scene } from '../types.ts';

const character = (id: string, name: string, extra = {}): Character & { aliases?: string[] } => ({ id, name, bookId:'book', role:'Navigator', description:'A cautious captain', goal:'Find home', imageUrl:'', ...extra });
const cast = [character('one','Lyra',{aliases:['The Fox'],descriptionVisibility:'PRIVATE',goalVisibility:'PRIVATE'}),character('two','Cass',{descriptionVisibility:'PUBLIC',goalVisibility:'PUBLIC'})];
const chapters = [{id:'draft',title:'The Crossing',status:'draft'},{id:'released',title:'The Arrival',status:'published'}] as Chapter[];
const scenes: Scene[] = [{id:'one',bookId:'book',title:'Storm',description:'The ship turns',setting:'Ocean',time:'Night',chapterId:'draft',characterIds:['one']},{id:'two',bookId:'book',title:'Landfall',description:'',setting:'Shore',time:'Dawn',chapterId:'released',characterIds:['two']},{id:'three',bookId:'book',title:'Outline',description:'',setting:'',time:'',characterIds:[]}];

test('aliases trim and deduplicate without losing the writer’s chosen spelling',()=>{
    assert.deepEqual(parseCharacterAliases(' The Fox, Ly, the fox, , LY, Captain '),['The Fox','Ly','Captain']);
});
test('character search finds aliases and combines with field visibility',()=>{
    assert.deepEqual(filterPlanningCharacters(cast,' fox ','private').map(c=>c.id),['one']);
    assert.deepEqual(filterPlanningCharacters(cast,'fox','public'),[]);
    assert.deepEqual(filterPlanningCharacters(cast,'captain','public').map(c=>c.id),['two']);
});
test('scene search includes linked chapter and character and applies both association filters',()=>{
    assert.deepEqual(filterPlanningScenes(scenes,'crossing','draft','one',chapters,cast).map(s=>s.id),['one']);
    assert.deepEqual(filterPlanningScenes(scenes,'LYRA','','',chapters,cast).map(s=>s.id),['one']);
    assert.deepEqual(filterPlanningScenes(scenes,'','released','one',chapters,cast),[]);
    assert.deepEqual(filterPlanningScenes(scenes,'','unlinked','',chapters,cast).map(s=>s.id),['three']);
});
test('story-wide notes exclude chapter records returned by book collection; chapter scopes remain isolated',()=>{
    const notes: Note[]=[{id:'story',bookId:'book',title:'Research',content:'Ship names'},{id:'draft',bookId:'book',chapterId:'draft',title:'Research',content:'Fox reveal'},{id:'other',bookId:'book',chapterId:'released',title:'Research',content:'Arrival'}];
    assert.deepEqual(filterPlanningNotes(notes,' research ').map(n=>n.id),['story']);
    assert.deepEqual(filterPlanningNotes(notes,'fox','draft').map(n=>n.id),['draft']);
    assert.deepEqual(filterPlanningNotes(notes,'ship','draft'),[]);
});
