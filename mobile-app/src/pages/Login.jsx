import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import { emit } from '../utils/events';
import { navigate } from '../navigationRef';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const LOGIN_BANNER = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770101961/Black_and_Gold_Classy_Casino_Night_Party_Instagram_Post_1080_x_1080_px_d1n00g.png';

export default function Login() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAbove18, setIsAbove18] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!isAbove18) {
      setError(t('login.mustBeAbove18'));
      return;
    }
    if (!phone.trim()) {
      setError(t('login.phoneRequired'));
      return;
    }
    if (!password.trim()) {
      setError(t('login.passwordRequired'));
      return;
    }
    setLoading(true);
    try {
      const deviceId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim().replace(/\D/g, '').slice(0, 10),
          password,
          deviceId,
        }),
      });
      let data;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (_) {
        setError(t('login.networkError') + ' (invalid response)');
        return;
      }
      if (data.success && data.data) {
        await storage.setItem('user', JSON.stringify(data.data));
        emit('userLogin');
        navigate('Home');
      } else {
        setError(data.message || t('login.loginFailed'));
      }
    } catch (err) {
      const msg = err?.message || '';
      const isConnectionError =
        msg.includes('Network request failed') || msg.includes('Failed to fetch') ||
        msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT');
      setError(
        isConnectionError
          ? t('login.networkError') + ' Use your computer IP in .env (not localhost) and restart app.'
          : t('login.networkError')
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPhone('');
    setPassword('');
    setError('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <Image source={{ uri: LOGIN_BANNER }} style={styles.banner} resizeMode="contain" />
          <View style={styles.titleSection}>
            <Text style={styles.title}>
              {isLogin ? t('login.title') : t('login.createAccount')}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? t('login.subtitle') : 'Join us and start winning'}
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
              onPress={() => { setIsLogin(true); resetForm(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>{t('login.login')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
              onPress={() => { setIsLogin(false); resetForm(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>{t('login.signUp')}</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {isLogin && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>{t('login.phoneNumber')} <Text style={styles.asterisk}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.phonePlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={phone}
                    onChangeText={(v) => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t('login.password')} <Text style={styles.asterisk}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.passwordPlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(''); }}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setIsAbove18(!isAbove18)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, isAbove18 && styles.checkboxChecked]}>
                  {isAbove18 && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>
                  {t('login.above18')} <Text style={styles.link}>{t('login.termsOfUse')}</Text> {t('login.and')}{' '}
                  <Text style={styles.link}>{t('login.privacyPolicy')}</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, (loading || !isAbove18) && styles.submitBtnDisabled]}
                onPress={handleLogin}
                disabled={loading || !isAbove18}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.submitText}>{t('login.signIn')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {!isLogin && (
            <Text style={styles.comingSoon}>{t('common.comingSoon')} – {t('login.signUp')}</Text>
          )}

          <View style={styles.legal}>
            <Text style={styles.legalText}>
              {t('login.byContinuing')} <Text style={styles.link}>{t('login.termsOfUse')}</Text> {t('login.and')}{' '}
              <Text style={styles.link}>{t('login.privacyPolicy')}</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  scroll: { flexGrow: 1, paddingVertical: spacing[6], paddingHorizontal: spacing[4], minHeight: 500 },
  inner: { width: '100%', maxWidth: 448, alignSelf: 'center' },
  banner: { width: '100%', maxWidth: 240, height: 200, alignSelf: 'center', borderRadius: borderRadius.lg, marginBottom: spacing[6] },
  titleSection: { marginBottom: spacing[5] },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.goldText, textAlign: 'center', marginBottom: spacing[2] },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5], backgroundColor: colors.surfaceInput, borderRadius: borderRadius.xl, padding: 6, borderWidth: 1, borderColor: colors.borderGray },
  toggleBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: borderRadius.lg, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.goldLight, shadowColor: colors.goldLight, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  toggleText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.black },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4], padding: 14, backgroundColor: colors.redBg, borderWidth: 1, borderColor: colors.redBorder, borderRadius: borderRadius.xl },
  errorIcon: { fontSize: 20 },
  errorText: { flex: 1, color: colors.redText, fontSize: fontSize.sm },
  field: { marginBottom: spacing[4] },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: 10 },
  asterisk: { color: colors.goldText },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceInput, borderWidth: 1, borderColor: colors.borderGray, borderRadius: borderRadius.xl, paddingLeft: 48, paddingRight: spacing[4], paddingVertical: 14 },
  inputIcon: { position: 'absolute', left: 16, fontSize: 18 },
  input: { flex: 1, color: colors.text, fontSize: fontSize.base, paddingVertical: 0 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[5] },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.borderGray, backgroundColor: colors.surfaceInput, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  checkMark: { color: colors.text, fontWeight: '700', fontSize: 12 },
  checkLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  link: { color: colors.goldText, textDecorationLine: 'underline' },
  submitBtn: { width: '100%', backgroundColor: colors.goldLight, paddingVertical: 14, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', minHeight: 48, shadowColor: colors.goldLight, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.black, fontWeight: '700', fontSize: fontSize.sm, textTransform: 'uppercase' },
  comingSoon: { textAlign: 'center', color: colors.textMuted, marginBottom: spacing[6] },
  legal: { marginTop: spacing[6], paddingBottom: spacing[4], paddingHorizontal: spacing[2] },
  legalText: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
