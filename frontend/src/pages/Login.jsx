import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import aakdaLogo from '../config/logo';
import { loginWithPassword, sendOtp, signupUser, verifyOtp } from '../services/otpAuthApi';
import Toast from '../components/common/Toast';
import { useToast } from '../hooks/useToast';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref');
  const [isLogin, setIsLogin] = useState(!refParam);
  const [loginMode, setLoginMode] = useState('password');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isAbove18, setIsAbove18] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value,
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

  const handleSendOtp = async (isSignup = false) => {
    setError('');
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      setError('Please enter valid 10-digit phone number');
      return;
    }
    setOtpLoading(true);
    try {
      const data = await sendOtp(formData.phone);
      if (!data.success) {
        setError(data.message || 'Failed to send OTP');
        return;
      }
      if (isSignup) setSignupOtpSent(true);
      else setOtpSent(true);
      showToast(data.message || 'OTP sent successfully', 'success');
    } catch {
      setError('Network error');
      showToast('Failed to send OTP', 'error');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAbove18) return setError('Please confirm 18+');
    if (!/^[6-9]\d{9}$/.test(formData.phone)) return setError('Please enter valid phone number');

    if (isLogin) {
      if (loginMode === 'password' && !formData.password) return setError('Password is required');
      if (loginMode === 'otp' && !otpSent) return setError('Please send OTP first');
      if (loginMode === 'otp' && !/^\d{4,6}$/.test(otp)) return setError('Enter valid OTP');
    } else {
      if (!formData.firstName || !formData.lastName || !formData.password || !formData.confirmPassword) {
        return setError('All fields are required');
      }
      if (!signupOtpSent) return setError('Please send OTP first');
      if (!/^\d{4,6}$/.test(signupOtp)) return setError('Enter signup OTP');
      if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      let data;
      if (isLogin) {
        if (loginMode === 'otp') {
          data = await verifyOtp(formData.phone, otp);
        } else {
          data = await loginWithPassword({ phone: formData.phone, password: formData.password, deviceId: getDeviceId() });
        }
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

      localStorage.setItem('user', JSON.stringify(data.data || {}));
      if (data.token) localStorage.setItem('userToken', data.token);
      window.dispatchEvent(new Event('userLogin'));
      showToast(data.message || 'Authentication successful', 'success');
      navigate('/');
    } catch {
      setError('Network error');
      showToast('Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-[10px] border border-[#1e2b41] bg-[#0d1625] px-3 py-3 text-sm text-white placeholder:text-[#4c5b72] outline-none transition focus:border-red-500';

  return (
    <div className="min-h-screen bg-[#05070e] px-4 pt-14 pb-8">
      <Toast toast={toast} onClose={hideToast} />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-10">
        <div className="hidden lg:block lg:w-1/2">
          <img src={aakdaLogo} alt="Aakda" className="h-44 w-auto object-contain opacity-95" />
        </div>

        <div className="w-full max-w-[360px] rounded-2xl border border-[#1b2a43] bg-gradient-to-b from-[#0a1220] to-[#060c17] p-5 shadow-[0_0_50px_rgba(220,38,38,0.12)]">
          <div className="mb-4 flex border-b border-[#1d2a3e]">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 border-b-2 py-2 text-sm font-semibold ${isLogin ? 'border-red-500 text-red-500' : 'border-transparent text-[#9ba8bc]'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 border-b-2 py-2 text-sm font-semibold ${!isLogin ? 'border-red-500 text-red-500' : 'border-transparent text-[#9ba8bc]'}`}
            >
              Sign Up
            </button>
          </div>

          {error && <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {isLogin ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-[#d5deea]">Phone Number *</label>
                {loginMode === 'password' ? (
                  <input name="phone" value={formData.phone} onChange={handleChange} maxLength={10} placeholder="10-digit phone number" className={inputClass} />
                ) : (
                  <div className="flex gap-2">
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      maxLength={10}
                      placeholder="10-digit phone number"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => handleSendOtp(false)}
                      disabled={otpLoading}
                      className="rounded-[10px] bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                    >
                      {otpLoading ? '...' : (otpSent ? 'Resend' : 'Send')}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {isLogin && (
              <>
                <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-[#1e2b41] bg-[#0b1322] p-1">
                  <button type="button" onClick={() => setLoginMode('password')} className={`rounded-md py-2 text-xs font-semibold ${loginMode === 'password' ? 'bg-red-600 text-white' : 'text-[#8fa0b7]'}`}>Password</button>
                  <button type="button" onClick={() => setLoginMode('otp')} className={`rounded-md py-2 text-xs font-semibold ${loginMode === 'otp' ? 'bg-red-600 text-white' : 'text-[#8fa0b7]'}`}>OTP</button>
                </div>

                {loginMode === 'password' ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#d5deea]">Password *</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" className={`${inputClass} pr-12`} />
                      <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8fa0b7]">{showPassword ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#d5deea]">OTP *</label>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter OTP"
                      disabled={!otpSent}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                    />
                  </div>
                )}
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
                  <div className="flex gap-2">
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      maxLength={10}
                      placeholder="10-digit phone number"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => handleSendOtp(true)}
                      disabled={otpLoading}
                      className="rounded-[10px] bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                    >
                      {otpLoading ? '...' : (signupOtpSent ? 'Resend' : 'Send')}
                    </button>
                  </div>
                </div>

                <input
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Signup OTP"
                  disabled={!signupOtpSent}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                />

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

            <label className="flex items-start gap-2 text-[11px] text-[#8fa0b7]">
              <input type="checkbox" checked={isAbove18} onChange={(e) => setIsAbove18(e.target.checked)} className="mt-[2px]" />
              I confirm that I am above 18 years of age and agree to the <span className="text-red-500 underline">Terms of Use</span> and <span className="text-red-500 underline">Privacy Policy</span>
            </label>

            <button type="submit" disabled={loading || !isAbove18} className="w-full rounded-[10px] bg-gradient-to-r from-[#d7001f] to-[#ff1744] py-3 text-sm font-bold tracking-wide text-white hover:brightness-110 disabled:opacity-60">
              {loading ? 'Please wait...' : isLogin ? (loginMode === 'otp' ? 'VERIFY OTP' : 'SIGN IN') : 'SIGN UP'}
            </button>

            {isLogin && (
              <>
                <div className="relative py-1 text-center text-xs text-[#5d6b80] before:absolute before:left-0 before:top-1/2 before:h-px before:w-[45%] before:bg-[#22324a] after:absolute after:right-0 after:top-1/2 after:h-px after:w-[45%] after:bg-[#22324a]">
                  or
                </div>
                <button
                  type="button"
                  onClick={() => setLoginMode((prev) => (prev === 'otp' ? 'password' : 'otp'))}
                  className="w-full rounded-[10px] border border-[#2a3a52] bg-transparent py-3 text-sm font-semibold text-white hover:border-red-500"
                >
                  {loginMode === 'otp' ? 'Login with Password' : 'Login with OTP'}
                </button>
              </>
            )}
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
