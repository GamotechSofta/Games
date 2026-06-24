import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BettingWindowProvider, useBettingWindow } from './BettingWindowContext';
import useLiveMarket from '../../hooks/useLiveMarket';
import { isCloseDeclarationGame, CLOSE_DECLARATION_BETS_MESSAGE } from '../../utils/closeDeclarationBets';
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

function CloseDeclarationBetGuard({ title, scheduleForTomorrow, market, children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { closeOnly } = useBettingWindow();
    const blocked = !scheduleForTomorrow && closeOnly && isCloseDeclarationGame(title);

    if (!blocked) return children;

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('gameBid.bettingClosedTitle', { defaultValue: 'Betting closed for this game' })}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 max-w-md">
                {CLOSE_DECLARATION_BETS_MESSAGE}
            </p>
            <button
                type="button"
                onClick={() => navigate('/bidoptions', {
                    state: {
                        market,
                        ...(location.state?.scheduleForTomorrow && { scheduleForTomorrow: true }),
                        ...(location.state?.marketType && { marketType: location.state.marketType }),
                    },
                })}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#cca84d] text-[#4b3608] font-semibold"
            >
                {t('common.back')}
            </button>
        </div>
    );
}

const GameBid = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { market: initialMarket, betType } = location.state || {};
    const market = useLiveMarket(initialMarket, {
        marketType: location.state?.marketType || initialMarket?.marketType,
        groupKey: location.state?.kingBazaarMarketKey || location.state?.starlineMarketKey || '',
    });
    const scheduleForTomorrow =
        location.state?.scheduleForTomorrow === true ||
        (market &&
            market.status === 'closed' &&
            market.marketType !== 'startline' &&
            market.marketType !== 'king');

    useEffect(() => {
        if (!market && !location.state?.title) {
            navigate('/', { replace: true });
        }
    }, [market, location.state?.title, navigate]);

    const title = betType || location.state?.title || 'Select Bet Type';
    const key = title.toLowerCase().trim();
    const BidComponent = BID_COMPONENTS[key] || SingleDigitBid;

    return (
        <BettingWindowProvider market={market} scheduleForTomorrow={scheduleForTomorrow === true}>
            <CloseDeclarationBetGuard
                title={title}
                scheduleForTomorrow={scheduleForTomorrow === true}
                market={market}
            >
                <BidComponent market={market} title={title} />
            </CloseDeclarationBetGuard>
        </BettingWindowProvider>
    );
};

export default GameBid;
