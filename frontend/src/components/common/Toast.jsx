import React, { useEffect } from 'react';

const TOAST_STYLES = {
  success: 'bg-green-100 text-green-700 border-green-300',
  error: 'bg-red-100 text-red-700 border-red-300',
};

const Toast = ({ toast, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose, duration]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`rounded-lg border px-4 py-3 shadow-lg ${TOAST_STYLES[toast.type] || TOAST_STYLES.error}`}>
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
    </div>
  );
};

export default Toast;
