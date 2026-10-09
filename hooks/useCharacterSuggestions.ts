import { useEffect, useMemo, useRef, useState } from 'react';
import { characterNameKey, isExistingCharacterName, scanCharacterNames, type CharacterCandidate, type CharacterNameDraft } from '../utils/characterRecognition';

/** Cast refreshes remove saved suggestions without restarting the author's review. */
export function useCharacterSuggestions(open: boolean, text: string, cast: CharacterNameDraft[]) {
    const [suggestions, setSuggestions] = useState<CharacterCandidate[]>([]);
    const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
    const [status, setStatus] = useState<'scanning' | 'ready' | 'failed'>('scanning');
    const [attempt, setAttempt] = useState(0);
    const castRef = useRef(cast); castRef.current = cast;
    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        setStatus('scanning'); setSuggestions([]); setSelectedNames(new Set());
        scanCharacterNames(text, castRef.current, controller.signal).then(result => {
            if (controller.signal.aborted) return;
            setSuggestions(result);
            setSelectedNames(new Set(result.filter(item => item.confidence === 'likely').map(item => item.name)));
            setStatus('ready');
        }).catch(() => { if (!controller.signal.aborted) setStatus('failed'); });
        return () => controller.abort();
    }, [open, text, attempt]);
    const candidates = useMemo(() => suggestions.filter(item => !isExistingCharacterName(item.name, cast)).map(item => ({ ...item, aliases: item.aliases.filter(alias => !cast.some(character => [character.name, ...(character.aliases || [])].some(label => characterNameKey(label) === characterNameKey(alias)))) })), [suggestions, cast]);
    const selected = candidates.filter(candidate => selectedNames.has(candidate.name));
    const toggle = (name: string) => setSelectedNames(previous => { const next = new Set(previous); if (next.has(name)) next.delete(name); else next.add(name); return next; });
    return { candidates, selected, selectedNames, toggle, status, retry: () => setAttempt(value => value + 1) };
}
