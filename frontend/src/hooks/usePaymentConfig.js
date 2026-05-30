import { useEffect } from 'react';
import {
  PAYMENT_CONFIG_DEFAULTS,
  fetchPaymentConfig,
} from '../api/paymentConfig';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchPaymentConfigThunk,
  selectPaymentConfig,
  selectPaymentConfigStatus,
} from '../store/slices/paymentConfigSlice';

export { PAYMENT_CONFIG_DEFAULTS, fetchPaymentConfig } from '../api/paymentConfig';

export function paymentConfigQueryKey() {
  return ['paymentConfig'];
}

export default function usePaymentConfig() {
  const dispatch = useAppDispatch();
  const config = useAppSelector(selectPaymentConfig);
  const { isFetching } = useAppSelector(selectPaymentConfigStatus);

  useEffect(() => {
    void dispatch(fetchPaymentConfigThunk());
  }, [dispatch]);

  return {
    config: config || PAYMENT_CONFIG_DEFAULTS,
    isFetching,
  };
}
