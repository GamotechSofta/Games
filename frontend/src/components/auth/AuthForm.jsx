import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginWithPassword, sendOtp, verifyOtp, resendOtp, signupUser } from '../../services/otpAuthApi';
import Toast from '../common/Toast';
import { useToast } from '../../hooks/useToast';
import { setUserAuth } from '../../utils/auth';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

const RESEND_COOLDOWN_SEC = 30;

/**
 * Reusable Login / Sign Up form (card only).
 * Used both by the full-screen Login page and the home-page auth popup.
 *
 * Props:
 * - initialPasswordLogin?: boolean — start in password mode (default OTP)
 * - onSuccess?: () => void — called after successful auth (defaults to navigate('/'))
 */
const AuthForm = ({ initialPasswordLogin = false, onSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref');

  const [isPasswordLogin, setIsPasswordLogin] = useState(initialPasswordLogin);
  const [isLogin, setIsLogin] = useState(!refParam);
  const [step, setStep] = useState('phone');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: '',
  });
  const [isAbove18, setIsAbove18] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const id = setInterval(() => setResendTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const handleAuthSuccess = () => {
    if (typeof onSuccess === 'function') onSuccess();
    else navigate('/', { replace: true });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'phone'
          ? value.replace(/\D/g, '').slice(0, 10)
          : name === 'otp'
            ? value.replace(/\D/g, '').slice(0, 6)
            : value,
    }));
    setError('');
  };

  const getDeviceId = () => {
    try {
      let deviceId = localStorage.getItem('deviceId') || '';
      if (!deviceId) {
        deviceId = crypto?.randomUUID?.() || `web-${Date.now()}`;
        localStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    } catch {
      return `web-${Date.now()}`;
    }
  };

  const resetOtpStep = () => {
    setStep('phone');
    setFormData((prev) => ({ ...prev, otp: '' }));
    setResendTimer(0);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAbove18) return setError('Please confirm 18+');
    if (!/^[6-9]\d{9}$/.test(formData.phone)) return setError('Please enter valid phone number');

    if (!isLogin && (!formData.firstName || !formData.lastName)) {
      return setError('First name and last name are required');
    }

    setLoading(true);
    try {
      const data = await sendOtp({
        phone: formData.phone,
        purpose: isLogin ? 'login' : 'signup',
      });
      if (!data.success) return setError(data.message || 'Failed to send OTP');

      setStep('otp');
      setResendTimer(RESEND_COOLDOWN_SEC);
      showToast(data.message || 'OTP sent to your phone', 'success');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to send OTP');
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.otp || formData.otp.length < 4) return setError('Please enter the OTP');

    setLoading(true);
    try {
      const data = await verifyOtp({
        phone: formData.phone,
        otp: formData.otp,
        purpose: isLogin ? 'login' : 'signup',
        deviceId: getDeviceId(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        referredBy: refParam || undefined,
      });
      if (!data.success) return setError(data.message || 'Verification failed');

      setUserAuth({ user: data.data || {}, token: data.token });
      showToast(data.message || 'Authentication successful', 'success');
      handleAuthSuccess();
    } catch (err) {
      const message = getApiErrorMessage(err, 'OTP verification failed');
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const data = await resendOtp({ phone: formData.phone });
      if (!data.success) return setError(data.message || 'Failed to resend OTP');
      setResendTimer(RESEND_COOLDOWN_SEC);
      showToast(data.message || 'OTP resent', 'success');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to resend OTP');
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAbove18) return setError('Please confirm 18+');
    if (!/^[6-9]\d{9}$/.test(formData.phone)) return setError('Please enter valid phone number');

    if (isLogin) {
      if (!formData.password) return setError('Password is required');
    } else {
      if (!formData.firstName || !formData.lastName || !formData.password || !formData.confirmPassword) {
        return setError('All fields are required');
      }
      if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      let data;
      if (isLogin) {
        data = await loginWithPassword({ phone: formData.phone, password: formData.password, deviceId: getDeviceId() });
      } else {
        data = await signupUser({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          password: formData.password,
          referredBy: refParam || undefined,
          deviceId: getDeviceId(),
        });
      }
      if (!data.success) return setError(data.message || 'Request failed');

      setUserAuth({ user: data.data || {}, token: data.token });
      showToast(data.message || 'Authentication successful', 'success');
      handleAuthSuccess();
    } catch (err) {
      const message = getApiErrorMessage(err, 'Authentication failed');
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (loginMode) => {
    setIsLogin(loginMode);
    setError('');
    resetOtpStep();
  };

  const inputClass =
    'w-full rounded-[10px] border border-[#1e2b41] bg-[#0d1625] px-3 py-3 text-sm text-white placeholder:text-[#4c5b72] outline-none transition focus:border-red-500';

  const otpInputClass =
    'w-full rounded-[10px] border border-[#1e2b41] bg-[#0d1625] px-3 py-3 text-center text-lg tracking-[0.4em] text-white placeholder:text-[#4c5b72] outline-none transition focus:border-red-500';

  return (
    <div className="w-full max-w-[360px] rounded-2xl border border-[#1b2a43] bg-gradient-to-b from-[#0a1220] to-[#060c17] p-5 shadow-[0_0_50px_rgba(220,38,38,0.12)]">
      <Toast toast={toast} onClose={hideToast} />
      <div className="mb-4 flex border-b border-[#1d2a3e]">
        <button
          type="button"
          onClick={() => switchTab(true)}
          className={`flex-1 border-b-2 py-2 text-sm font-semibold ${isLogin ? 'border-red-500 text-red-500' : 'border-transparent text-[#9ba8bc]'}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => switchTab(false)}
          className={`flex-1 border-b-2 py-2 text-sm font-semibold ${!isLogin ? 'border-red-500 text-red-500' : 'border-transparent text-[#9ba8bc]'}`}
        >
          Sign Up
        </button>
      </div>

      {error && <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

      {isPasswordLogin ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          {isLogin && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#d5deea]">Phone Number *</label>
                <input name="phone" value={formData.phone} onChange={handleChange} maxLength={10} placeholder="10-digit phone number" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#d5deea]">Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" className={`${inputClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8fa0b7]">{showPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>
            </>
          )}

          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" className={inputClass} />
                <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#d5deea]">Phone Number *</label>
                <input name="phone" value={formData.phone} onChange={handleChange} maxLength={10} placeholder="10-digit phone number" className={inputClass} />
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Create Password" className={`${inputClass} pr-12`} />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8fa0b7]">{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password" className={`${inputClass} pr-12`} />
                <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8fa0b7]">{showConfirmPassword ? 'Hide' : 'Show'}</button>
              </div>
            </>
          )}

          <label className="flex items-start gap-2 text-[11px] leading-4 text-[#8fa0b7]">
            <input type="checkbox" checked={isAbove18} onChange={(e) => setIsAbove18(e.target.checked)} className="mt-[2px]" />
            <span>
              I confirm that I am above 18 years of age and agree to the <span className="text-red-500 underline">Terms of Use</span> and <span className="text-red-500 underline">Privacy Policy</span>
            </span>
          </label>

          <button type="submit" disabled={loading || !isAbove18} className="w-full rounded-[10px] bg-gradient-to-r from-[#d7001f] to-[#ff1744] py-3 text-sm font-bold tracking-wide text-white hover:brightness-110 disabled:opacity-60">
            {loading ? 'Please wait...' : isLogin ? 'SIGN IN' : 'SIGN UP'}
          </button>

          <button type="button" onClick={() => { setIsPasswordLogin(false); resetOtpStep(); setError(''); }} className="w-full text-center text-xs text-[#8fa0b7] underline hover:text-white">
            Use OTP login instead
          </button>
        </form>
      ) : step === 'phone' ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-2">
              <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" className={inputClass} />
              <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className={inputClass} />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-[#d5deea]">Phone Number *</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              maxLength={10}
              placeholder="10-digit phone number"
              className={inputClass}
            />
          </div>

          <label className="flex items-start gap-2 text-[11px] leading-4 text-[#8fa0b7]">
            <input type="checkbox" checked={isAbove18} onChange={(e) => setIsAbove18(e.target.checked)} className="mt-[2px]" />
            <span>
              I confirm that I am above 18 years of age and agree to the <span className="text-red-500 underline">Terms of Use</span> and <span className="text-red-500 underline">Privacy Policy</span>
            </span>
          </label>

          <button type="submit" disabled={loading || !isAbove18} className="w-full rounded-[10px] bg-gradient-to-r from-[#d7001f] to-[#ff1744] py-3 text-sm font-bold tracking-wide text-white hover:brightness-110 disabled:opacity-60">
            {loading ? 'Sending OTP...' : 'SEND OTP'}
          </button>

          <button type="button" onClick={() => { setIsPasswordLogin(true); setError(''); }} className="w-full text-center text-xs text-[#8fa0b7] underline hover:text-white">
            Login with password instead
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <p className="text-center text-xs text-[#8fa0b7]">
            Enter the OTP sent to <span className="text-white">+91 {formData.phone}</span>
          </p>

          <div>
            <label className="mb-1 block text-center text-xs font-medium text-[#d5deea]">OTP *</label>
            <input
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="------"
              className={otpInputClass}
            />
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-[10px] bg-gradient-to-r from-[#d7001f] to-[#ff1744] py-3 text-sm font-bold tracking-wide text-white hover:brightness-110 disabled:opacity-60">
            {loading ? 'Verifying...' : isLogin ? 'VERIFY & SIGN IN' : 'VERIFY & SIGN UP'}
          </button>

          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={resetOtpStep} className="text-[#8fa0b7] underline hover:text-white">
              Change number
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendTimer > 0 || loading}
              className="text-[#8fa0b7] underline hover:text-white disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AuthForm;
