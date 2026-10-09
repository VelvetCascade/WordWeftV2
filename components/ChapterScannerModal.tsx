import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Link2, Search, X } from 'lucide-react';
import type { Character } from '../types';
import { analyzeMentions } from '../utils/autoLinker';
import { CharacterSuggestionList } from './CharacterSuggestionList';
import { useCharacterSuggestions } from '../hooks/useCharacterSuggestions';
import { characterScanText, type CharacterNameDraft } from '../utils/characterRecognition';
import { useDialog } from '../hooks/useDialog';

interface ChapterScannerModalProps {
    isOpen: boolean;
    htmlContent: string;
    existingCharacters: Character[];
    onClose: () => void;
    onAddCharacters: (names: CharacterNameDraft[]) => Promise<void>;
    onApplyReplacedHtml: (newHtml: string) => void;
}

export const ChapterScannerModal: React.FC<ChapterScannerModalProps> = ({ isOpen, htmlContent, existingCharacters, onClose, onAddCharacters, onApplyReplacedHtml }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const submissionRef = useRef(false);
    const scanText = useMemo(() => isOpen ? characterScanText(htmlContent) : '', [isOpen, htmlContent]);
    const { candidates, selected, selectedNames, toggle, status, retry } = useCharacterSuggestions(isOpen, scanText, existingCharacters);
    const dialogRef = useDialog(isOpen, onClose, !isProcessing);
    const linkResult = useMemo(() => isOpen ? analyzeMentions(htmlContent, existingCharacters) : { newHtml: htmlContent, count: 0, occurrences: [] }, [isOpen, htmlContent, existingCharacters]);

    // Starting a scan resets its review; refreshing the cast must keep the current step.
    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setError('');
    }, [isOpen]);

    if (!isOpen) return null;
    const addCharacters = async () => {
        if (submissionRef.current || status !== 'ready') return;
        submissionRef.current = true;
        setIsProcessing(true);
        setError('');
        try {
            if (selected.length) await onAddCharacters(selected.map(({ name, aliases }) => ({ name, aliases })));
            setStep(2);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'The selected characters could not be added. Please try again.');
        } finally { submissionRef.current = false; setIsProcessing(false); }
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
                        <p>Review names found in dialogue and character actions. Only likely matches start selected; check the passage and identity before adding them.</p>
                        {status === 'scanning' ? <p role="status">Looking for character names…</p> : status === 'failed' ? <div className="ww-editor-scanner-empty" role="alert">The scan could not finish. Your chapter is unchanged. <button type="button" onClick={retry}>Try scanning again</button></div> : candidates.length ? <CharacterSuggestionList candidates={candidates} selectedNames={selectedNames} disabled={isProcessing} onToggle={toggle} /> : <div className="ww-editor-scanner-empty">No new character names found with enough context. You can still link your existing cast, or add a character in the story guide.</div>}
                        <small>Characters are added to this story’s guide. Nothing is linked in your text until you choose the next step.</small>
                    </> : <>
                        <p>Turn plain character names in this chapter into profiles readers can open. Newly added characters are included.</p>
                        {linkResult.occurrences.length > 0 && <ul className="ww-character-scan-occurrences" aria-label="Names to link">{linkResult.occurrences.map(occurrence => <li key={`${occurrence.name}:${occurrence.label}`}><strong>{occurrence.label}</strong><span>{occurrence.label !== occurrence.name ? ` → ${occurrence.name} · ` : ''}{occurrence.count} {occurrence.count === 1 ? 'occurrence' : 'occurrences'}</span></li>)}</ul>}
                        <div className="ww-editor-scanner-result"><Link2 size={27} aria-hidden="true" /><strong>{linkResult.count} {linkResult.count === 1 ? 'name' : 'names'} ready to link</strong><p>{linkResult.count ? 'Existing mentions and code stay as they are. Linking changes this draft and saves automatically.' : 'There are no plain names matching your cast. Add characters in the story guide or type @ to insert a mention yourself.'}</p></div>
                    </>}
                </div>
                <footer>{step === 1 ? <><button type="button" disabled={isProcessing} onClick={() => { setStep(2); setError(''); }}>Skip to linking</button><button type="button" className="ww-editor-scanner-primary" disabled={isProcessing || status !== 'ready' || (candidates.length > 0 && selected.length === 0)} onClick={addCharacters}>{isProcessing ? 'Adding…' : selected.length ? `Add ${selected.length} ${selected.length === 1 ? 'character' : 'characters'}` : 'Continue'}<ArrowRight size={17} aria-hidden="true" /></button></> : <><button type="button" onClick={() => setStep(1)}><ArrowLeft size={17} aria-hidden="true" />Back</button><button type="button" className="ww-editor-scanner-primary" onClick={() => { if (linkResult.count) onApplyReplacedHtml(linkResult.newHtml); onClose(); }}>{linkResult.count ? `Link ${linkResult.count} ${linkResult.count === 1 ? 'name' : 'names'}` : 'Done'}{linkResult.count > 0 && <Link2 size={17} aria-hidden="true" />}</button></>}</footer>
            </div>
        </div>
    );
};
