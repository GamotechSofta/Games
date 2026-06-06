/**
 * Feature flags — tune for production traffic without code changes.
 */
export const walletSocketEnabled =
  String(process.env.WALLET_SOCKET_ENABLED || 'false').toLowerCase() === 'true';

export const callSocketEnabled =
  String(process.env.CALL_SOCKET_ENABLED || 'true').toLowerCase() !== 'false';
