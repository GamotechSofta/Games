const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

export const getAdminAuthHeaders = () => {
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    const password = localStorage.getItem('adminPassword') || sessionStorage.getItem('adminPassword') || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${admin.username}:${password}`)}`,
    };
};

export const clearAdminAuth = () => {
    localStorage.removeItem('admin');
    localStorage.removeItem('adminPassword');
    sessionStorage.removeItem('adminPassword');
};

export { API_BASE_URL };
