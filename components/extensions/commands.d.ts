import '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        details: {
            setDetails: () => ReturnType;
            unsetDetails: () => ReturnType;
        };
        footnote: {
            insertFootnote: (attrs: { note: string }) => ReturnType;
        };
        moodBlock: {
            setMoodBlock: (mood: string) => ReturnType;
            unsetMoodBlock: () => ReturnType;
            endMoodBlock: () => ReturnType;
            insertMoodBlock: (mood: string) => ReturnType;
        };
        pullQuote: {
            insertPullQuote: () => ReturnType;
        };
        spoiler: {
            toggleSpoiler: () => ReturnType;
        };
    }
}

