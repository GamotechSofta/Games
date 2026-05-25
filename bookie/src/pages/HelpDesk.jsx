import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, API_ORIGIN, bookieFetch } from '../utils/api';

const HelpDesk = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [filters, setFilters] = useState({ status: '' });

    useEffect(() => {
        fetchTickets();
    }, [filters]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const q = new URLSearchParams();
            if (filters.status) q.append('status', filters.status);
            const response = await bookieFetch(`${API_BASE_URL}/help-desk/tickets?${q}`);
            const data = await response.json();
            if (data.success) setTickets(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (ticketId, newStatus) => {
        try {
            const response = await bookieFetch(`${API_BASE_URL}/help-desk/tickets/${ticketId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await response.json();
            if (data.success) {
                fetchTickets();
                if (selectedTicket?._id === ticketId) setSelectedTicket({ ...selectedTicket, status: newStatus });
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Layout title="Help Desk">
            <div className="max-w-[1600px] mx-auto min-w-0 h-[calc(100vh-140px)] flex flex-col">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 shrink-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Help Desk
                        <span className="text-sm font-normal px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Support</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500/50 text-sm"
                        >
                            <option value="">All Status</option>
                            <option value="open">Open</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => setFilters({ status: '' })}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-slate-200 text-slate-300 text-sm font-medium transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-0 flex-1">
                    {/* Ticket List */}
                    <div className="glass-panel glass-panel-card rounded-2xl overflow-hidden flex flex-col border border-slate-200">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                            <h2 className="font-bold text-slate-900">Tickets</h2>
                            <span className="text-xs text-slate-400">{tickets.length} tickets</span>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            {loading ? (
                                <div className="p-12 text-center text-slate-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                                    Loading tickets...
                                </div>
                            ) : tickets.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">No tickets found</div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {tickets.map((ticket) => (
                                        <div
                                            key={ticket._id}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${selectedTicket?._id === ticket._id ? 'bg-amber-50 border-l-amber-500' : 'border-l-transparent'}`}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className={`font-semibold text-sm ${selectedTicket?._id === ticket._id ? 'text-slate-900' : 'text-slate-600'}`}>{ticket.subject}</h3>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        ticket.status === 'in-progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            ticket.status === 'closed' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-2 mb-2">{ticket.description}</p>
                                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                                                <span>
                                                    {ticket.userId?.username || 'Unknown'}
                                                </span>
                                                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ticket Details */}
                    <div className="glass-panel glass-panel-card rounded-2xl overflow-hidden flex flex-col border border-slate-200">
                        {selectedTicket ? (
                            <div className="flex flex-col h-full">
                                <div className="p-6 border-b border-slate-200 shrink-0 flex justify-between items-start gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedTicket.subject}</h2>
                                        <div className="flex items-center gap-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                                                {selectedTicket.userId?.username || selectedTicket.userId}
                                            </span>
                                            <span>•</span>
                                            <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border whitespace-nowrap ${selectedTicket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            selectedTicket.status === 'in-progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                selectedTicket.status === 'closed' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>{selectedTicket.status}</span>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                                    <div className="mb-8">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</p>
                                        <div className="bg-black/20 rounded-xl p-4 border border-slate-200 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                            {selectedTicket.description}
                                        </div>
                                    </div>

                                    {selectedTicket.screenshots?.length > 0 && (
                                        <div className="mb-6">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attached Screenshots</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {selectedTicket.screenshots.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setFullScreenImage(s.startsWith('http') ? s : `${API_ORIGIN}${s}`)}
                                                        className="aspect-video rounded-lg border border-slate-200 overflow-hidden hover:border-amber-500/50 transition-colors group relative"
                                                    >
                                                        <img src={s.startsWith('http') ? s : `${API_ORIGIN}${s}`} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-xs text-slate-900 font-medium">View Full</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 border-t border-slate-200 bg-black/20 shrink-0">
                                    <div className="flex flex-wrap gap-3 justify-end">
                                        {selectedTicket.status === 'open' && (
                                            <>
                                                <button onClick={() => handleStatusUpdate(selectedTicket._id, 'in-progress')} className="px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-sm font-bold transition-colors">Mark In Progress</button>
                                                <button onClick={() => handleStatusUpdate(selectedTicket._id, 'resolved')} className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-bold transition-colors">Mark Resolved</button>
                                            </>
                                        )}
                                        {selectedTicket.status === 'in-progress' && (
                                            <button onClick={() => handleStatusUpdate(selectedTicket._id, 'resolved')} className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-bold transition-colors">Mark Resolved</button>
                                        )}
                                        <button onClick={() => handleStatusUpdate(selectedTicket._id, 'closed')} className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 text-sm font-bold transition-colors">Close Ticket</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <p>Select a ticket to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Full-screen screenshot lightbox */}
            {fullScreenImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setFullScreenImage(null)}
                >
                    <button
                        type="button"
                        onClick={() => setFullScreenImage(null)}
                        className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
                    >
                        ×
                    </button>
                    <img
                        src={fullScreenImage}
                        alt="Screenshot full size"
                        className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </Layout>
    );
};

export default HelpDesk;
