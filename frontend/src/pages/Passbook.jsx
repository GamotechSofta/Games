import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

/* ───────── Icons ───────── */
const IconBack = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
const IconWallet = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110 6h3.75A2.25 2.25 0 0021 13.5V12zm0 0V9.75a2.25 2.25 0 00-2.25-2.25h-13.5A2.25 2.25 0 003 9.75v7.5A2.25 2.25 0 005.25 19.5h13.5A2.25 2.25 0 0021 17.25V12z" />
  </svg>
);
const IconCredit = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
  </svg>
);
const IconDebit = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5V4.5m0 0L5.25 11.25M12 4.5l6.75 6.75" />
  </svg>
);
const IconEmpty = () => (
  <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const IconRefresh = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
  </svg>
);

const formatAmount = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTxDateTime = (dateStr) => {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    const date = d.toLocaleDateString('en-GB').replace(/\//g, '-');
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date} ${String(time).toUpperCase()}`;
  } catch {
    return '-';
  }
};

const statusUi = (statusRaw) => {
  const s = (statusRaw || '').toString().toLowerCase();
  if (s === 'approved' || s === 'completed') return { label: 'Success', className: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (s === 'rejected') return { label: 'Rejected', className: 'text-red-400', dot: 'bg-red-500' };
  return { label: 'Pending', className: 'text-yellow-400', dot: 'bg-yellow-500' };
};

const methodLabel = (methodRaw) => {
  const m = (methodRaw || '').toString().toLowerCase();
  if (m === 'bank_transfer') return 'bank';
  if (m === 'upi') return 'upi';
  if (m === 'wallet') return 'wallet';
  if (m === 'cash') return 'cash';
  return m || '-';
};

const Passbook = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    const userId = user?.id || user?._id;
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [depRes, witRes] = await Promise.all([
        fetch(`${API_BASE_URL}/payments/my-deposits?userId=${userId}`),
        fetch(`${API_BASE_URL}/payments/my-withdrawals?userId=${userId}`),
      ]);
      const depJson = await depRes.json();
      const witJson = await witRes.json();
      const deposits = depJson?.success && Array.isArray(depJson?.data) ? depJson.data : [];
      const withdrawals = witJson?.success && Array.isArray(witJson?.data) ? witJson.data : [];

      const combined = [
        ...deposits.map((p) => ({ ...p, _kind: 'deposit' })),
        ...withdrawals.map((p) => ({ ...p, _kind: 'withdrawal' })),
      ];
      combined.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());

      setRows(combined);
      setPage(1);
    } catch (err) {
      console.error('Passbook fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?._id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil((rows?.length || 0) / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return (rows || []).slice(start, start + PAGE_SIZE);
  }, [rows, currentPage]);

  const showStickyPager = !loading && (rows?.length || 0) > 0;

  return (
    <div
      className={`min-h-screen bg-black text-white ${
        showStickyPager
          ? 'pb-[calc(10rem+env(safe-area-inset-bottom,0px))]'
          : 'pb-[calc(6rem+env(safe-area-inset-bottom,0px))]'
      }`}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all"
            aria-label="Back"
          >
            <IconBack />
          </button>
          <h2 className="text-base font-semibold tracking-wide flex-1">Transaction History</h2>
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className={`w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all ${refreshing ? 'animate-spin' : ''}`}
            aria-label="Refresh"
          >
            <IconRefresh />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
        {loading ? (
          <div className="text-center py-10 text-white/60 text-sm">Loading history...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-white/60 text-sm">No transactions found.</div>
        ) : (
          <div className="space-y-4">
            {pagedRows.map((p) => {
              const ui = statusUi(p.status);
              const isWithdrawal = p._kind === 'withdrawal';
              const bank = p.bankDetailId || {};
              const via = methodLabel(p.method);
              const modeText = `${isWithdrawal ? 'Withdraw' : 'Deposit'} (${ui.label.toLowerCase()})`;
              const name = (bank.accountHolderName || '').toString().trim() || '-';
              const bankName = (bank.bankName || '').toString().trim() || '-';
              const acct = (bank.accountNumber || '').toString().trim() || '-';
              const ifsc = (bank.ifscCode || '').toString().trim() || '-';
              const utr = (p.upiTransactionId || p.transactionId || '').toString().trim() || '-';

              return (
                <div key={p._id} className="bg-[#202124] rounded-2xl border border-white/10 overflow-hidden shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
                  <div className="flex items-start justify-between gap-4 px-4 pt-4">
                    <div className="text-xl font-extrabold text-white">₹{Number(p.amount || 0).toLocaleString('en-IN')}</div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-2 font-semibold ${ui.className}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${ui.dot}`} />
                        {ui.label}
                      </div>
                      <div className="text-[11px] text-white/50 mt-1">{formatTxDateTime(p.createdAt)}</div>
                    </div>
                  </div>

                  <div className="mt-3 h-px bg-white/10" />

                  <div className="px-4 py-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-white/60 text-xs">Via</div>
                      <div className="text-white/80">{via}</div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">Mode</div>
                      <div className="text-white/80">{modeText}</div>
                    </div>
                  </div>

                  <div className="h-px bg-white/10" />

                  <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <div className="text-white/60 text-xs">Name</div>
                      <div className="text-white/80 truncate">{isWithdrawal ? name : '-'}</div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">{isWithdrawal ? 'Bank Name' : 'UTR'}</div>
                      <div className="text-white/80 truncate">{isWithdrawal ? bankName : utr}</div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">{isWithdrawal ? 'A/c No.' : 'Method'}</div>
                      <div className="text-white/80 truncate">{isWithdrawal ? acct : via}</div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">{isWithdrawal ? 'Ifsc' : 'Status'}</div>
                      <div className="text-white/80 truncate">{isWithdrawal ? ifsc : ui.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky pagination above mobile bottom navbar */}
      {showStickyPager && (
        <div
          className="fixed left-0 right-0 z-[60] md:hidden px-3 sm:px-4 pointer-events-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
        >
          <div className="mx-auto w-full max-w-[520px] pointer-events-auto">
            <div className="bg-[#202124] rounded-full border border-white/10 px-4 py-2 flex items-center justify-between shadow-[0_10px_22px_rgba(0,0,0,0.40)]">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 text-white/90 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-lg leading-none">‹</span>
                <span>PREV</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm border border-white/10"
                >
                  {currentPage}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 text-white/90 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>NEXT</span>
                <span className="text-lg leading-none">›</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Passbook;
