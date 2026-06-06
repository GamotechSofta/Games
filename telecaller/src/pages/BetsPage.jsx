import PageHeader from '../components/layout/PageHeader';
import DataToolbar from '../components/common/DataToolbar';
import ErrorAlert from '../components/common/ErrorAlert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ListFooter from '../components/common/ListFooter';
import PaginationBar from '../components/common/PaginationBar';
import TableShell from '../components/tables/TableShell';
import { PlayerIndexCell, PlayerNameCell, PlayerPhoneCell } from '../components/players/PlayerIdentityCells';
import DateTimeCell from '../components/players/DateTimeCell';
import { usePlayers } from '../context/PlayersContext';
import { SORT_OPTIONS } from '../utils/playerSort';
import { NAV_ITEMS } from '../constants/navItems';

const TASK = NAV_ITEMS.find((n) => n.path === '/bets');
const BETS_SORT = SORT_OPTIONS.filter((o) =>
    ['name_asc', 'last_bet_desc'].includes(o.id),
);

const BetsPage = () => {
    const {
        filteredPlayers,
        loading,
        refreshing,
        error,
        search,
        setSearch,
        sortBy,
        setSortBy,
        refresh,
        pagination,
        page,
        setPage,
    } = usePlayers();

    return (
        <>
            <PageHeader
                title={TASK?.label || 'Bet follow-up'}
                description={TASK?.description || 'Last bet date and time only (no amount or market).'}
            />
            <DataToolbar
                search={search}
                onSearchChange={setSearch}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onRefresh={refresh}
                loading={loading}
                refreshing={refreshing}
                sortOptions={BETS_SORT}
            />
            <ErrorAlert message={error} />

            {loading ? (
                <LoadingSpinner message="Loading bets…" />
            ) : filteredPlayers.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    <TableShell minWidth="640px">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Player</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase min-w-[160px]">Last bet</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPlayers.map((p, i) => (
                                <tr key={p._id} className="hover:bg-gray-50/80">
                                    <PlayerIndexCell index={i + 1} />
                                    <PlayerNameCell username={p.username} />
                                    <PlayerPhoneCell phone={p.phone} />
                                    <td className="px-3 py-3">
                                        <DateTimeCell at={p.lastBet?.createdAt} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </TableShell>
                    <ListFooter shown={filteredPlayers.length} total={pagination.total} loading={loading} />
                    <PaginationBar
                        page={page}
                        totalPages={pagination.totalPages}
                        total={pagination.total}
                        onPageChange={setPage}
                        disabled={loading || refreshing}
                    />
                </>
            )}
        </>
    );
};

export default BetsPage;
