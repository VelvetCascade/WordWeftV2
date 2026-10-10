export type LampReadingMode = 'off' | 'reading' | 'pointer';
export function readLampMode(value: unknown): LampReadingMode {
    return value === 'reading' || value === 'pointer' ? value : 'off';
}
