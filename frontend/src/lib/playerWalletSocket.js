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

  const subscribe = () => {
    const userId = getUserId();
    if (!userId) return;
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
