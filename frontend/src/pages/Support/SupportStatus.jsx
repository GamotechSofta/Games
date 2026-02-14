import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const statusLabel = (status) => {
  const map = { open: 'Open', 'in-progress': 'In progress', resolved: 'Resolved', closed: 'Closed' };
  return map[status] || status;
};

const statusColor = (status) => {
  const map = {
    open: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'in-progress': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    resolved: 'bg-green-500/20 text-green-300 border-green-500/40',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  };
  return map[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/40';
};

const SupportStatus = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const userId = user?._id || user?.id;

  const fetchMyTickets = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/help-desk/my-tickets?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success) setMyTickets(data.data || []);
    } catch (_) {
      setMyTickets([]);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-black text-white px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-md mx-auto pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/support')}
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/10 flex items-center justify-center shrink-0 touch-manipulation"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">My tickets</h1>
            <p className="text-xs text-gray-500">Status and replies</p>
          </div>
        </div>

        {!userId ? (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-center text-amber-200 text-sm">
            Please log in to see your tickets.
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-4 skeleton-shimmer">
                <div className="flex justify-between items-start gap-2">
                  <div className="h-4 flex-1 max-w-[60%] rounded bg-white/10" />
                  <div className="h-6 w-16 rounded-lg bg-white/10 shrink-0" />
                </div>
                <div className="h-3 w-24 bg-white/10 rounded mt-2" />
                <div className="h-4 w-full bg-white/10 rounded mt-2" />
                <div className="h-3 w-3/4 bg-white/10 rounded mt-2" />
              </div>
            ))}
          </div>
        ) : myTickets.length === 0 ? (
          <div className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-8 text-center">
            <p className="text-gray-400 text-sm">No tickets yet.</p>
            <p className="text-gray-500 text-xs mt-1">Send a request from Support and it will show here.</p>
            <button
              type="button"
              onClick={() => navigate('/support')}
              className="mt-4 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition"
            >
              Ask for help
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myTickets.map((t) => (
              <div
                key={t._id}
                className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-4"
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-white text-sm truncate flex-1">{t.subject}</p>
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColor(t.status)}`}>
                    {statusLabel(t.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{t.description}</p>
                {t.adminResponse && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-gray-500 mb-1">Reply from support</p>
                    <p className="text-sm text-green-300/90 whitespace-pre-wrap">{t.adminResponse}</p>
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
