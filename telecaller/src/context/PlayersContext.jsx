import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
} from 'react';
import { loadTelecallerDashboard, computeIsOnline } from '../utils/playerActivity';
import { sortPlayers, filterPlayersBySearch } from '../utils/playerSort';

const PlayersContext = createContext(null);

export function PlayersProvider({ children }) {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('last_deposit_desc');
    const [, setTick] = useState(0);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError('');
        try {
            const rows = await loadTelecallerDashboard();
            setPlayers(rows);
        } catch (err) {
            setError(err.message || 'Failed to load players');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load(false);
        const refresh = setInterval(() => load(true), 60000);
        const tick = setInterval(() => setTick((t) => t + 1), 5000);
        return () => {
            clearInterval(refresh);
            clearInterval(tick);
        };
    }, [load]);

    const filteredPlayers = useMemo(
        () => sortPlayers(filterPlayersBySearch(players, search), sortBy),
        [players, search, sortBy],
    );

    const stats = useMemo(() => {
        const now = Date.now();
        return {
            total: players.length,
            online: players.filter((p) => computeIsOnline(p, now)).length,
            withDeposit: players.filter((p) => p.lastDeposit).length,
            withWithdrawal: players.filter((p) => p.lastWithdrawal).length,
            withWalletCredit: players.filter((p) => p.lastWalletCredit).length,
            withBet: players.filter((p) => p.lastBet).length,
        };
    }, [players]);

    const value = useMemo(() => ({
        players,
        filteredPlayers,
        loading,
        refreshing,
        error,
        search,
        setSearch,
        sortBy,
        setSortBy,
        stats,
        load,
        refresh: () => load(true),
    }), [
        players,
        filteredPlayers,
        loading,
        refreshing,
        error,
        search,
        sortBy,
        stats,
        load,
    ]);

    return (
        <PlayersContext.Provider value={value}>
            {children}
        </PlayersContext.Provider>
    );
}

export function usePlayers() {
    const ctx = useContext(PlayersContext);
    if (!ctx) throw new Error('usePlayers must be used within PlayersProvider');
    return ctx;
}
