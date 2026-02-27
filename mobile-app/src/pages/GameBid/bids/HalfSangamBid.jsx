import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from '../../../hooks/useTranslation';
import HalfSangamABid from './HalfSangamABid';
import HalfSangamBBid from './HalfSangamBBid';

/**
 * Unified Half Sangam bid with mode toggle (Open Pana+Close Ank vs Open Ank+Close Pana).
 * Shared bids list; flip only changes input mode.
 */
const HalfSangamBid = ({ market, title, scheduleForTomorrow }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('open');
    const [bids, setBids] = useState([]);

    const isOpenMode = mode === 'open';
    const OpenLabel = t('gameRate.halfSangamOpen');
    const CloseLabel = t('gameRate.halfSangamClose');

    const flipButton = (
        <TouchableOpacity
            style={s.flipBtn}
            onPress={() => setMode((m) => (m === 'open' ? 'close' : 'open'))}
            activeOpacity={0.8}
        >
            <Text style={s.flipBtnText}>{t('gameBid.flip')}</Text>
        </TouchableOpacity>
    );

    return (
        <>
            {isOpenMode ? (
                <HalfSangamABid market={market} title={OpenLabel} scheduleForTomorrow={scheduleForTomorrow} slotBetweenPanaAndAnk={flipButton} bids={bids} setBids={setBids} />
            ) : (
                <HalfSangamBBid market={market} title={CloseLabel} scheduleForTomorrow={scheduleForTomorrow} slotBetweenPanaAndAnk={flipButton} bids={bids} setBids={setBids} />
            )}
        </>
    );
};

const s = StyleSheet.create({
    flipBtn: { paddingVertical: 10, paddingHorizontal: 16, minHeight: 40, borderRadius: 24, backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    flipBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default HalfSangamBid;
