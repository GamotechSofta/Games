import { useCallback, useState } from 'react';

export const useToast = () => {
  const [toast, setToast] = useState(null);

  const hideToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  return { toast, showToast, hideToast };
};
