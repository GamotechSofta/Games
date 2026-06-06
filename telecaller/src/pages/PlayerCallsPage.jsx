import { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import PrivacyNote from '../components/common/PrivacyNote';
import DataToolbar from '../components/common/DataToolbar';
import ErrorAlert from '../components/common/ErrorAlert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ListFooter from '../components/common/ListFooter';
import PaginationBar from '../components/common/PaginationBar';
import TableShell from '../components/tables/TableShell';
import { PlayerIndexCell, PlayerNameCell, PlayerPhoneCell } from '../components/players/PlayerIdentityCells';
import PlayerStatusBadge from '../components/players/PlayerStatusBadge';
import PlayerActivitySummary from '../components/players/PlayerActivitySummary';
import PlayerDetailModal from '../components/players/PlayerDetailModal';
import CalledCheckbox from '../components/players/CalledCheckbox';
import CalledPlayersToolbar from '../components/players/CalledPlayersToolbar';
import { usePlayers } from '../context/PlayersContext';
import { useCalledPlayers } from '../hooks/useCalledPlayers';
import { SORT_OPTIONS } from '../utils/playerSort';
import { NAV_ITEMS } from '../constants/navItems';

const TASK = NAV_ITEMS.find((n) => n.path === '/call-players');
const CALLS_SORT = SORT_OPTIONS.filter((o) => o.id === 'name_asc' || o.id === 'last_deposit_desc');

const PlayerCallsPage = () => {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
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
        stats,
        pagination,
        page,
        setPage,
    } = usePlayers();
    const {
        isCalled,
        toggleCalled,
        clearAllCalled,
        calledCount,
        calledLoading,
        calledSaving,
        syncError,
        getCallSummary,
        saveCallSummary,
    } = useCalledPlayers();

    return (
        <>
            <PageHeader
                title={TASK?.label || 'Player calls'}
                description={TASK?.description || 'Tap a player to see deposit, withdrawal, wallet activity times, and bet info.'}
            />
            <PrivacyNote />
            <DataToolbar
                search={search}
                onSearchChange={setSearch}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onRefresh={refresh}
                loading={loading}
                refreshing={refreshing}
                sortOptions={CALLS_SORT}
            />
            <ErrorAlert message={error} />
            <ErrorAlert message={syncError} />
            {(calledLoading || calledSaving) && (
                <p className="text-xs text-teal-600 mb-2">
                    {calledLoading ? 'Loading your call ticks…' : 'Saving…'}
                </p>
            )}

            {loading ? (
                <LoadingSpinner message="Loading players…" />
            ) : filteredPlayers.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    <CalledPlayersToolbar
                        calledCount={calledCount}
                        total={stats.total}
                        onClearAll={clearAllCalled}
                    />
                    <TableShell minWidth="760px">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-14">Done</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Player</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Activity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPlayers.map((p, i) => {
                                const done = isCalled(p._id);
                                return (
                                    <tr
                                        key={p._id}
                                        onClick={() => setSelectedPlayer(p)}
                                        className={`hover:bg-teal-50/60 cursor-pointer transition-colors ${
                                            done ? 'bg-emerald-50/50' : ''
                                        }`}
                                    >
                                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                            <CalledCheckbox
                                                checked={done}
                                                onChange={(checked) => toggleCalled(p._id, checked)}
                                            />
                                        </td>
                                        <PlayerIndexCell index={i + 1} />
                                        <PlayerNameCell username={p.username} />
                                        <PlayerPhoneCell phone={p.phone} />
                                        <td className="px-3 py-3">
                                            <PlayerStatusBadge player={p} />
                                        </td>
                                        <td className="px-3 py-3">
                                            <PlayerActivitySummary player={p} />
                                        </td>
                                    </tr>
                                );
                            })}
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

            <PlayerDetailModal
                player={selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                isCalled={selectedPlayer ? isCalled(selectedPlayer._id) : false}
                onToggleCalled={(checked) => {
                    if (selectedPlayer) toggleCalled(selectedPlayer._id, checked);
                }}
                callSummary={selectedPlayer ? getCallSummary(selectedPlayer._id) : ''}
                onSaveCallSummary={async (text) => {
                    if (selectedPlayer) await saveCallSummary(selectedPlayer._id, text);
                }}
                summarySaving={calledSaving}
                summaryDisabled={calledLoading}
            />
        </>
    );
};

export default PlayerCallsPage;
