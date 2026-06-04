export function formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatAmount(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '—';
    return `₹${n.toLocaleString('en-IN')}`;
}

export function statusBadgeClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'approved' || s === 'completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'rejected') return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
}
