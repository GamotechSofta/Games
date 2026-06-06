import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { clearUserAuth, getUserToken } from '../utils/auth';

const otpApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

otpApi.interceptors.request.use((config) => {
  const token = getUserToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

otpApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || '');
    const isAuthAttempt =
      url.includes('/users/login') ||
      url.includes('/users/signup') ||
      url.includes('/users/otp/');
    if (status === 401 && !isAuthAttempt) {
      clearUserAuth();
    }
    return Promise.reject(error);
  },
);

export const fetchMyProfile = async (token) => {
  const response = await otpApi.get('/users/me', token ? {
    headers: { Authorization: `Bearer ${token}` },
  } : undefined);
  return response.data;
};

const RETRYABLE_STATUSES = new Set([503, 504]);
const RETRY_DELAY_MS = 1200;
const MAX_LOGIN_ATTEMPTS = 3;

export const sendOtp = async ({ phone, purpose }) => {
  const response = await otpApi.post('/users/otp/send', { phone, purpose });
  return response.data;
};

export const verifyOtp = async ({ phone, otp, purpose, deviceId, firstName, lastName, referredBy }) => {
  const response = await otpApi.post('/users/otp/verify', {
    phone,
    otp,
    purpose,
    deviceId,
    firstName,
    lastName,
    referredBy,
  });
  return response.data;
};

export const resendOtp = async ({ phone }) => {
  const response = await otpApi.post('/users/otp/resend', { phone });
  return response.data;
};

export const loginWithPassword = async ({ phone, password, deviceId }, attempt = 0) => {
  try {
    const response = await otpApi.post('/users/login', { phone, password, deviceId });
    return response.data;
  } catch (err) {
    const status = err?.response?.status;
    const retriable = !status || RETRYABLE_STATUSES.has(status) || err?.code === 'ECONNABORTED';
    if (retriable && attempt < MAX_LOGIN_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      return loginWithPassword({ phone, password, deviceId }, attempt + 1);
    }
    throw err;
  }
};

export const signupUser = async ({ firstName, lastName, phone, password, referredBy, deviceId }) => {
  const response = await otpApi.post('/users/signup', {
    username: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    phone,
    email: `${phone}@player.local`,
    password,
    referredBy,
    deviceId,
  });
  return response.data;
};
