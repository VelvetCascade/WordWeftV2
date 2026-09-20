export type EditorImageAlignment = 'left' | 'center' | 'right';
export type ImageResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

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

interface ResizeImageWidthOptions {
    direction: ImageResizeDirection;
    startWidth: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    editorWidth: number;
    imageAspectRatio: number;
}

/**
 * Converts a pointer movement from any edge/corner into the percentage width
 * stored in the document. Images remain proportional and portable between the
 * editor and reader instead of persisting device-specific pixel dimensions.
 */
export const resizeImageWidth = ({
    direction,
    startWidth,
    startX,
    startY,
    currentX,
    currentY,
    editorWidth,
    imageAspectRatio,
}: ResizeImageWidthOptions): number => {
    const safeEditorWidth = Math.max(1, editorWidth);
    const horizontalPixels = direction.includes('e')
        ? currentX - startX
        : direction.includes('w')
            ? startX - currentX
            : 0;
    const verticalPixels = direction.includes('s')
        ? (currentY - startY) * imageAspectRatio
        : direction.includes('n')
            ? (startY - currentY) * imageAspectRatio
            : 0;
    const dominantPixels = Math.abs(horizontalPixels) >= Math.abs(verticalPixels)
        ? horizontalPixels
        : verticalPixels;

    return normalizeImageWidth(startWidth + ((dominantPixels / safeEditorWidth) * 100));
};
