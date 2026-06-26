const PROFILE_KEY = 'admin';

export function getAdminProfile() {
    try {
        const raw = sessionStorage.getItem(PROFILE_KEY) || localStorage.getItem(PROFILE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/** JWT lives in httpOnly cookie — not readable from JavaScript. */
export function getAdminToken() {
    return '';
}

export function isAdminSessionValid() {
    return !!getAdminProfile();
}

export function setAdminSession({ profile }) {
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.removeItem('admin');
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    localStorage.removeItem('adminPassword');
    sessionStorage.removeItem('adminPassword');
}

export function clearAdminSession() {
    sessionStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem('admin');
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    localStorage.removeItem('adminPassword');
    sessionStorage.removeItem('adminPassword');
}
