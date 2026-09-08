export interface ReadingBounds {
    contentTop: number;
    contentHeight: number;
    viewportHeight: number;
    scrollY: number;
}

/** Calculates progress through the manuscript itself, not comments/footer UI. */
export const manuscriptProgress = ({ contentTop, contentHeight, viewportHeight, scrollY }: ReadingBounds) => {
    const readableDistance = Math.max(0, contentHeight - viewportHeight);
    if (readableDistance === 0) return scrollY >= contentTop ? 100 : 0;
    const travelled = scrollY - contentTop;
    return Math.min(100, Math.max(0, (travelled / readableDistance) * 100));
};
