import { useEffect, useState } from 'react';

/** Retain visible records during retry, but never show another story's data. */
export function usePlanningCollection<T>(identity: string, read: () => Promise<T[]>) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => { setData([]); }, [identity]);
    useEffect(() => {
        let active = true;
        setLoading(true); setLoadError('');
        read().then(records => { if (active) setData(records); })
            .catch(failure => { if (active) setLoadError(failure instanceof Error ? failure.message : 'This part of your plan could not load.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [identity, read, attempt]);
    return { data, setData, loading, loadError, retry: () => setAttempt(value => value + 1) };
}
