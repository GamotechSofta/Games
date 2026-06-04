import Admin from '../models/admin/admin.js';

/** Whether this admin may use telecaller APIs. */
export async function adminHasTelecallerAccess(adminId, role) {
    if (role === 'super_admin' || role === 'telecaller') return true;
    if (role === 'specific_admin') {
        const doc = await Admin.findById(adminId).select('allowedTabs').lean();
        const tabs = doc?.allowedTabs || [];
        return tabs.includes('/all-users') || tabs.includes('/telecaller');
    }
    return false;
}
