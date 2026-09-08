export const newUploadReference = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};
export const uploadErrorMessage = (status?: number, providerMessage?: string) => {
    const detail = (providerMessage || '').toLowerCase();
    if (status === 401 || status === 403 || detail.includes('signature') || detail.includes('token')) {
        return 'The secure upload session expired. Please try the image again.';
    }
    if (status === 413 || detail.includes('too large') || detail.includes('file size')) {
        return 'This image is still too large after processing. Try a smaller image.';
    }
    if (status === 429 || detail.includes('rate limit')) {
        return 'Image uploads are busy right now. Wait a moment, then retry.';
    }
    if (detail.includes('network') || detail.includes('failed to fetch')) {
        return 'The upload could not reach the image service. Check your connection and retry.';
    }
    return 'The image could not be uploaded. Please retry or choose a different JPG, PNG, WEBP, or GIF.';
};
