export type EditorImageAlignment = 'left' | 'center' | 'right';
export type ImageResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const normalizeImageWidth = (value: unknown, fallback = 75): number => {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(25, Math.min(100, Math.round(numeric)));
};

export const imageOffsetForAlignment = (width: unknown, alignment: EditorImageAlignment): number => {
    const normalizedWidth = normalizeImageWidth(width);
    if (alignment === 'left') return 0;
    if (alignment === 'right') return 100 - normalizedWidth;
    return (100 - normalizedWidth) / 2;
};

export const normalizeImageOffset = (value: unknown, width: unknown, fallback?: number): number => {
    const normalizedWidth = normalizeImageWidth(width);
    const hasValue = value !== undefined && value !== null && value !== '';
    const numeric = hasValue ? (typeof value === 'number' ? value : Number(value)) : Number.NaN;
    const safeFallback = Number.isFinite(fallback) ? Number(fallback) : (100 - normalizedWidth) / 2;
    return Math.max(0, Math.min(100 - normalizedWidth, Number.isFinite(numeric) ? numeric : safeFallback));
};

export const imageLayoutStyle = (width: unknown, alignment: EditorImageAlignment, offset?: unknown) => {
    const normalizedWidth = normalizeImageWidth(width);
    const hasCustomOffset = offset !== undefined && offset !== null && offset !== '' && Number.isFinite(Number(offset));
    if (hasCustomOffset) {
        return {
            width: `${normalizedWidth}%`,
            marginLeft: `${normalizeImageOffset(offset, normalizedWidth)}%`,
            marginRight: 'auto',
        };
    }
    return {
        width: `${normalizedWidth}%`,
        marginLeft: alignment === 'left' ? '0' : 'auto',
        marginRight: alignment === 'right' ? '0' : 'auto',
    };
};

interface ResizeImageWidthOptions {
    direction: ImageResizeDirection;
    startWidth: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    editorWidth: number;
    imageAspectRatio: number;
    startOffset?: number;
}

export interface EditorImageLayout {
    width: number;
    offset: number;
}

export const resizeImageLayout = ({
    direction,
    startWidth,
    startOffset = (100 - startWidth) / 2,
    startX,
    startY,
    currentX,
    currentY,
    editorWidth,
    imageAspectRatio,
}: ResizeImageWidthOptions): EditorImageLayout => {
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
    const widthDelta = (dominantPixels / safeEditorWidth) * 100;
    const startLeft = normalizeImageOffset(startOffset, startWidth);
    const startRight = startLeft + normalizeImageWidth(startWidth);
    const startCenter = startLeft + (normalizeImageWidth(startWidth) / 2);
    const maximumWidth = direction.includes('w')
        ? startRight
        : direction.includes('e')
            ? 100 - startLeft
            : Math.min(startCenter, 100 - startCenter) * 2;
    const width = Math.max(25, Math.min(maximumWidth, normalizeImageWidth(startWidth + widthDelta)));
    const offset = direction.includes('w')
        ? startRight - width
        : direction.includes('e')
            ? startLeft
            : startCenter - (width / 2);

    return {
        width,
        offset: normalizeImageOffset(offset, width),
    };
};

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
    startOffset,
}: ResizeImageWidthOptions): number => {
    return resizeImageLayout({
        direction,
        startWidth,
        startOffset,
        startX,
        startY,
        currentX,
        currentY,
        editorWidth,
        imageAspectRatio,
    }).width;
};
