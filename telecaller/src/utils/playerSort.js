export const SORT_OPTIONS = [
    { id: 'name_asc', label: 'Name (A–Z)' },
    { id: 'last_deposit_desc', label: 'Last deposit (recent)' },
    { id: 'last_withdraw_desc', label: 'Last withdrawal (recent)' },
    { id: 'last_wallet_add_desc', label: 'Wallet add (recent)' },
    { id: 'last_wallet_deduct_desc', label: 'Wallet deduct (recent)' },
    { id: 'last_bet_desc', label: 'Last bet (recent)' },
];

export function sortPlayers(list, sortBy) {
    const ts = (d) => (d ? new Date(d).getTime() : 0);
    return [...list].sort((a, b) => {
        if (sortBy === 'name_asc') {
            return String(a.username || '').localeCompare(String(b.username || ''), undefined, { sensitivity: 'base' });
        }
        if (sortBy === 'last_deposit_desc') {
            return ts(b.lastDeposit?.createdAt) - ts(a.lastDeposit?.createdAt);
        }
        if (sortBy === 'last_withdraw_desc') {
            return ts(b.lastWithdrawal?.createdAt) - ts(a.lastWithdrawal?.createdAt);
        }
        if (sortBy === 'last_wallet_add_desc') {
            return ts(b.lastWalletCredit?.createdAt) - ts(a.lastWalletCredit?.createdAt);
        }
        if (sortBy === 'last_wallet_deduct_desc') {
            return ts(b.lastWalletDebit?.createdAt) - ts(a.lastWalletDebit?.createdAt);
        }
        if (sortBy === 'last_bet_desc') {
            return ts(b.lastBet?.createdAt) - ts(a.lastBet?.createdAt);
        }
        return 0;
    });
}

export function filterPlayersBySearch(players, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => {
        const phone = String(p.phone || '');
        return (p.username || '').toLowerCase().includes(q) || phone.includes(q);
    });
}
