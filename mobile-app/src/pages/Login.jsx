import React, { useState, useEffect } from 'react';
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
import { useRoute } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import { emit } from '../utils/events';
import { resetToHome } from '../navigationRef';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const LOGIN_BANNER = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770101961/Black_and_Gold_Classy_Casino_Night_Party_Instagram_Post_1080_x_1080_px_d1n00g.png';

// Eye icon components (simple SVG-like)
const EyeOpen = () => (
  <Text style={styles.eyeIcon}>👁</Text>
);
const EyeClosed = () => (
  <Text style={styles.eyeIcon}>👁‍🗨</Text>
);

export default function Login() {
  const { t } = useTranslation();
  const route = useRoute();
  const refParam = route.params?.ref ?? null;

  const [isLogin, setIsLogin] = useState(!refParam);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isAbove18, setIsAbove18] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // When ref param is present, default to signup tab
  useEffect(() => {
    if (refParam) setIsLogin(false);
  }, [refParam]);

  const handleChange = (name, value) => {
    let processedValue = value;
    if (name === 'phone') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    setError('');
  };

  const getDeviceId = async () => {
    try {
      let deviceId = await storage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        await storage.setItem('deviceId', deviceId);
      }
      return deviceId || '';
    } catch (e) {
      return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!isAbove18) {
      setError(t('login.mustBeAbove18'));
      return;
    }

    // Validation – match frontend exactly
    if (isLogin) {
      if (!formData.phone) {
        setError(t('login.phoneRequired'));
        return;
      }
      if (!formData.password) {
        setError(t('login.passwordRequired'));
        return;
      }
    } else {
      if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim() ||
          !formData.phone?.trim() || !formData.password || !formData.confirmPassword) {
        setError(t('login.allFieldsRequired'));
        return;
      }
      if (formData.password.length < 6) {
        setError(t('login.passwordMinLength'));
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError(t('login.passwordsDoNotMatch'));
        return;
      }
      // Backend requires 10-digit Indian phone (6–9) – same validation as backend
      const phoneDigits = (formData.phone || '').replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
        setError(t('login.validPhoneRequired'));
        return;
      }
    }

    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      // Same body shape as frontend: phone as string (digits), rest as-is
      const phone = (formData.phone || '').replace(/\D/g, '').slice(0, 10);

      let endpoint, body;
      if (isLogin) {
        endpoint = '/users/login';
        body = { phone, password: formData.password, deviceId: deviceId || undefined };
      } else {
        endpoint = '/users/signup';
        body = {
          username: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone,
          password: formData.password,
          referredBy: refParam || undefined,
          deviceId: deviceId || undefined,
        };
      }

      // Same URL pattern as frontend: API_BASE_URL + endpoint
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let data;
      try {
        data = await response.json();
      } catch (_) {
        setError(t('login.networkError'));
        return;
      }

      // Same success handling as frontend
      if (data.success) {
        const previousUser = await storage.getItem('user').catch(() => null);
        let previousCreatedAt = null;
        if (previousUser) {
          try {
            const parsed = JSON.parse(previousUser);
            previousCreatedAt = parsed?.createdAt ?? parsed?.created_at ?? parsed?.createdOn ?? null;
          } catch (e) {}
        }

        const userPayload = {
          ...(data.data || {}),
          _id: data.data?._id ?? data.data?.id,
          id: data.data?.id ?? data.data?._id,
          createdAt:
            data.data?.createdAt ??
            data.data?.created_at ??
            data.data?.createdOn ??
            (!isLogin ? new Date().toISOString() : previousCreatedAt),
        };

        await storage.setItem('user', JSON.stringify(userPayload));
        emit('userLogin');
        resetToHome();
      } else {
        setError(data.message || (isLogin ? t('login.loginFailed') : t('login.signupFailed')));
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
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
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

          {/* Login fields */}
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
                    value={formData.phone}
                    onChangeText={(v) => handleChange('phone', v)}
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
                    value={formData.password}
                    onChangeText={(v) => handleChange('password', v)}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((p) => !p)}>
                    {showPassword ? <EyeOpen /> : <EyeClosed />}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* Signup fields */}
          {!isLogin && (
            <>
              <View style={styles.row}>
                <View style={[styles.field, styles.half]}>
                  <Text style={styles.label}>{t('login.firstName')} <Text style={styles.asterisk}>*</Text></Text>
                  <TextInput
                    style={styles.inputPlain}
                    placeholder={t('login.firstName')}
                    placeholderTextColor={colors.placeholder}
                    value={formData.firstName}
                    onChangeText={(v) => handleChange('firstName', v)}
                    autoCapitalize="words"
                  />
                </View>
                <View style={[styles.field, styles.half]}>
                  <Text style={styles.label}>{t('login.lastName')} <Text style={styles.asterisk}>*</Text></Text>
                  <TextInput
                    style={styles.inputPlain}
                    placeholder={t('login.lastName')}
                    placeholderTextColor={colors.placeholder}
                    value={formData.lastName}
                    onChangeText={(v) => handleChange('lastName', v)}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t('login.emailAddress')} <Text style={styles.asterisk}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>✉</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.emailPlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={formData.email}
                    onChangeText={(v) => handleChange('email', v)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t('login.phoneNumber')} <Text style={styles.asterisk}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.phonePlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={formData.phone}
                    onChangeText={(v) => handleChange('phone', v)}
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
                    placeholder={t('login.createPasswordPlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={formData.password}
                    onChangeText={(v) => handleChange('password', v)}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((p) => !p)}>
                    {showPassword ? <EyeOpen /> : <EyeClosed />}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t('login.confirmPassword')} <Text style={styles.asterisk}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.confirmPasswordPlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={formData.confirmPassword}
                    onChangeText={(v) => handleChange('confirmPassword', v)}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword((p) => !p)}>
                    {showConfirmPassword ? <EyeOpen /> : <EyeClosed />}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* 18+ checkbox */}
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
            onPress={handleSubmit}
            disabled={loading || !isAbove18}
            activeOpacity={0.9}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#000" size="small" />
                <Text style={styles.submitText}>{t('common.pleaseWait')}</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>
                {isLogin ? t('login.signIn') : t('login.createAccount')}
              </Text>
            )}
          </TouchableOpacity>

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
  row: { flexDirection: 'row', gap: spacing[2] },
  half: { flex: 1 },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: 10 },
  asterisk: { color: colors.goldText },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceInput, borderWidth: 1, borderColor: colors.borderGray, borderRadius: borderRadius.xl, paddingLeft: 48, paddingRight: 48, paddingVertical: 14 },
  inputIcon: { position: 'absolute', left: 16, fontSize: 18 },
  input: { flex: 1, color: colors.text, fontSize: fontSize.base, paddingVertical: 0 },
  inputPlain: { backgroundColor: colors.surfaceInput, borderWidth: 1, borderColor: colors.borderGray, borderRadius: borderRadius.xl, paddingHorizontal: spacing[4], paddingVertical: 14, color: colors.text, fontSize: fontSize.base },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  eyeIcon: { fontSize: 18 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[5] },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.borderGray, backgroundColor: colors.surfaceInput, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  checkMark: { color: colors.text, fontWeight: '700', fontSize: 12 },
  checkLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  link: { color: colors.goldText, textDecorationLine: 'underline' },
  submitBtn: { width: '100%', backgroundColor: colors.goldLight, paddingVertical: 14, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', minHeight: 48, shadowColor: colors.goldLight, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  submitBtnDisabled: { opacity: 0.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  submitText: { color: colors.black, fontWeight: '700', fontSize: fontSize.sm, textTransform: 'uppercase' },
  legal: { marginTop: spacing[6], paddingBottom: spacing[4], paddingHorizontal: spacing[2] },
  legalText: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
