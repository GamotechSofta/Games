// API Configuration – set EXPO_PUBLIC_API_BASE_URL in .env for production
export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  'http://localhost:3010/api/v1';
