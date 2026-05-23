import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, bookieFetch } from '../utils/api';
import { FaTrophy, FaMedal, FaCrown, FaUserCircle, FaHashtag, FaCalendarAlt } from 'react-icons/fa';

const TopWinners = () => {
    const [winners, setWinners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('all');

    useEffect(() => {
        const fetchTopWinners = async () => {
            try {
                setLoading(true);
                // Note: Ensure your backend supports this endpoint and query param
                const response = await bookieFetch(`${API_BASE_URL}/reports/top-winners?timeRange=${timeRange}`);
                const data = await response.json();
                if (data.success) {
                    setWinners(data.data);
                } else {
                    setWinners([]);
                }
            } catch (err) {
                console.error(err);
                setWinners([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTopWinners();
    }, [timeRange]);

    const getRankStyles = (index) => {
        switch (index) {
            case 0: return {
                bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
                text: 'text-yellow-950',
                border: 'border-yellow-500/50',
                shadow: 'shadow-yellow-500/20',
                icon: <FaCrown className="w-5 h-5 text-yellow-950" />
            };
            case 1: return {
                bg: 'bg-gradient-to-br from-slate-300 to-slate-500',
                text: 'text-slate-900',
                border: 'border-slate-400/50',
                shadow: 'shadow-slate-500/20',
                icon: <FaMedal className="w-5 h-5 text-slate-900" />
            };
            case 2: return {
                bg: 'bg-gradient-to-br from-orange-400 to-orange-700',
                text: 'text-orange-950',
                border: 'border-orange-500/50',
                shadow: 'shadow-orange-500/20',
                icon: <FaMedal className="w-5 h-5 text-orange-950" />
            };
            default: return {
                bg: 'bg-slate-800',
                text: 'text-slate-400',
                border: 'border-slate-700',
                shadow: '',
                icon: <span className="font-bold font-mono">#{index + 1}</span>
            };
        }
    };

    return (
        <Layout title="Top Winners">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                            <FaTrophy className="text-amber-500" />
                            Leaderboard
                        </h1>
                        <p className="text-slate-600 text-sm mt-1">Most successful players on your platform</p>
                    </div>

                    <div className="glass-panel glass-panel-card p-1 rounded-xl flex items-center gap-1 border border-slate-200 w-full sm:w-auto overflow-x-auto">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: 'week', label: 'This Week' },
                            { id: 'month', label: 'This Month' },
                            { id: 'all', label: 'All Time' }
                        ].map((range) => (
                            <button
                                key={range.id}
                                onClick={() => setTimeRange(range.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${timeRange === range.id
                                        ? 'bg-amber-500 text-black shadow-lg'
                                        : 'text-slate-400 hover:text-slate-900 hover:bg-white/5'
                                    }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="glass-panel h-48 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : winners.length === 0 ? (
                    <div className="glass-panel glass-panel-card p-16 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <FaTrophy className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Winners Found</h3>
                        <p className="text-slate-400 max-w-sm mx-auto">
                            No winning bets recorded for the selected time period.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {winners.map((winner, index) => {
                            const style = getRankStyles(index);
                            return (
                                <div
                                    key={winner.userId?._id || index}
                                    className={`glass-panel glass-panel-card p-6 rounded-2xl border transition-transform hover:scale-[1.02] duration-300 relative overflow-hidden group ${index < 3 ? style.border : 'border-slate-200'
                                        }`}
                                >
                                    {/* Background Glow for Top 3 */}
                                    {index < 3 && (
                                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10 pointer-events-none transition-opacity group-hover:opacity-30 ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-orange-500'
                                            }`}></div>
                                    )}

                                    <div className="flex items-start justify-between mb-6 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${style.bg} ${style.text}`}>
                                                {style.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg truncate max-w-[120px]">
                                                    {winner.userId?.username || 'Unknown'}
                                                </h3>
                                                <p className="text-xs text-slate-500 font-mono">
                                                    {winner.userId?.phone || 'No Phone'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 relative z-10 bg-black/20 rounded-xl p-4 border border-slate-200">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Won</span>
                                            <span className={`font-mono font-bold text-lg ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-200' : index === 2 ? 'text-orange-400' : 'text-emerald-400'
                                                }`}>
                                                ₹{winner.totalWinnings?.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="w-full h-px bg-white/5"></div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Win Rate</span>
                                            <span className="text-slate-900 font-medium">{winner.winRate}%</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Total Wins</span>
                                            <span className="text-slate-900 font-medium">{winner.totalWins} bets</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default TopWinners;
