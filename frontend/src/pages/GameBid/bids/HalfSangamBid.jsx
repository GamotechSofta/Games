import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import HalfSangamABid from './HalfSangamABid';
import HalfSangamBBid from './HalfSangamBBid';

/**
 * Unified Half Sangam bid component with mode toggle.
 * Bids (Sangam, Amount, Delete) are preserved per mode when flipping.
 */
const HalfSangamBid = ({ market, title, scheduleForTomorrow }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('open');
    // Preserve bids per mode so Add to List does not reset when flipping
    const [openBids, setOpenBids] = useState([]);
    const [closeBids, setCloseBids] = useState([]);

    const isOpenMode = mode === 'open';
    const OpenLabel = t('gameRate.halfSangamOpen');
    const CloseLabel = t('gameRate.halfSangamClose');

    const flipButton = (
        <button
            type="button"
            onClick={() => setMode((m) => (m === 'open' ? 'close' : 'open'))}
            className="w-full px-4 py-2.5 min-h-[40px] rounded-full bg-[#202124] border border-white/10 text-gray-300 hover:text-white hover:border-[#d4af37]/50 text-sm font-semibold transition-all touch-manipulation"
            aria-label={isOpenMode ? 'Switch to Close (C)' : 'Switch to Open (O)'}
        >
            Flip
        </button>
    );

    return (
        <>
            {isOpenMode ? (
                <HalfSangamABid market={market} title={OpenLabel} scheduleForTomorrow={scheduleForTomorrow} slotBetweenPanaAndAnk={flipButton} bids={openBids} setBids={setOpenBids} />
            ) : (
                <HalfSangamBBid market={market} title={CloseLabel} scheduleForTomorrow={scheduleForTomorrow} slotBetweenPanaAndAnk={flipButton} bids={closeBids} setBids={setCloseBids} />
            )}
        </>
    );
};

export default HalfSangamBid;
