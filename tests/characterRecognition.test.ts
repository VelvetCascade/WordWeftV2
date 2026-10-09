import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanCharacterNames } from '../utils/characterRecognition.ts';

const names = async (text: string, cast: { name: string; aliases?: string[] }[] = []) => (await scanCharacterNames(text, cast)).map(candidate => candidate.name);

test('repeated sentence starters, places, headings and objects are not characters', async () => {
    assert.deepEqual(await names('Chapter One. Chapter Two. Morning was cold. Morning was silent. London was grey. London was distant. The door closed. The door opened. Silence filled the hall. Silence filled the street. The Silver Sword shone. The Silver Sword fell.'), []);
});
test('fictional names need person context, not a first-name dictionary', async () => {
    const result = await scanCharacterNames('Elaria waited by the river. Elaria carried the last letter. “Go,” Zha’ren whispered. Zha’ren nodded.');
    assert.deepEqual(new Set(result.map(item => item.name)), new Set(['Elaria', 'Zha’ren']));
    assert.ok(result.every(item => item.confidence === 'likely' && item.excerpt.includes(item.name) && item.reasons.length));
});
test('full names, titles, accents, hyphens and possessives stay intact', async () => {
    assert.deepEqual(new Set(await names('Dr. Henry Jekyll spoke. Henry Jekyll nodded. Élodie Durand replied. Jean-Luc Picard said yes. O’Connor’s hand shook. Mr. O’Connor laughed.')), new Set(['Henry Jekyll', 'Élodie Durand', 'Jean-Luc Picard', 'O’Connor']));
});
test('unique observed short forms are grouped with a full name', async () => {
    const result = await scanCharacterNames('Jon Snow whispered to Arya Stark. Jon turned. Arya answered. Snow nodded.');
    assert.deepEqual(result.map(item => item.name).sort(), ['Arya Stark', 'Jon Snow']);
    assert.deepEqual(result.find(item => item.name === 'Jon Snow')?.aliases.sort(), ['Jon', 'Snow']);
    assert.equal(result.find(item => item.name === 'Jon Snow')?.count, 3);
});
test('existing cast and aliases are excluded, including uniquely matching short forms', async () => {
    assert.deepEqual(await names('Jon Snow said yes. Jon nodded. The Fox replied. Lyra smiled.', [{ name: ' Jon Snow ', aliases: ['The Fox'] }, { name: 'Lyra' }]), []);
});
test('shared surnames are not silently assigned to one character', async () => {
    const result = await scanCharacterNames('John Smith said yes. Jane Smith replied. Smith whispered.');
    assert.ok(result.filter(item => item.name !== 'Smith').every(item => !item.aliases.includes('Smith')));
    assert.ok(result.some(item => item.name === 'Smith' && item.confidence === 'possible'));
});
test('names that are also ordinary words require person evidence', async () => {
    assert.deepEqual(await names('May I enter? May I stay? Will you go? Will you wait? Rose petals fell. Rose petals faded.'), []);
    assert.deepEqual(new Set(await names('May whispered. May nodded. Will replied. Will smiled. Rose said yes. Rose laughed.')), new Set(['May', 'Will', 'Rose']));
});
test('a named speaker can be found on their first appearance but remains opt-in', async () => {
    const result = await scanCharacterNames('“Leave,” said Vaelith.');
    assert.equal(result[0]?.name, 'Vaelith');
    assert.equal(result[0]?.confidence, 'possible');
});
test('Unicode names are preserved with English person cues', async () => {
    assert.deepEqual(new Set(await names('“Stay,” 李明 said. 李明 nodded. Анастасия whispered. Анастасия smiled.')), new Set(['李明', 'Анастасия']));
});
test('an aborted scan does not finish with stale suggestions', async () => {
    const abort = new AbortController(); abort.abort();
    await assert.rejects(scanCharacterNames('Mira said yes.', [], abort.signal), { name: 'AbortError' });
});

test('initials and surnames that are calendar words remain part of full names', async () => {
    assert.deepEqual(new Set(await names('H. Jekyll whispered. John March replied. John March smiled.')), new Set(['H. Jekyll', 'John March']));
});
test('review shows the strongest person evidence rather than an earlier modal question', async () => {
    const result = await scanCharacterNames('May I leave? A long silence filled the room before the answer came, and the fire burned down to ash. May whispered. May nodded.');
    assert.ok(result.find(item => item.name === 'May')?.excerpt.includes('May whispered'));
});

test('conflicting surname-only titles identify separate people and keep bare surnames uncertain', async () => {
    const result = await scanCharacterNames('Mr. Bennet said yes. Mr. Bennet smiled. Mrs. Bennet replied. Mrs. Bennet nodded. Bennet whispered. Bennet laughed.');
    assert.deepEqual(result.map(item => item.name).sort(), ['Bennet', 'Mr. Bennet', 'Mrs. Bennet']);
    assert.ok(result.filter(item => item.name !== 'Bennet').every(item => !item.aliases.includes('Bennet')));
    assert.equal(result.find(item => item.name === 'Bennet')?.confidence, 'possible');
});

test('ordinary calendar words can still be real character names when person context supports them', async () => {
    assert.deepEqual(await names('Summer was hot. Summer was long. April was cold. April was wet. June was dry. June was short.'), []);
    assert.deepEqual(new Set(await names('April whispered. April nodded. Summer replied. Summer smiled. June asked. June laughed.')), new Set(['April', 'Summer', 'June']));
    assert.deepEqual(new Set(await names('Summer Jones whispered. Summer Jones nodded. April Smith replied. April Smith smiled.')), new Set(['Summer Jones', 'April Smith']));
});
test('a titled family member is not silently merged into another person with that surname', async () => {
    const result = await scanCharacterNames('William Lucas said yes. William Lucas nodded. Mrs. Lucas replied. Mrs. Lucas smiled.');
    assert.deepEqual(result.map(item => item.name).sort(), ['Mrs. Lucas', 'William Lucas']);
    assert.ok(!result.find(item => item.name === 'William Lucas')?.aliases.includes('Lucas'));
    assert.equal(result.find(item => item.name === 'Mrs. Lucas')?.confidence, 'possible');
});

test('a titled new family member can be reviewed when a full-name character already exists', async () => {
    const result = await scanCharacterNames('Mrs. Lucas replied. Mrs. Lucas smiled.', [{ name: 'William Lucas' }]);
    assert.equal(result[0]?.name, 'Mrs. Lucas');
    assert.equal(result[0]?.confidence, 'possible');
});

test('repeated person-name matches without explicit actions can be reviewed but are not preselected', async () => {
    const result = await scanCharacterNames('Elizabeth was at the window. Elizabeth was beside the hearth.');
    assert.equal(result[0]?.name, 'Elizabeth'); assert.equal(result[0]?.confidence, 'possible');
});

test('an existing surname alias cannot hide a new titled family member', async () => {
    const result = await scanCharacterNames('Mrs. Lucas replied. Mrs. Lucas smiled.', [{ name: 'William Lucas', aliases: ['Lucas'] }]);
    assert.equal(result[0]?.name, 'Mrs. Lucas'); assert.equal(result[0]?.confidence, 'possible');
    assert.deepEqual(new Set(await names('Spring Adams said yes. Spring Adams smiled.')), new Set(['Spring Adams']));
});
