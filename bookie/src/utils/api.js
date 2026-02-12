const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

export const getBookieAuthHeaders = () => {
    const bookie = JSON.parse(localStorage.getItem('bookie') || '{}');
    const password = localStorage.getItem('bookiePassword') || sessionStorage.getItem('bookiePassword') || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${bookie.username}:${password}`)}`,
    };
};

export const getReferralUrl = (bookieId) => {
    return `${FRONTEND_URL}/login?ref=${bookieId}`;
};

export { API_BASE_URL, FRONTEND_URL };
