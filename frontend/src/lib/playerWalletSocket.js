/**
 * Join the server-side player wallet room so `wallet:update` is delivered to this tab.
 * Call after `io(...)`.
 */
export function attachPlayerWalletSocket(socket) {
  const getUserId = () => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return '';
      const u = JSON.parse(raw);
      return String(u?.id || u?._id || '').trim();
    } catch {
      return '';
    }
  };

  let lastUserId = '';
  let lastSubscribeAt = 0;
  const SUBSCRIBE_DEBOUNCE_MS = 5000;

  const subscribe = () => {
    const userId = getUserId();
    if (!userId) return;
    const now = Date.now();
    if (userId === lastUserId && now - lastSubscribeAt < SUBSCRIBE_DEBOUNCE_MS) return;
    lastUserId = userId;
    lastSubscribeAt = now;
    socket.emit('wallet:subscribe', { userId });
  };

  socket.on('connect', subscribe);
  window.addEventListener('userLogin', subscribe);
  subscribe();

  return () => {
    socket.off('connect', subscribe);
    window.removeEventListener('userLogin', subscribe);
  };
}
