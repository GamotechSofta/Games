import axios from 'axios';

const rawBase = import.meta.env.VITE_ADMIN_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';
const baseURL = String(rawBase).replace(/\/api\/v1\/?$/, '');

const api = axios.create({
    baseURL,
    timeout: 15000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const adminApi = api;
export default api;
