import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';
import { backBtn, bidAccent, pageShell, surfaceElevated, textMuted } from '../../styles/appTheme';

const getStatusLabelKey = (status) => {
  const map = { open: 'statusOpen', 'in-progress': 'statusInProgress', resolved: 'statusResolved', closed: 'statusClosed' };
  return map[status] || null;
};

const statusColor = (status) => {
  const map = {
    open: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/35',
    'in-progress': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-white/10 dark:text-gray-200 dark:border-white/20',
    resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/35',
    closed: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-gray-400 dark:border-white/15',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-gray-400 dark:border-white/15';
};

const SupportStatus = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const handleBack = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      const prev = sessionStorage.getItem('prevPathname');
      if (prev && prev !== '/support' && prev !== '/support/new' && prev !== '/support/status') {
        navigate(prev, { replace: false });
        return;
      }
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/support', { replace: true });
      }
    } catch (_) {
      navigate('/support', { replace: true });
    }
  };

  return (
    <div className={`${pageShell} px-4 sm:px-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]`}>
      <div className="max-w-lg mx-auto pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-5 sm:mb-6 relative z-10">
          <button type="button" onClick={handleBack} className={backBtn} aria-label="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{t('support.myTickets')}</h1>
            <p className={`text-xs sm:text-sm mt-0.5 ${textMuted}`}>{t('support.statusAndReplies')}</p>
          </div>
        </div>

        {!userId ? (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-5 text-center text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200 text-sm">
            {t('support.loginRequiredForTickets')}
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`rounded-2xl p-4 skeleton-shimmer ${surfaceElevated}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="h-4 flex-1 max-w-[60%] rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-6 w-16 rounded-lg bg-gray-200 dark:bg-white/10 shrink-0" />
                </div>
                <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded mt-2" />
                <div className="h-4 w-full bg-gray-200 dark:bg-white/10 rounded mt-2" />
              </div>
            ))}
          </div>
        ) : myTickets.length === 0 ? (
          <div className={`rounded-2xl p-8 text-center ${surfaceElevated}`}>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-red-500/20">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-gray-800 dark:text-gray-300 text-sm font-medium">{t('support.noTicketsYet')}</p>
            <p className={`text-xs mt-1 ${textMuted}`}>{t('support.sendRequestFromSupport')}</p>
            <button
              type="button"
              onClick={() => navigate('/support', { replace: true })}
              className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm transition active:scale-[0.98] dark:border dark:border-white/20"
            >
              {t('support.askForHelp')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myTickets.map((ticket) => (
              <div key={ticket._id} className={`rounded-2xl p-4 sm:p-5 ${surfaceElevated}`}>
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate flex-1">{ticket.subject}</p>
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColor(ticket.status)}`}>
                    {getStatusLabelKey(ticket.status) ? t(`support.${getStatusLabelKey(ticket.status)}`) : ticket.status}
                  </span>
                </div>
                <p className={`text-xs mt-1.5 ${textMuted}`}>
                  {ticket.createdAt
                    ? new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{ticket.description}</p>
                {ticket.adminResponse && (
                  <div className="mt-3 pt-3 border-t border-red-100 dark:border-white/10">
                    <p className={`text-xs mb-1 font-medium ${bidAccent}`}>{t('support.replyFromSupport')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-white/5 p-3 border border-gray-200 dark:border-white/10">
                      {ticket.adminResponse}
                    </p>
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
