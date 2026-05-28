import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MobileNumberInput from '../components/auth/MobileNumberInput';
import OtpInput from '../components/auth/OtpInput';
import AuthButton from '../components/auth/AuthButton';
import Toast from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import { sendOtp, verifyOtp } from '../services/otpAuthApi';
import { setUserAuth } from '../utils/auth';

const MOBILE_REGEX = /^[6-9]\d{9}$/;

const OtpLogin = () => {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const isPhoneValid = useMemo(() => MOBILE_REGEX.test(phone), [phone]);

  const handleSendOtp = async () => {
    if (!isPhoneValid) {
      showToast('Enter a valid Indian mobile number', 'error');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await sendOtp(phone);
      setIsOtpSent(true);
      showToast(response.message || 'OTP sent successfully', 'success');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Failed to send OTP'
        : 'Failed to send OTP';
      showToast(message, 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!isPhoneValid) {
      showToast('Enter a valid Indian mobile number', 'error');
      return;
    }
    if (!/^\d{4,6}$/.test(otp)) {
      showToast('Enter a valid 4-6 digit OTP', 'error');
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await verifyOtp(phone, otp);
      setUserAuth({ user: response.data, token: response.token });
      showToast(response.message || 'Login successful', 'success');
      navigate('/');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || 'OTP verification failed'
        : 'OTP verification failed';
      showToast(message, 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-100 to-white px-4 py-10">
      <Toast toast={toast} onClose={hideToast} />
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">OTP Authentication</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter your mobile number to receive OTP from MSG91. New users are auto-registered after verification.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Use password login instead
        </button>

        <div className="mt-6 space-y-4">
          <MobileNumberInput value={phone} onChange={setPhone} disabled={sendingOtp || verifyingOtp || isOtpSent} />
          {isOtpSent && <OtpInput value={otp} onChange={setOtp} disabled={verifyingOtp} />}
        </div>

        <div className="mt-6 space-y-3">
          {!isOtpSent ? (
            <AuthButton loading={sendingOtp} disabled={!isPhoneValid} onClick={handleSendOtp}>
              Send OTP
            </AuthButton>
          ) : (
            <>
              <AuthButton loading={verifyingOtp} disabled={!otp} onClick={handleVerifyOtp}>
                Verify OTP
              </AuthButton>
              <button
                type="button"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setIsOtpSent(false);
                  setOtp('');
                }}
              >
                Change Number
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpLogin;
