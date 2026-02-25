// Single backend: E:\Games\backend (same as frontend). Do not use any other backend.
// Set EXPO_PUBLIC_API_BASE_URL in .env for device testing (e.g. http://YOUR_PC_IP:3010/api/v1).
const fromEnv =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL);
const base = (fromEnv && String(fromEnv).trim()) || 'http://localhost:3010/api/v1';
export const API_BASE_URL = base.replace(/\/+$/, '');
