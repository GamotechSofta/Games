import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginWithPassword, signupUser } from '../services/otpAuthApi';
import Toast from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import aakdaLogo from '../config/logo';
import { schedulePostLoginPrefetch } from '../api/postLoginPrefetch';
import { setUserAuth } from '../utils/auth';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref');
  const [isLogin, setIsLogin] = useState(!refParam);
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleSubmit = async (e) => {
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
      void import('../pages/Home');
      navigate('/', { replace: true });
      schedulePostLoginPrefetch();
    } catch (err) {
      const message = getApiErrorMessage(err, 'Authentication failed');
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-[10px] border border-[#1e2b41] bg-[#0d1625] px-3 py-3 text-sm text-white placeholder:text-[#4c5b72] outline-none transition focus:border-red-500';

  return (
    <div
      className="min-h-screen px-4 pt-14 pb-8 bg-[#05070e] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "linear-gradient(rgba(5,7,14,0.72), rgba(5,7,14,0.78)), url('/login-bg.jpg')" }}
    >
      <Toast toast={toast} onClose={hideToast} />
      <div className="mb-5 flex justify-center lg:hidden">
        <img src={aakdaLogo} alt="Aakda" className="h-12 w-auto object-contain opacity-95" />
      </div>
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
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength={10}
                    placeholder="10-digit phone number"
                    className={inputClass}
                  />
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
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
