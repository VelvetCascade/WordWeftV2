export const MOODS = ['romantic', 'tense', 'melancholy', 'triumphant', 'eerie', 'serene'] as const;
export type MoodType = typeof MOODS[number];
export type AtmosphereIntensity = 'full' | 'subtle' | 'off';
export const isMood = (value: unknown): value is MoodType => MOODS.includes(value as MoodType);
export const readAtmosphereIntensity = (value: unknown): AtmosphereIntensity => value === 'subtle' || value === 'off' ? value : 'full';

/** The passage at the reading line wins, including long passages. Gaps stay neutral. */
export function moodAtReadingLine(blocks: Array<{ mood: string | null; top: number; bottom: number }>, line: number): MoodType | null {
    const block = blocks.filter(block => isMood(block.mood) && block.top <= line && block.bottom > line)
        .sort((a, b) => (a.bottom - a.top) - (b.bottom - b.top))[0];
    return block && isMood(block.mood) ? block.mood : null;
}
