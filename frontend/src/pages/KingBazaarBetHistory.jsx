import React from 'react';
import { useTranslation } from 'react-i18next';
import BetHistory from './BetHistory';

const KingBazaarBetHistory = () => {
  const { t } = useTranslation();
  return <BetHistory pageTitle={t('bids.kingBazaarBetHistory')} marketScope="king" />;
};

export default KingBazaarBetHistory;
