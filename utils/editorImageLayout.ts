export type EditorImageAlignment = 'left' | 'center' | 'right';

export const normalizeImageWidth = (value: unknown, fallback = 75): number => {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(25, Math.min(100, Math.round(numeric)));
};

export const imageLayoutStyle = (width: unknown, alignment: EditorImageAlignment) => ({
    width: `${normalizeImageWidth(width)}%`,
    marginLeft: alignment === 'left' ? '0' : 'auto',
    marginRight: alignment === 'right' ? '0' : 'auto',
});
