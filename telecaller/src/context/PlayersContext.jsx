import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
} from 'react';
import { loadTelecallerDashboard } from '../utils/playerActivity';

const PlayersContext = createContext(null);

const REFRESH_MS = 5 * 60 * 1000;
const SEARCH_DEBOUNCE_MS = 350;

const EMPTY_STATS = {
    total: 0,
    online: 0,
    withDeposit: 0,
    withWithdrawal: 0,
    withWalletCredit: 0,
    withBet: 0,
};

export function PlayersProvider({ children }) {
    const [players, setPlayers] = useState([]);
    const [onlinePreview, setOnlinePreview] = useState([]);
    const [stats, setStats] = useState(EMPTY_STATS);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('last_deposit_desc');
    const [page, setPage] = useState(1);
    const loadSeq = useRef(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [search]);

    const setSortByAndResetPage = useCallback((value) => {
        setSortBy(value);
        setPage(1);
    }, []);

    const load = useCallback(async (silent = false) => {
        const seq = ++loadSeq.current;
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError('');
        try {
            const result = await loadTelecallerDashboard({
                search: debouncedSearch,
                page,
                sort: sortBy,
            });
            if (seq !== loadSeq.current) return;
            setPlayers(result.players);
            setOnlinePreview(result.onlinePreview);
            setStats(result.stats);
            setPagination(result.pagination);
        } catch (err) {
            if (seq !== loadSeq.current) return;
            setError(err.message || 'Failed to load players');
        } finally {
            if (seq === loadSeq.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [debouncedSearch, page, sortBy]);

    useEffect(() => {
        load(false);
    }, [load]);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') load(true);
        };
        const refresh = setInterval(() => {
            if (document.visibilityState === 'visible') load(true);
        }, REFRESH_MS);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(refresh);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [load]);

    const value = useMemo(() => ({
        players,
        filteredPlayers: players,
        onlinePreview,
        loading,
        refreshing,
        error,
        search,
        setSearch,
        sortBy,
        setSortBy: setSortByAndResetPage,
        stats,
        pagination,
        page,
        setPage,
        load,
        refresh: () => load(true),
    }), [
        players,
        onlinePreview,
        loading,
        refreshing,
        error,
        search,
        sortBy,
        stats,
        pagination,
        page,
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
