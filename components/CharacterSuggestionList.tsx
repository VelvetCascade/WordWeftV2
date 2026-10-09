import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';
import type { CharacterCandidate } from '../utils/characterRecognition';

export function CharacterSuggestionList({ candidates, selectedNames, disabled, onToggle }: { candidates: CharacterCandidate[]; selectedNames: Set<string>; disabled: boolean; onToggle: (name: string) => void }) {
    const id = useId();
    const [showAll, setShowAll] = useState(false);
    return <div className="ww-character-suggestions">
        {(showAll ? candidates : candidates.slice(0, 12)).map((candidate, index) => <button type="button" key={candidate.name} aria-label={candidate.name} aria-describedby={`${id}-${index}`} aria-pressed={selectedNames.has(candidate.name)} disabled={disabled} onClick={() => onToggle(candidate.name)}>
            <span className="ww-character-suggestion-heading"><span className="ww-character-suggestion-check" aria-hidden="true">{selectedNames.has(candidate.name) && <Check size={15} />}</span><strong>{candidate.name}</strong><span>{candidate.confidence === 'likely' ? 'Likely character' : 'Check identity'}</span></span>
            <span className="ww-character-suggestion-context" id={`${id}-${index}`}><span>{candidate.count} {candidate.count === 1 ? 'mention' : 'mentions'} · {candidate.reasons.join(' · ')}</span>{candidate.aliases.length > 0 && <span>Also mentioned as {candidate.aliases.join(', ')}</span>}<q>{candidate.excerpt}</q></span>
        </button>)}
        {!showAll && candidates.length > 12 && <button className="ww-character-suggestions-more" type="button" disabled={disabled} onClick={() => setShowAll(true)}>Show {candidates.length - 12} more suggestions</button>}
    </div>;
}
