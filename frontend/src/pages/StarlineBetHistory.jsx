import React from 'react';
import { useTranslation } from 'react-i18next';
import BetHistory from './BetHistory';

const StarlineBetHistory = () => {
  const { t } = useTranslation();
  return <BetHistory pageTitle={t('bids.starlineBetHistory')} marketScope="starline" />;
};

export default StarlineBetHistory;
