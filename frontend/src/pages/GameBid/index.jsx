import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    // Half Sangam: unified UI with Open (O) / Close (C) toggle
    'half sangam': HalfSangamBid,
    // Legacy keys for direct navigation (e.g. deep links)
    'half sangam (a)': HalfSangamABid,
    'half sangam (o)': HalfSangamABid,
    'half sangam (b)': HalfSangamBBid,
    'half sangam (c)': HalfSangamBBid,
};

const GameBid = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { market, betType, scheduleForTomorrow } = location.state || {};

    useEffect(() => {
        if (!market && !location.state?.title) {
            navigate('/', { replace: true });
        }
    }, [market, location.state?.title, navigate]);

    const title = betType || location.state?.title || t('gameBid.selectBetType');
    const key = title.toLowerCase().trim();
    const BidComponent = BID_COMPONENTS[key] || SingleDigitBid;

    return (
        <SchedulingProvider>
            <BettingWindowProvider market={market} scheduleForTomorrow={scheduleForTomorrow}>
                <BidComponent market={market} title={title} scheduleForTomorrow={scheduleForTomorrow} />
            </BettingWindowProvider>
        </SchedulingProvider>
    );
};

export default GameBid;
