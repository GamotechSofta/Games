import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BettingWindowProvider, SchedulingProvider } from './BettingWindowContext';
import SingleDigitBid from './bids/SingleDigitBid';
import JodiBid from './bids/JodiBid';
import JodiBulkBid from './bids/JodiBulkBid';
import SinglePanaBid from './bids/SinglePanaBid';
import SinglePanaBulkBid from './bids/SinglePanaBulkBid';
import DoublePanaBid from './bids/DoublePanaBid';
import DoublePanaBulkBid from './bids/DoublePanaBulkBid';
import TriplePanaBid from './bids/TriplePanaBid';
import FullSangamBid from './bids/FullSangamBid';
import HalfSangamBid from './bids/HalfSangamBid';
import SpMotorBid from './bids/SpMotorBid';
import DpMotorBid from './bids/DpMotorBid';
import SpDpMotorBid from './bids/SpDpMotorBid';
import OddEvenBid from './bids/OddEvenBid';
import SpCommonBid from './bids/SpCommonBid';
import CpCommonBid from './bids/CpCommonBid';
import DpCommonBid from './bids/DpCommonBid';
import ChartBid from './bids/ChartBid';

const BID_COMPONENTS = {
    'odd even': OddEvenBid,
    'single digit': SingleDigitBid,
    'jodi': JodiBid,
    'jodi bulk': JodiBulkBid,
    'single pana': SinglePanaBid,
    'single pana bulk': SinglePanaBulkBid,
    'double pana': DoublePanaBid,
    'double pana bulk': DoublePanaBulkBid,
    'triple pana': TriplePanaBid,
    // Triple Pana Bulk option removed from UI; keep safety routing to normal Triple Pana.
    'triple pana bulk': TriplePanaBid,
    'full sangam': FullSangamBid,
    'half sangam': HalfSangamBid,
    'sp motor': SpMotorBid,
    'sp common': SpCommonBid,
    'cp': CpCommonBid,
    'cp (common pana)': CpCommonBid,
    'dp common': DpCommonBid,
    chart: ChartBid,
    'chart game': ChartBid,
    'dp motor': DpMotorBid,
    'sp dp motor': SpDpMotorBid,
    'sp dp t motor': SpDpMotorBid,
};

const GameBid = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { market, betType, scheduleForTomorrow } = location.state || {};

    useEffect(() => {
        if (scheduleForTomorrow) {
            try {
                sessionStorage.setItem('scheduleForTomorrow', '1');
            } catch {
                /* ignore */
            }
        }
        return () => {
            try {
                sessionStorage.removeItem('scheduleForTomorrow');
            } catch {
                /* ignore */
            }
        };
    }, [scheduleForTomorrow]);

    useEffect(() => {
        if (!market && !location.state?.title) {
            navigate('/', { replace: true });
        }
    }, [market, location.state?.title, navigate]);

    const title = betType || location.state?.title || 'Select Bet Type';
    const key = title.toLowerCase().trim();
    const BidComponent = BID_COMPONENTS[key] || SingleDigitBid;

    return (
        <SchedulingProvider scheduleForTomorrow={!!scheduleForTomorrow}>
            <BettingWindowProvider market={market} scheduleForTomorrow={!!scheduleForTomorrow}>
                <BidComponent market={market} title={title} scheduleForTomorrow={!!scheduleForTomorrow} />
            </BettingWindowProvider>
        </SchedulingProvider>
    );
};

export default GameBid;
