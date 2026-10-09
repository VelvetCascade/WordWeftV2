import type { Character, Chapter, Note, Scene } from '../types';

export function parseCharacterAliases(value: string): string[] {
    const seen = new Set<string>();
    return value.split(',').map(alias => alias.trim()).filter(alias => {
        if (!alias || seen.has(alias.toLocaleLowerCase())) return false;
        seen.add(alias.toLocaleLowerCase()); return true;
    });
}
const matches = (query: string, values: unknown[]) => values.filter(Boolean).join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
export function filterPlanningCharacters(characters: (Character & { aliases?: string[] })[], query: string, visibility = 'all') {
    return characters.filter(character => matches(query, [character.name, character.role, character.description, character.goal, ...(character.aliases || [])]) &&
        (visibility === 'all' || (visibility === 'public' ? character.descriptionVisibility !== 'PRIVATE' || character.goalVisibility === 'PUBLIC' : character.descriptionVisibility === 'PRIVATE' || character.goalVisibility !== 'PUBLIC')));
}
export function filterPlanningScenes(scenes: Scene[], query: string, chapterId: string, characterId: string, chapters: Chapter[], characters: Character[]) {
    return scenes.filter(scene => (!chapterId || (chapterId === 'unlinked' ? !scene.chapterId : scene.chapterId === chapterId)) &&
        (!characterId || scene.characterIds?.includes(characterId)) && matches(query, [scene.title, scene.description, scene.setting, scene.time,
            chapters.find(chapter => chapter.id === scene.chapterId)?.title, ...(scene.characterIds || []).map(id => characters.find(character => character.id === id)?.name)]));
}
export function filterPlanningNotes(notes: Note[], query: string, chapterId?: string) {
    return notes.filter(note => (chapterId ? note.chapterId === chapterId : !note.chapterId) && matches(query, [note.title, note.content]));
}
