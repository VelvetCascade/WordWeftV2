import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Link2, Search, X } from 'lucide-react';
import type { Character } from '../types';
import { analyzeMentions } from '../utils/autoLinker';
import { useDialog } from '../hooks/useDialog';

interface ChapterScannerModalProps {
    isOpen: boolean;
    htmlContent: string;
    existingCharacters: Character[];
    onClose: () => void;
    onAddCharacters: (names: string[]) => Promise<void>;
    onApplyReplacedHtml: (newHtml: string) => void;
}

export const ChapterScannerModal: React.FC<ChapterScannerModalProps> = ({ isOpen, htmlContent, existingCharacters, onClose, onAddCharacters, onApplyReplacedHtml }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [potentialNames, setPotentialNames] = useState<string[]>([]);
    const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const sourceRef = useRef({ htmlContent, existingCharacters });
    sourceRef.current = { htmlContent, existingCharacters };
    const dialogRef = useDialog(isOpen, onClose, !isProcessing);
    const linkResult = useMemo(() => isOpen ? analyzeMentions(htmlContent, existingCharacters) : { newHtml: htmlContent, count: 0, occurrences: [] }, [isOpen, htmlContent, existingCharacters]);

    // Starting a scan resets its review; refreshing the cast must keep the current step.
    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setError('');
        const source = sourceRef.current;
        const document = new DOMParser().parseFromString(source.htmlContent, 'text/html');
        document.querySelectorAll('code,pre,[data-type="mention"],.mention').forEach(element => element.remove());
        const commonWords = new Set(['The', 'A', 'An', 'He', 'She', 'It', 'They', 'We', 'I', 'You', 'But', 'And', 'Or', 'So', 'Because', 'At', 'In', 'On', 'For', 'With', 'To', 'From']);
        const existingNames = new Set(source.existingCharacters.flatMap(character => [character.name, ...(character.aliases || [])]).map(name => name.toLowerCase()));
        const matches = (document.body.textContent || '').match(/\b[A-Z][a-z]+\b/g) || [];
        const counts = new Map<string, number>();
        for (const word of matches) if (!commonWords.has(word) && !existingNames.has(word.toLowerCase())) counts.set(word, (counts.get(word) || 0) + 1);
        const extracted = [...counts].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).map(([word]) => word).slice(0, 8);
        setPotentialNames(extracted);
        setSelectedNames(new Set(extracted));
    }, [isOpen]);

    if (!isOpen) return null;
    const existingNames = new Set(existingCharacters.flatMap(character => [character.name, ...(character.aliases || [])]).map(name => name.toLowerCase()));
    const candidates = potentialNames.filter(name => !existingNames.has(name.toLowerCase()));
    const selected = candidates.filter(name => selectedNames.has(name));
    const toggleName = (name: string) => setSelectedNames(previous => { const next = new Set(previous); if (next.has(name)) next.delete(name); else next.add(name); return next; });

    const addCharacters = async () => {
        setIsProcessing(true);
        setError('');
        try {
            if (selected.length) await onAddCharacters(selected);
            setStep(2);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'The selected characters could not be added. Please try again.');
        } finally { setIsProcessing(false); }
    };

    return (
        <div className="ww-editor-scanner-backdrop" onMouseDown={event => event.target === event.currentTarget && !isProcessing && onClose()}>
            <div className="ww-editor-scanner" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="character-scan-title" tabIndex={-1}>
                <header><div><span className="ww-studio-eyebrow">YOUR CHAPTER’S CAST</span><h2 id="character-scan-title"><Search size={22} aria-hidden="true" />Scan for characters</h2></div><button type="button" onClick={onClose} disabled={isProcessing} aria-label="Close character scan"><X size={21} aria-hidden="true" /></button></header>
                <div className="ww-editor-scanner-content">
                    <span className="ww-editor-scanner-step">Step {step} of 2</span>
                    <h3 aria-live="polite">{step === 1 ? 'Review suggested characters' : 'Link character names'}</h3>
                    {error && <p className="ww-editor-scanner-error" role="alert"><AlertTriangle size={18} aria-hidden="true" />{error}</p>}
                    {step === 1 ? <>
                        <p>The scan looks for names repeated in this chapter. Some suggestions may be ordinary words; select only the characters you want to add.</p>
                        {candidates.length ? <div className="ww-editor-scanner-names">{candidates.map(name => <button type="button" key={name} aria-pressed={selectedNames.has(name)} disabled={isProcessing} onClick={() => toggleName(name)}>{selectedNames.has(name) && <Check size={16} aria-hidden="true" />}{name}</button>)}</div> : <div className="ww-editor-scanner-empty">No new repeated names found. You can still link names already in your cast.</div>}
                        <small>Characters are added to this story’s guide. Nothing is linked in your text until you choose the next step.</small>
                    </> : <>
                        <p>Turn plain character names in this chapter into profiles readers can open. Newly added characters are included.</p>
                        {linkResult.occurrences.length > 0 && <ul className="ww-character-scan-occurrences" aria-label="Names to link">{linkResult.occurrences.map(occurrence => <li key={`${occurrence.name}:${occurrence.label}`}><strong>{occurrence.label}</strong><span>{occurrence.label !== occurrence.name ? ` → ${occurrence.name} · ` : ''}{occurrence.count} {occurrence.count === 1 ? 'occurrence' : 'occurrences'}</span></li>)}</ul>}
                        <div className="ww-editor-scanner-result"><Link2 size={27} aria-hidden="true" /><strong>{linkResult.count} {linkResult.count === 1 ? 'name' : 'names'} ready to link</strong><p>{linkResult.count ? 'Existing mentions and code stay as they are. Linking changes this draft and saves automatically.' : 'There are no plain names matching your cast. Add characters in the story guide or type @ to insert a mention yourself.'}</p></div>
                    </>}
                </div>
                <footer>{step === 1 ? <><button type="button" disabled={isProcessing} onClick={() => { setStep(2); setError(''); }}>Skip to linking</button><button type="button" className="ww-editor-scanner-primary" disabled={isProcessing || (candidates.length > 0 && selected.length === 0)} onClick={addCharacters}>{isProcessing ? 'Adding…' : selected.length ? `Add ${selected.length} ${selected.length === 1 ? 'character' : 'characters'}` : 'Continue'}<ArrowRight size={17} aria-hidden="true" /></button></> : <><button type="button" onClick={() => setStep(1)}><ArrowLeft size={17} aria-hidden="true" />Back</button><button type="button" className="ww-editor-scanner-primary" onClick={() => { if (linkResult.count) onApplyReplacedHtml(linkResult.newHtml); onClose(); }}>{linkResult.count ? `Link ${linkResult.count} ${linkResult.count === 1 ? 'name' : 'names'}` : 'Done'}{linkResult.count > 0 && <Link2 size={17} aria-hidden="true" />}</button></>}</footer>
            </div>
        </div>
    );
};
