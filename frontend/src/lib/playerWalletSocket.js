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
  const SUBSCRIBE_DEBOUNCE_MS = 2000;

  const subscribe = (force = false) => {
    const userId = getUserId();
    if (!userId) return;
    const now = Date.now();
    if (!force && userId === lastUserId && now - lastSubscribeAt < SUBSCRIBE_DEBOUNCE_MS) return;
    lastUserId = userId;
    lastSubscribeAt = now;
    socket.emit('wallet:subscribe', { userId });
  };

  const onConnect = () => subscribe(true);
  const onUserLogin = () => subscribe(true);

  socket.on('connect', onConnect);
  window.addEventListener('userLogin', onUserLogin);
  subscribe(true);

  return () => {
    socket.off('connect', onConnect);
    window.removeEventListener('userLogin', onUserLogin);
  };
}
