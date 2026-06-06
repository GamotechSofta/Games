import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import PrivacyNote from '../components/common/PrivacyNote';
import StatsGrid from '../components/dashboard/StatsGrid';
import QuickLinks from '../components/dashboard/QuickLinks';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { usePlayers } from '../context/PlayersContext';
import PhoneLink from '../components/layout/PhoneLink';
import PlayerStatusBadge from '../components/players/PlayerStatusBadge';
import PlayerDetailModal from '../components/players/PlayerDetailModal';

const OverviewPage = () => {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const { stats, loading, error, onlinePreview, refresh, refreshing } = usePlayers();

    return (
        <>
            <PageHeader
                title="Overview"
                description="Summary of player activity for your calling team."
            />
            <PrivacyNote />
            <ErrorAlert message={error} />

            {loading ? (
                <LoadingSpinner message="Loading dashboard…" />
            ) : (
                <>
                    <StatsGrid stats={stats} />
                    <QuickLinks />

                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                Online now
                            </h2>
                            <Link to="/call-players" className="text-sm text-teal-600 hover:text-teal-800 font-medium">
                                Player calls →
                            </Link>
                        </div>
                        {onlinePreview.length === 0 ? (
                            <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-6">
                                No players online right now.
                            </p>
                        ) : (
                            <ul className="grid sm:grid-cols-2 gap-3">
                                {onlinePreview.map((p) => (
                                    <li
                                        key={p._id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedPlayer(p)}
                                        onKeyDown={(e) => e.key === 'Enter' && setSelectedPlayer(p)}
                                        className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-teal-300 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{p.username || '—'}</p>
                                            <PhoneLink phone={p.phone} />
                                        </div>
                                        <PlayerStatusBadge player={p} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <p className="mt-4 text-xs text-gray-500">
                        Data refreshes every 5 min
                        {refreshing ? ' · Updating…' : ''}
                        {' · '}
                        <button type="button" onClick={refresh} className="text-teal-600 hover:underline">
                            Refresh now
                        </button>
                    </p>
                </>
            )}

            <PlayerDetailModal
                player={selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
            />
        </>
    );
};

export default OverviewPage;
