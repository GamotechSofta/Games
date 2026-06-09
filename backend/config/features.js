/**
 * Feature flags — tune for production traffic without code changes.
 */
/** @deprecated Wallet push is always on; env kept for ops visibility only. */
export const walletSocketEnabled =
  String(process.env.WALLET_SOCKET_ENABLED || 'true').toLowerCase() !== 'false';

export const callSocketEnabled =
  String(process.env.CALL_SOCKET_ENABLED || 'true').toLowerCase() !== 'false';
