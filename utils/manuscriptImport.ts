const MAX_MANUSCRIPT_BYTES = 5 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'docx']);

export function validateManuscriptFile(filename: string, size: number): void {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
        throw new Error('Choose a TXT, MD, or DOCX manuscript.');
    }
    if (size <= 0) {
        throw new Error('Choose a manuscript that contains text.');
    }
    if (size > MAX_MANUSCRIPT_BYTES) {
        throw new Error('Manuscripts must be 5 MB or smaller.');
    }
}
