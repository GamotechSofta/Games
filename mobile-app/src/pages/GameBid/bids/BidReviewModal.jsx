import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from '../../../hooks/useTranslation';
import { colors, spacing, borderRadius, fontSize } from '../../../theme';

const BidReviewModal = ({ open, rows, totalAmount, walletBefore, marketTitle, dateText, labelKey, onClose, onSubmit, totalBids }) => {
    const { t } = useTranslation();
    const [stage, setStage] = useState('review'); // 'review' | 'success' (frontend reference)
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setStage('review');
            setError('');
        }
    }, [open]);

    const before = Number(walletBefore) || 0;
    const amount = Number(totalAmount) || 0;
    const after = before - amount;
    const isInsufficient = after < 0;

    const handleSubmit = async (isRetry = false) => {
        setSubmitting(true);
        setError('');
        try {
            await onSubmit();
            setStage('success');
        } catch (e) {
            const msg = e?.message || 'Failed to place bet';
            const isRateLimit = msg && String(msg).toLowerCase().includes('too many requests');
            if (isRateLimit && !isRetry) {
                setError(t('gameBid.pleaseTryAgainShortly'));
                setSubmitting(false);
                setTimeout(() => {
                    setError('');
                    handleSubmit(true);
                }, 4500);
                return;
            }
            setError(isRateLimit ? t('gameBid.stillBusyRetryLater') : msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setStage('review');
        onClose?.();
    };

    const titleText = (marketTitle && dateText) ? `${marketTitle} - ${dateText}` : (marketTitle || dateText || t('gameBid.reviewBet'));

    return (
        <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                {stage === 'success' ? (
                    <View style={styles.sheet}>
                        <View style={styles.successContent}>
                            <View style={styles.successIconWrap}>
                                <Text style={styles.successCheck}>✓</Text>
                            </View>
                            <Text style={styles.successTitle}>{t('gameBid.betPlacedSuccessfully')}</Text>
                            <TouchableOpacity style={styles.successOkBtn} onPress={handleClose} activeOpacity={0.9}>
                                <Text style={styles.successOkText}>{t('gameBid.ok')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                <View style={styles.sheet}>
                    <View style={styles.titleBar}>
                        <Text style={styles.title}>{titleText}</Text>
                    </View>

                    <View style={styles.headerRow}>
                        <Text style={[styles.col, styles.colLeft]}>{labelKey}</Text>
                        <Text style={styles.col}>{t('gameBid.points')}</Text>
                        <Text style={styles.col}>{t('gameBid.type')}</Text>
                    </View>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {rows?.map((r, i) => (
                            <View key={r.id || i} style={styles.row}>
                                <Text style={[styles.cell, styles.cellLeft]} numberOfLines={1}>{r.number}</Text>
                                <Text style={[styles.cell, styles.cellPoints]}>{r.points}</Text>
                                <Text style={[styles.cell, styles.cellType]}>
                                    {r.type?.toUpperCase() === 'OPEN' ? t('gameBid.open') : r.type?.toUpperCase() === 'CLOSE' ? t('gameBid.close') : (r.type || '-')}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.summaryGrid}>
                        <View style={[styles.sumCell, styles.sumCellBorderR, styles.sumCellBorderB]}>
                            <Text style={styles.sumLabel}>{t('gameBid.totalBids')}</Text>
                            <Text style={styles.sumVal}>{totalBids || rows?.length || 0}</Text>
                        </View>
                        <View style={[styles.sumCell, styles.sumCellBorderB]}>
                            <Text style={styles.sumLabel}>{t('gameBid.totalBetAmount')}</Text>
                            <Text style={[styles.sumVal, styles.sumValGold]}>{amount}</Text>
                        </View>
                        <View style={[styles.sumCell, styles.sumCellBorderR]}>
                            <Text style={styles.sumLabel}>{t('gameBid.walletBalanceBeforeDeduction')}</Text>
                            <Text style={styles.sumVal}>{before.toFixed(1)}</Text>
                        </View>
                        <View style={styles.sumCell}>
                            <Text style={styles.sumLabel}>{t('gameBid.walletBalanceAfterDeduction')}</Text>
                            <Text style={[styles.sumVal, isInsufficient && styles.sumValDanger]}>{after.toFixed(1)}</Text>
                        </View>
                    </View>

                    {!!error && <Text style={styles.error}>{error}</Text>}
                    <Text style={styles.note}>{t('gameBid.betNoteCannotCancel')}</Text>

                    <View style={styles.btns}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={submitting}>
                            <Text style={styles.cancelText}>{t('gameBid.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmBtn, (submitting || isInsufficient) && styles.confirmBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting || isInsufficient}
                        >
                            {submitting ? (
                                <>
                                    <ActivityIndicator size="small" color="#4b3608" style={{ marginRight: 6 }} />
                                    <Text style={styles.confirmText}>{t('gameBid.placing')}</Text>
                                </>
                            ) : (
                                <Text style={styles.confirmText}>{t('gameBid.submitBet')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
    sheet: { backgroundColor: '#202124', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: '100%', maxWidth: 400, maxHeight: '90%' },
    titleBar: { backgroundColor: '#000', paddingVertical: 10, paddingHorizontal: spacing[3], borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    title: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' },
    headerRow: { flexDirection: 'row', paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[2] },
    col: { flex: 1, color: '#d4af37', fontSize: 11, fontWeight: '700', textAlign: 'center' },
    colLeft: { textAlign: 'left' },
    list: { maxHeight: 220, paddingHorizontal: spacing[3], paddingTop: spacing[2] },
    row: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: spacing[3], marginBottom: spacing[2], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cell: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    cellLeft: { textAlign: 'left', color: colors.text },
    cellPoints: { color: '#f2c14e' },
    cellType: { color: colors.textMuted, textTransform: 'uppercase' },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing[3], paddingHorizontal: spacing[3], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' },
    sumCell: { width: '50%', padding: spacing[3], alignItems: 'center' },
    sumCellBorderR: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
    sumCellBorderB: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    sumLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 2, textAlign: 'center' },
    sumVal: { color: colors.text, fontSize: fontSize.base, fontWeight: '700' },
    sumValGold: { color: '#f2c14e' },
    sumValDanger: { color: '#f87171' },
    note: { color: '#f87171', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: spacing[3], paddingHorizontal: spacing[3] },
    error: { color: colors.red, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing[2], paddingHorizontal: spacing[3] },
    btns: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4], paddingHorizontal: spacing[3], paddingBottom: spacing[4] },
    cancelBtn: { flex: 1, padding: spacing[3], borderRadius: 12, backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    cancelText: { color: colors.text, fontWeight: '700' },
    confirmBtn: { flex: 1, padding: spacing[3], borderRadius: 12, backgroundColor: '#d4af37', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    confirmBtnDisabled: { opacity: 0.5 },
    confirmText: { color: '#4b3608', fontWeight: '700' },
    successContent: { padding: spacing[6], alignItems: 'center' },
    successIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#43b36a', alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] },
    successCheck: { color: '#fff', fontSize: 40, fontWeight: '700' },
    successTitle: { color: '#43b36a', fontSize: fontSize.lg, fontWeight: '600', textAlign: 'center', marginBottom: spacing[6] },
    successOkBtn: { backgroundColor: '#d4af37', paddingVertical: spacing[4], paddingHorizontal: spacing[8], borderRadius: 12, minWidth: 160, alignItems: 'center' },
    successOkText: { color: '#4b3608', fontWeight: '700', fontSize: fontSize.base },
});

export default BidReviewModal;
