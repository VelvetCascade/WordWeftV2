export type ImportProgressPhase = 'uploading' | 'processing';

export interface ImportProgressState {
    phase: ImportProgressPhase;
    percent: number;
    elapsedSeconds: number;
}

export const importProgressCopy = ({ phase, percent, elapsedSeconds }: ImportProgressState) => {
    if (phase === 'uploading') {
        const bounded = Math.max(0, Math.min(100, Math.round(percent)));
        return {
            title: 'Uploading manuscript',
            detail: `${bounded}% uploaded`,
            percent: bounded,
            determinate: true,
        };
    }

    return {
        title: 'Building your chapters',
        detail: `Reading structure, uploading embedded images, and saving private drafts · ${Math.max(0, Math.floor(elapsedSeconds))}s elapsed`,
        percent: null,
        determinate: false,
    };
};
