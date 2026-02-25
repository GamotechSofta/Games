import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { storage } from '../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../theme';

// Same image set as frontend KingBazaarMarket overrides
const KING_IMG_OVERRIDES = [
    'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_11_1_1_fqrqpr_xnt8al.png',
    'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_10_2_1_x8ji72_ugka1w.png',
    'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_3_1_qqgezq_lgd9wq.png',
    'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_4_1_wm47pu_qethnu.png',
    'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_7_1_b7mxik_dzpbre.png',
    'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_5_2_op4u73_o0eaqv.png',
    'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_8_1_zdpype_cn1gwg.png',
    'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_9_1_oc8usl_hzconw.png',
    'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_14_1_hmsbwv_twcatd.png',
];
const KING_DEFAULT_IMG = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770641576/Untitled_1080_x_1080_px_1_gyjbpl.svg';

export default function KingBazaarDashboard() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [balanceText, setBalanceText] = useState('0');

    useEffect(() => {
        storage.getItem('user').then((raw) => {
            try {
                const u = raw ? JSON.parse(raw) : {};
                const b = Number(u?.balance ?? u?.walletBalance ?? u?.wallet ?? 0) || 0;
                setBalanceText(b.toLocaleString('en-IN', { maximumFractionDigits: 0 }));
            } catch { setBalanceText('0'); }
        });
    }, []);

    const fetchGroups = async () => {
        try {
            setLoadingGroups(true);
            const res = await fetch(`${API_BASE_URL}/markets/king-bazaar-groups`);
            const data = await res.json();
            if (data?.success && Array.isArray(data?.data) && data.data.length > 0) {
                setGroups(data.data);
            } else {
                // Fallback: derive groups from market listing
                const marketsRes = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=king`);
                const marketsData = await marketsRes.json();
                const list = Array.isArray(marketsData?.data) ? marketsData.data : [];
                const groupMap = {};
                list.forEach((m) => {
                    const gKey = (m.kingBazaarGroup || '').toString().trim().toLowerCase();
                    const gLabel = (m.kingBazaarGroupLabel || m.kingBazaarGroup || m.marketName || '').toString().trim();
                    if (gKey && !groupMap[gKey]) groupMap[gKey] = { key: gKey, label: gLabel };
                });
                setGroups(Object.values(groupMap));
            }
        } catch {
            setGroups([]);
        } finally {
            setLoadingGroups(false);
        }
    };

    useEffect(() => { fetchGroups(); }, []);
    useRefreshOnMarketReset(fetchGroups);

    const openKingBazaarMarket = (key, label) => {
        navigation.navigate('KingBazaarMarket', {
            marketKey: key,
            marketLabel: label || 'King Bazaar',
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn} activeOpacity={0.8}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{t('markets.kingBazaar')}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Funds')} style={styles.walletBtn} activeOpacity={0.8}>
                    <Text style={styles.walletIcon}>💰</Text>
                    <Text style={styles.walletText}>{balanceText}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Groups Grid */}
            <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
                {loadingGroups ? (
                    [1, 2, 3].map((i) => (
                        <View key={i} style={styles.skeletonCard} />
                    ))
                ) : groups.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>{t('startlineDashboard.noMarkets')}</Text>
                    </View>
                ) : (
                    groups.map((m, idx) => {
                        const imgUrl = KING_IMG_OVERRIDES[idx % KING_IMG_OVERRIDES.length] || KING_DEFAULT_IMG;
                        return (
                            <TouchableOpacity
                                key={m.key}
                                onPress={() => openKingBazaarMarket(m.key, m.label)}
                                style={styles.marketCard}
                                activeOpacity={0.85}
                            >
                                <View style={styles.marketImageWrap}>
                                    <Image
                                        source={{ uri: imgUrl }}
                                        style={styles.marketImage}
                                        resizeMode="cover"
                                    />
                                </View>
                                <Text style={styles.marketLabel} numberOfLines={2}>{m.label}</Text>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.black },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[3] },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1, minWidth: 0 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
    headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800', letterSpacing: 0.5, flex: 1 },
    walletBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: 6 },
    walletIcon: { fontSize: 20 },
    walletText: { color: colors.text, fontWeight: '700', fontSize: fontSize.base },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: spacing[4] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing[4], gap: spacing[3], paddingBottom: 100 },
    skeletonCard: { width: '30%', height: 130, backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    emptyBox: { alignItems: 'center', paddingVertical: spacing[6] },
    emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: fontSize.sm },
    marketCard: { width: '30%', alignItems: 'center', padding: spacing[1] },
    marketImageWrap: {
        width: 80, height: 80,
        borderRadius: borderRadius['2xl'],
        overflow: 'hidden',
        marginBottom: spacing[1],
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.25)',
        backgroundColor: '#1a1a1a',
    },
    marketImage: { width: '100%', height: '100%' },
    marketLabel: {
        color: colors.goldText,
        fontSize: 11, fontWeight: '600',
        textAlign: 'center', lineHeight: 14,
    },
});
