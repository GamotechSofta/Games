// Single backend: E:\Games\backend (same as frontend). Do not use any other backend.
// Set EXPO_PUBLIC_API_BASE_URL in .env for local override (e.g. http://YOUR_PC_IP:3010/api/v1).
// EAS build: set EXPO_PUBLIC_API_BASE_URL in EAS Secrets, or built app uses PRODUCTION_URL below.
const PRODUCTION_URL = 'https://games-backend-x9v7.onrender.com/api/v1';
const fromEnv =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL);
const base = (fromEnv && String(fromEnv).trim()) || PRODUCTION_URL;
export const API_BASE_URL = base.replace(/\/+$/, '');
