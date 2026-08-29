const toHashUrl = (path: string) => `#${path.startsWith('/') ? path : `/${path}`}`;

/** Go to the previous entry without adding a route that points back at this page. */
export const goBackOrReplace = (fallbackPath: string) => {
    if (window.history.length > 1) {
        window.history.back();
        return;
    }

    window.location.replace(toHashUrl(fallbackPath));
};

/** Complete/cancel a flow without leaving the flow page behind in history. */
export const replaceHash = (path: string) => {
    window.location.replace(toHashUrl(path));
};

/** Open a reader entry and remember the story entry that owns it. */
export const openReaderFromStory = (bookId: string, chapterIndex: number) => {
    window.location.hash = `/read/book/${bookId}/chapter/${chapterIndex}`;
    window.history.replaceState(
        { ...window.history.state, wordWeftReaderParent: bookId },
        document.title,
    );
};

/** Chapter-to-chapter movement stays within the same reader history entry. */
export const replaceReaderChapter = (bookId: string, chapterIndex: number) => {
    window.history.replaceState(
        window.history.state,
        document.title,
        toHashUrl(`/read/book/${bookId}/chapter/${chapterIndex}`),
    );
};

/** Return to the existing story entry, or replace a directly opened reader URL. */
export const returnToStory = (bookId: string) => {
    if (window.history.state?.wordWeftReaderParent === bookId && window.history.length > 1) {
        window.history.back();
        return;
    }

    replaceHash(`/book/${bookId}`);
};
