import React, { useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { SchedulingProvider, BettingWindowProvider } from './BettingWindowContext';
import SingleDigitBid from './bids/SingleDigitBid';
import SingleDigitBulkBid from './bids/SingleDigitBulkBid';
import JodiBid from './bids/JodiBid';
import JodiBulkBid from './bids/JodiBulkBid';
import SinglePanaBid from './bids/SinglePanaBid';
import SinglePanaBulkBid from './bids/SinglePanaBulkBid';
import DoublePanaBid from './bids/DoublePanaBid';
import DoublePanaBulkBid from './bids/DoublePanaBulkBid';
import TriplePanaBid from './bids/TriplePanaBid';
import FullSangamBid from './bids/FullSangamBid';
import HalfSangamABid from './bids/HalfSangamABid';
import HalfSangamBBid from './bids/HalfSangamBBid';
import HalfSangamBid from './bids/HalfSangamBid';

const BID_COMPONENTS = {
  'single digit': SingleDigitBid,
  'single digit bulk': SingleDigitBulkBid,
  'jodi': JodiBid,
  'jodi bulk': JodiBulkBid,
  'single pana': SinglePanaBid,
  'single pana bulk': SinglePanaBulkBid,
  'double pana': DoublePanaBid,
  'double pana bulk': DoublePanaBulkBid,
  'triple pana': TriplePanaBid,
  'full sangam': FullSangamBid,
  'half sangam': HalfSangamBid,
  'half sangam (a)': HalfSangamABid,
  'half sangam (o)': HalfSangamABid,
  'half sangam (b)': HalfSangamBBid,
  'half sangam (c)': HalfSangamBBid,
};

const GameBid = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { market, betType, scheduleForTomorrow, title: routeTitle } = route.params || {};

  useEffect(() => {
    if (!market && !routeTitle) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    }
  }, [market, routeTitle, navigation]);

  const title = betType || routeTitle || t('gameBid.selectBetType');
  const key = title.toLowerCase().trim();
  const BidComponent = BID_COMPONENTS[key] || SingleDigitBid;

  return (
    <SchedulingProvider>
      <BettingWindowProvider market={market} scheduleForTomorrow={scheduleForTomorrow}>
        <BidComponent market={market} title={title} scheduleForTomorrow={scheduleForTomorrow} betType={title} />
      </BettingWindowProvider>
    </SchedulingProvider>
  );
};

export default GameBid;
