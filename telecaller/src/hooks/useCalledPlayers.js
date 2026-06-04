import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCallProgress, saveCallProgress } from '../utils/calledPlayersApi';

function buildSummaryEntry(playerId, text) {
    const id = String(playerId);
    const trimmed = String(text ?? '').slice(0, 2000);
    return { id, trimmed };
}

export function useCalledPlayers() {
    const [calledIds, setCalledIds] = useState(new Set());
    const [summaries, setSummaries] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncError, setSyncError] = useState('');
    const calledIdsRef = useRef(calledIds);
    const summariesRef = useRef(summaries);
    const readyRef = useRef(false);
    const skipSaveRef = useRef(true);

    calledIdsRef.current = calledIds;
    summariesRef.current = summaries;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setSyncError('');
            try {
                const { playerIds, summaries: loadedSummaries } = await fetchCallProgress();
                if (!cancelled) {
                    setCalledIds(new Set(playerIds.map(String)));
                    setSummaries(loadedSummaries || {});
                    readyRef.current = true;
                    skipSaveRef.current = true;
                }
            } catch (err) {
                if (!cancelled) {
                    setSyncError(err.message || 'Could not load call progress');
                    readyRef.current = true;
                    skipSaveRef.current = true;
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const persistProgress = useCallback(async (ids, summaryMap) => {
        setSaving(true);
        setSyncError('');
        try {
            await saveCallProgress([...ids], summaryMap);
            skipSaveRef.current = true;
        } catch (err) {
            setSyncError(err.message || 'Could not save call progress');
            throw err;
        } finally {
            setSaving(false);
        }
    }, []);

    useEffect(() => {
        if (!readyRef.current) return;
        if (skipSaveRef.current) {
            skipSaveRef.current = false;
            return;
        }

        const timer = setTimeout(() => {
            persistProgress(calledIdsRef.current, summariesRef.current);
        }, 400);

        return () => clearTimeout(timer);
    }, [calledIds, persistProgress]);

    const isCalled = useCallback(
        (playerId) => calledIds.has(String(playerId)),
        [calledIds],
    );

    const toggleCalled = useCallback((playerId, checked) => {
        const id = String(playerId);
        setCalledIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const clearAllCalled = useCallback(() => {
        setCalledIds(new Set());
    }, []);

    const getCallSummary = useCallback(
        (playerId) => summaries[String(playerId)] || '',
        [summaries],
    );

    const saveCallSummary = useCallback(async (playerId, text) => {
        const { id, trimmed } = buildSummaryEntry(playerId, text);
        const nextSummaries = { ...summariesRef.current };
        if (trimmed.trim()) nextSummaries[id] = trimmed;
        else delete nextSummaries[id];
        setSummaries(nextSummaries);
        summariesRef.current = nextSummaries;
        await persistProgress(calledIdsRef.current, nextSummaries);
    }, [persistProgress]);

    return {
        isCalled,
        toggleCalled,
        clearAllCalled,
        getCallSummary,
        saveCallSummary,
        calledCount: calledIds.size,
        calledLoading: loading,
        calledSaving: saving,
        syncError,
    };
}
