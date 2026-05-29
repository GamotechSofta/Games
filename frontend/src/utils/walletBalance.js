/**
 * Read wallet balance from stored user — same field priority as AppHeader / useWallet.
 */
export function getStoredWalletBalance() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (!u) return 0;
    const val =
      u.balance ??
      u.walletBalance ??
      u.wallet ??
      u.points ??
      u.walletAmount ??
      u.wallet_amount ??
      u.amount ??
      0;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Persist balance on user object (all legacy keys kept in sync). */
export function applyBalanceToStoredUser(newBalance) {
  const n = Number(newBalance);
  if (!Number.isFinite(n)) return;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.balance = n;
    user.walletBalance = n;
    user.wallet = n;
    localStorage.setItem('user', JSON.stringify(user));
  } catch {
    // ignore
  }
}
