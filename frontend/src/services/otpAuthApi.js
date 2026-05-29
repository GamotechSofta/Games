import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { clearUserAuth, getUserToken } from '../utils/auth';

const otpApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
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
    const isAuthAttempt = url.includes('/users/login') || url.includes('/users/signup');
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

export const loginWithPassword = async ({ phone, password, deviceId }) => {
  const response = await otpApi.post('/users/login', { phone, password, deviceId });
  return response.data;
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
