import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const statusLabel = (status) => {
  const map = { open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved', closed: 'Closed' };
  return map[status] || status;
};

const statusClass = (status) => {
  const map = {
    open: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    'in-progress': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  };
  return map[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/40';
};

const SupportStatus = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const userId = user?._id || user?.id;

  const fetchMyTickets = async () => {
    if (!userId) return;
    setTicketsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/help-desk/my-tickets?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success) setMyTickets(data.data || []);
    } catch (_) {
      setMyTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch (_) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    const onUserChange = () => {
      const r = localStorage.getItem('user');
      setUser(r ? JSON.parse(r) : null);
    };
    window.addEventListener('userLogin', onUserChange);
    window.addEventListener('userLogout', onUserChange);
    return () => {
      window.removeEventListener('userLogin', onUserChange);
      window.removeEventListener('userLogout', onUserChange);
    };
  }, []);

  useEffect(() => {
    if (userId) fetchMyTickets();
    else setMyTickets([]);
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white px-3 sm:px-6 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-xl mx-auto">
        <div className="flex items-center gap-3 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate('/support')}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all shrink-0"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Check problem status</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">See status and reply for your submitted tickets</p>
          </div>
        </div>

        {!userId ? (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm text-center">
            Please login to see your ticket status.
          </div>
        ) : ticketsLoading ? (
          <div className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-5 h-5 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading tickets...</p>
          </div>
        ) : myTickets.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">No tickets yet.</p>
            <p className="text-gray-500 text-xs mt-1">Raise a help ticket from the Help Desk.</p>
            <button
              type="button"
              onClick={() => navigate('/support/new')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold text-sm hover:opacity-95 transition"
            >
              Raise help ticket
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {myTickets.map((t) => (
              <div
                key={t._id}
                className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 p-4 sm:p-5"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">{t.subject}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusClass(t.status)}`}>
                    {statusLabel(t.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-3 line-clamp-3 leading-relaxed">{t.description}</p>
                {t.adminResponse && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Response from support</p>
                    <p className="text-sm text-emerald-400/90 whitespace-pre-wrap leading-relaxed">{t.adminResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportStatus;
