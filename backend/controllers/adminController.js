import Admin from '../models/admin/admin.js';
import bcrypt from 'bcryptjs';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import { encrypt, decrypt } from '../utils/encryption.js';

/**
 * Admin login
 * Body: { username, password }
 */
export const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required',
            });
        }

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        if (admin.role === 'bookie') {
            return res.status(403).json({
                success: false,
                message: 'Use the Bookie Panel to login with this account.',
                code: 'USE_BOOKIE_PANEL',
            });
        }

        const performedByType = admin.role === 'super_admin' ? 'super_admin' : (admin.role === 'specific_admin' ? 'specific_admin' : 'bookie');
        await logActivity({
            action: 'admin_login',
            performedBy: admin.username,
            performedByType,
            targetType: 'admin',
            targetId: admin._id.toString(),
            details: `${admin.username} logged in (${admin.role === 'super_admin' ? 'Admin Panel' : admin.role === 'specific_admin' ? 'Specific Admin Panel' : 'Bookie Panel'})`,
            ip: getClientIp(req),
        });

        const data = {
            id: admin._id,
            username: admin.username,
            role: admin.role,
        };
        if (admin.role === 'specific_admin' && Array.isArray(admin.allowedTabs)) {
            data.allowedTabs = admin.allowedTabs;
        }
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create admin (for initial setup)
 * Body: { username, password }
 */
export const createAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
        }

        const admin = new Admin({ username, password });
        await admin.save();

        await logActivity({
            action: 'create_admin',
            performedBy: 'System',
            performedByType: 'system',
            targetType: 'admin',
            targetId: admin._id.toString(),
            details: `Super admin "${username}" created`,
            ip: getClientIp(req),
        });

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: {
                id: admin._id,
                username: admin.username,
                role: admin.role,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Admin with this username already exists',
            });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

const PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * Create bookie (Admin collection with role 'bookie')
 * Only super_admin can create. Bookie logs in to Bookie Panel with phone + password.
 * Body: { username | (firstName + lastName), password, email, phone }
 */
export const createBookie = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can create bookies',
            });
        }

        const { username, firstName, lastName, email, password, phone, bookieType, commissionPercentage, upiId } = req.body;

        const derivedUsername = (firstName != null && lastName != null)
            ? `${String(firstName).trim()} ${String(lastName).trim()}`.trim()
            : (username != null ? String(username).trim() : '');

        if (!derivedUsername) {
            return res.status(400).json({
                success: false,
                message: 'Username or both First name and Last name are required',
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required',
            });
        }

        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required (bookies log in with phone + password)',
            });
        }

        const trimmedPhone = phone.replace(/\D/g, '').slice(0, 10);
        if (!PHONE_REGEX.test(trimmedPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number (starting with 6–9)',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
        }

        const existingBookie = await Admin.findOne({
            $or: [
                { username: derivedUsername },
                { phone: trimmedPhone },
                ...(email ? [{ email: email.toLowerCase() }] : []),
            ].filter(Boolean),
        });
        if (existingBookie) {
            if (existingBookie.phone === trimmedPhone) {
                return res.status(409).json({ success: false, message: 'A bookie with this phone number already exists' });
            }
            if (email && existingBookie.email === email.toLowerCase()) {
                return res.status(409).json({ success: false, message: 'A bookie with this email already exists' });
            }
            return res.status(409).json({ success: false, message: 'A bookie with this name already exists' });
        }

        // Validate bookieType
        const validBookieTypes = ['admin_collects', 'bookie_collects'];
        const finalBookieType = validBookieTypes.includes(bookieType) ? bookieType : 'admin_collects';

        // Validate commission percentage
        let finalCommission = 0;
        if (commissionPercentage !== undefined && commissionPercentage !== null) {
            finalCommission = Math.min(100, Math.max(0, Number(commissionPercentage) || 0));
        }

        // Encrypt UPI ID(s) if provided
        const upiIdsRaw = req.body.upiIds;
        const ids = Array.isArray(upiIdsRaw) ? upiIdsRaw : (upiId != null ? [upiId] : []);
        const trimmedUpi = ids.map((id) => String(id || '').trim()).filter(Boolean);
        const encryptedUpiList = trimmedUpi.map((id) => encrypt(id));
        const encryptedUpi = encryptedUpiList[0] || '';

        const bookie = new Admin({
            username: derivedUsername,
            password,
            role: 'bookie',
            email: (email && String(email).trim()) ? email.trim().toLowerCase() : '',
            phone: trimmedPhone,
            status: 'active',
            bookieType: finalBookieType,
            commissionPercentage: finalCommission,
            upiId: encryptedUpi,
            upiIds: encryptedUpiList,
        });
        await bookie.save();

        await logActivity({
            action: 'create_bookie',
            performedBy: req.admin?.username || 'Admin',
            performedByType: req.admin?.role || 'admin',
            targetType: 'bookie',
            targetId: bookie._id.toString(),
            details: `Bookie "${bookie.username}" created`,
            ip: getClientIp(req),
        });

        res.status(201).json({
            success: true,
            message: 'Bookie created successfully. They can log in to the Bookie Panel with phone + password.',
            data: {
                id: bookie._id,
                username: bookie.username,
                role: bookie.role,
                email: bookie.email,
                phone: bookie.phone,
                status: bookie.status,
                bookieType: bookie.bookieType,
                commissionPercentage: bookie.commissionPercentage,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Username already exists',
            });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all super admins
 * Only super_admin can access
 */
export const getAllSuperAdmins = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can view super admins',
            });
        }

        const admins = await Admin.find({ role: 'super_admin' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: admins.length,
            data: admins,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Tab options that can be assigned to a specific admin */
const SPECIFIC_ADMIN_TABS = [
    '/dashboard', '/all-users', '/markets', '/add-result', '/update-rate', '/bet-history',
    '/reports', '/revenue', '/payment-management', '/daily-settlement', '/wallet', '/help-desk', '/logs',
];

/**
 * Create specific admin (login number + password + allowed tabs + optional secret password)
 * Only super_admin can create. Body: { username, password, allowedTabs[], secretDeclarePassword? }
 */
export const createSpecificAdmin = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can create specific admins',
            });
        }
        const { username, password, allowedTabs, secretDeclarePassword } = req.body;
        const loginNumber = (username || '').toString().trim();
        if (!loginNumber) {
            return res.status(400).json({
                success: false,
                message: 'Login number (username) is required',
            });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password is required and must be at least 6 characters',
            });
        }
        const secretVal = (secretDeclarePassword ?? '').toString().trim();
        if (!secretVal || secretVal.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'Secret password is required (min 4 characters)',
            });
        }
        const validTabs = Array.isArray(allowedTabs)
            ? allowedTabs.filter((t) => typeof t === 'string' && SPECIFIC_ADMIN_TABS.includes(t.trim()))
            : [];
        const admin = new Admin({
            username: loginNumber,
            password,
            role: 'specific_admin',
            allowedTabs: validTabs,
            secretDeclarePassword: secretVal,
        });
        await admin.save();

        await logActivity({
            action: 'create_specific_admin',
            performedBy: req.admin.username,
            performedByType: 'super_admin',
            targetType: 'admin',
            targetId: admin._id.toString(),
            details: `Specific admin "${loginNumber}" created with ${validTabs.length} tab(s)`,
            ip: getClientIp(req),
        });

        res.status(201).json({
            success: true,
            message: 'Specific admin created successfully',
            data: {
                id: admin._id,
                username: admin.username,
                role: admin.role,
                allowedTabs: admin.allowedTabs,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A user with this login number already exists',
            });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all specific admins (no passwords, includes hasSecretDeclarePassword flag)
 * Only super_admin can access
 */
export const getAllSpecificAdmins = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can view specific admins',
            });
        }
        const admins = await Admin.find({ role: 'specific_admin' })
            .select('-password +secretDeclarePassword')
            .sort({ createdAt: -1 })
            .lean();
        const data = admins.map((a) => {
            const hasSecret = !!(a.secretDeclarePassword && String(a.secretDeclarePassword).length > 0);
            const { secretDeclarePassword, ...rest } = a;
            return { ...rest, hasSecretDeclarePassword: hasSecret };
        });
        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update specific admin (allowedTabs, password, and/or secretDeclarePassword)
 * Only super_admin. Body: { allowedTabs?, password?, secretDeclarePassword? } – pass '' or null to clear secret
 */
export const updateSpecificAdmin = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can update specific admins',
            });
        }
        const { id } = req.params;
        const { allowedTabs, password, secretDeclarePassword } = req.body;
        const specific = await Admin.findOne({ _id: id, role: 'specific_admin' }).select('+secretDeclarePassword');
        if (!specific) {
            return res.status(404).json({
                success: false,
                message: 'Specific admin not found',
            });
        }
        if (Array.isArray(allowedTabs)) {
            specific.allowedTabs = allowedTabs.filter((t) => typeof t === 'string' && SPECIFIC_ADMIN_TABS.includes(t.trim()));
        }
        if (password != null && String(password).length >= 6) {
            specific.password = password;
        }
        if (secretDeclarePassword !== undefined) {
            const secretVal = (secretDeclarePassword ?? '').toString().trim();
            if (secretVal.length > 0 && secretVal.length < 4) {
                return res.status(400).json({
                    success: false,
                    message: 'Secret password must be at least 4 characters if set',
                });
            }
            specific.secretDeclarePassword = secretVal.length > 0 ? secretVal : null;
        }
        await specific.save();

        await logActivity({
            action: 'update_specific_admin',
            performedBy: req.admin.username,
            performedByType: 'super_admin',
            targetType: 'admin',
            targetId: specific._id.toString(),
            details: `Specific admin "${specific.username}" updated`,
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: 'Specific admin updated',
            data: {
                id: specific._id,
                username: specific.username,
                role: specific.role,
                allowedTabs: specific.allowedTabs,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete specific admin
 * Only super_admin
 */
export const deleteSpecificAdmin = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can delete specific admins',
            });
        }
        const { id } = req.params;
        const specific = await Admin.findOne({ _id: id, role: 'specific_admin' });
        if (!specific) {
            return res.status(404).json({
                success: false,
                message: 'Specific admin not found',
            });
        }
        const username = specific.username;
        await Admin.deleteOne({ _id: id, role: 'specific_admin' });

        await logActivity({
            action: 'delete_specific_admin',
            performedBy: req.admin.username,
            performedByType: 'super_admin',
            targetType: 'admin',
            targetId: id,
            details: `Specific admin "${username}" deleted`,
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: 'Specific admin deleted',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all bookies
 * Only super_admin can access
 */
export const getAllBookies = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can view bookies',
            });
        }

        const bookies = await Admin.find({ role: 'bookie' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: bookies.length,
            data: bookies,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get single bookie by ID
 * Only super_admin can access
 */
export const getBookieById = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can view bookie details',
            });
        }

        const { id } = req.params;

        const bookie = await Admin.findOne({ _id: id, role: 'bookie' }).select('-password').lean();
        if (!bookie) {
            return res.status(404).json({
                success: false,
                message: 'Bookie not found',
            });
        }

        // Include decrypted UPI(s) for admin to view/edit
        let upiIdDecrypted = '';
        let upiIdsDecrypted = [];
        if (bookie.upiIds && Array.isArray(bookie.upiIds) && bookie.upiIds.length > 0) {
            upiIdsDecrypted = bookie.upiIds.map((enc) => (enc ? (() => { try { return decrypt(enc); } catch { return ''; } })() : '')).filter(Boolean);
            upiIdDecrypted = upiIdsDecrypted[0] || '';
        } else if (bookie.upiId) {
            try { upiIdDecrypted = decrypt(bookie.upiId); if (upiIdDecrypted) upiIdsDecrypted = [upiIdDecrypted]; } catch { /* keep empty */ }
        }
        const data = { ...bookie, upiIdDecrypted, upiIdsDecrypted };

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update bookie
 * Only super_admin can update
 * Body: { username | (firstName + lastName), email, phone, status, password (optional), uiTheme }
 */
export const updateBookie = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can update bookies',
            });
        }

        const { id } = req.params;
        const { username, firstName, lastName, email, phone, status, password, uiTheme, bookieType, commissionPercentage, upiId } = req.body;

        const bookie = await Admin.findOne({ _id: id, role: 'bookie' });
        if (!bookie) {
            return res.status(404).json({
                success: false,
                message: 'Bookie not found',
            });
        }

        const derivedUsername = (firstName != null && lastName != null)
            ? `${String(firstName).trim()} ${String(lastName).trim()}`.trim()
            : (username != null ? String(username).trim() : null);

        if (derivedUsername) {
            if (derivedUsername !== bookie.username) {
                const existingBookie = await Admin.findOne({ username: derivedUsername });
                if (existingBookie) {
                    return res.status(409).json({
                        success: false,
                        message: 'A bookie with this name already exists',
                    });
                }
                bookie.username = derivedUsername;
            }
        }

        if (email !== undefined) bookie.email = email ? String(email).trim().toLowerCase() : '';
        if (phone !== undefined) {
            const trimmedPhone = String(phone).replace(/\D/g, '').slice(0, 10);
            if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 10-digit phone number (starting with 6–9)',
                });
            }
            const newPhone = trimmedPhone || '';
            if (newPhone && newPhone !== bookie.phone) {
                const existingByPhone = await Admin.findOne({ phone: newPhone });
                if (existingByPhone) {
                    return res.status(409).json({
                        success: false,
                        message: 'A bookie with this phone number already exists',
                    });
                }
            }
            bookie.phone = newPhone;
        }
        if (status && ['active', 'inactive'].includes(status)) bookie.status = status;
        if (uiTheme && typeof uiTheme === 'object') {
            if (!bookie.uiTheme) bookie.uiTheme = { themeId: 'default' };
            const validThemeIds = ['default', 'gold', 'blue', 'green', 'red', 'purple'];
            if (uiTheme.themeId && validThemeIds.includes(uiTheme.themeId)) bookie.uiTheme.themeId = uiTheme.themeId;
            if (uiTheme.primaryColor !== undefined) bookie.uiTheme.primaryColor = uiTheme.primaryColor ? String(uiTheme.primaryColor).trim() : undefined;
            if (uiTheme.accentColor !== undefined) bookie.uiTheme.accentColor = uiTheme.accentColor ? String(uiTheme.accentColor).trim() : undefined;
        }
        // Update bookieType
        if (bookieType !== undefined) {
            const validBookieTypes = ['admin_collects', 'bookie_collects'];
            if (validBookieTypes.includes(bookieType)) bookie.bookieType = bookieType;
        }

        // Update commission percentage
        if (commissionPercentage !== undefined && commissionPercentage !== null) {
            bookie.commissionPercentage = Math.min(100, Math.max(0, Number(commissionPercentage) || 0));
        }

        // Update UPI ID(s) - accept upiId (single) or upiIds (array)
        const upiIdsRaw = req.body.upiIds;
        if (upiIdsRaw !== undefined) {
            const ids = Array.isArray(upiIdsRaw) ? upiIdsRaw : (req.body.upiId != null ? [req.body.upiId] : []);
            const trimmed = ids.map((id) => String(id || '').trim()).filter(Boolean);
            bookie.upiIds = trimmed.map((id) => encrypt(id));
            bookie.upiId = trimmed[0] ? encrypt(trimmed[0]) : '';
        } else if (upiId !== undefined) {
            const t = upiId && String(upiId).trim();
            bookie.upiIds = t ? [encrypt(t)] : [];
            bookie.upiId = t ? encrypt(t) : '';
        }

        // Update password if provided
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters',
                });
            }
            bookie.password = password;
        }

        await bookie.save();

        await logActivity({
            action: 'update_bookie',
            performedBy: req.admin?.username || 'Admin',
            performedByType: req.admin?.role || 'admin',
            targetType: 'bookie',
            targetId: bookie._id.toString(),
            details: `Bookie "${bookie.username}" updated`,
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: 'Bookie updated successfully',
            data: {
                id: bookie._id,
                username: bookie.username,
                email: bookie.email,
                phone: bookie.phone,
                status: bookie.status,
                role: bookie.role,
                uiTheme: bookie.uiTheme,
                bookieType: bookie.bookieType,
                commissionPercentage: bookie.commissionPercentage,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Username already exists',
            });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete bookie
 * Only super_admin can delete
 * Body: { secretDeclarePassword?: string } – required if admin has it set
 */
export const deleteBookie = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can delete bookies',
            });
        }

        const adminWithSecret = await Admin.findById(req.admin._id).select('+secretDeclarePassword').lean();
        if (adminWithSecret?.secretDeclarePassword) {
            const provided = (req.body.secretDeclarePassword ?? '').toString().trim();
            const isValid = await bcrypt.compare(provided, adminWithSecret.secretDeclarePassword);
            if (!isValid) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid secret declare password',
                    code: 'INVALID_SECRET_DECLARE_PASSWORD',
                });
            }
        }

        const { id } = req.params;

        const bookie = await Admin.findOne({ _id: id, role: 'bookie' });
        if (!bookie) {
            return res.status(404).json({
                success: false,
                message: 'Bookie not found',
            });
        }

        const username = bookie.username;
        await Admin.findByIdAndDelete(id);

        await logActivity({
            action: 'delete_bookie',
            performedBy: req.admin?.username || 'Admin',
            performedByType: req.admin?.role || 'admin',
            targetType: 'bookie',
            targetId: id,
            details: `Bookie "${username}" deleted`,
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: 'Bookie deleted successfully',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Toggle bookie status (active/inactive)
 * Only super_admin can toggle.
 * Body: { secretDeclarePassword?: string } – required if admin has it set
 */
export const toggleBookieStatus = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can toggle bookie status',
            });
        }
        const adminWithSecret = await Admin.findById(req.admin._id).select('+secretDeclarePassword').lean();
        if (adminWithSecret?.secretDeclarePassword) {
            const provided = (req.body.secretDeclarePassword ?? '').toString().trim();
            const isValid = await bcrypt.compare(provided, adminWithSecret.secretDeclarePassword);
            if (!isValid) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid secret declare password. Please enter the correct password.',
                    code: 'INVALID_SECRET_DECLARE_PASSWORD',
                });
            }
        }
        const { id } = req.params;

        const bookie = await Admin.findOne({ _id: id, role: 'bookie' });
        if (!bookie) {
            return res.status(404).json({
                success: false,
                message: 'Bookie not found',
            });
        }

        bookie.status = bookie.status === 'active' ? 'inactive' : 'active';
        await bookie.save();

        await logActivity({
            action: 'toggle_bookie_status',
            performedBy: req.admin?.username || 'Admin',
            performedByType: req.admin?.role || 'admin',
            targetType: 'bookie',
            targetId: bookie._id.toString(),
            details: `Bookie "${bookie.username}" ${bookie.status === 'active' ? 'activated' : 'deactivated'}`,
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: `Bookie ${bookie.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: bookie._id,
                username: bookie.username,
                status: bookie.status,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /admin/me/upi
 * Get admin's own UPI ID(s) (decrypted)
 * Returns upiIds array; backward compatible: if upiIds empty, uses legacy upiId
 */
export const getAdminUpi = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id).select('upiId upiIds').lean();
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        let upiIds = [];
        if (admin.upiIds && Array.isArray(admin.upiIds) && admin.upiIds.length > 0) {
            upiIds = admin.upiIds.map((enc) => (enc ? decrypt(enc) : '')).filter(Boolean);
        } else if (admin.upiId) {
            const dec = decrypt(admin.upiId);
            if (dec) upiIds = [dec];
        }
        res.status(200).json({ success: true, data: { upiIds, upiId: upiIds[0] || '' } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /admin/me/upi
 * Set/update admin's UPI ID(s)
 * Body: { upiIds: string[] } - array of UPI IDs
 */
export const setAdminUpi = async (req, res) => {
    try {
        const { upiIds: rawIds, upiId: singleUpi } = req.body;
        const admin = await Admin.findById(req.admin._id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        const ids = Array.isArray(rawIds) ? rawIds : (rawIds != null ? [rawIds] : (singleUpi != null ? [singleUpi] : []));
        const trimmed = ids.map((id) => String(id || '').trim()).filter(Boolean);
        admin.upiIds = trimmed.map((id) => encrypt(id));
        admin.upiId = trimmed[0] ? encrypt(trimmed[0]) : ''; // keep legacy field for backward compat
        await admin.save({ validateBeforeSave: false });

        await logActivity({
            action: 'update_upi_id',
            performedBy: admin.username,
            performedByType: admin.role === 'super_admin' ? 'super_admin' : 'bookie',
            targetType: 'admin',
            targetId: admin._id.toString(),
            details: `UPI IDs updated by ${admin.username} (${trimmed.length} ID(s))`,
            ip: getClientIp(req),
        });

        res.status(200).json({ success: true, message: 'UPI IDs saved successfully', data: { upiIds: trimmed } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /admin/verify-secret-declare-password
 * Super admin only. Verifies the secret declare password. Body: { secretDeclarePassword: string }
 */
export const verifySecretDeclarePassword = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id).select('+secretDeclarePassword').lean();
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        if (!admin.secretDeclarePassword || admin.secretDeclarePassword.length === 0) {
            return res.status(200).json({ success: true, message: 'No secret password set' });
        }
        const provided = (req.body?.secretDeclarePassword ?? '').toString().trim();
        const isValid = await bcrypt.compare(provided, admin.secretDeclarePassword);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Invalid secret declare password',
                code: 'INVALID_SECRET_DECLARE_PASSWORD',
            });
        }
        res.status(200).json({ success: true, message: 'Password verified' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /admin/me/secret-declare-password-status
 * Any admin (super_admin or specific_admin). Returns whether logged-in admin has secret declare password set.
 */
export const getSecretDeclarePasswordStatus = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id).select('+secretDeclarePassword').lean();
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        res.status(200).json({
            success: true,
            hasSecretDeclarePassword: !!(admin.secretDeclarePassword && admin.secretDeclarePassword.length > 0),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /admin/me/secret-declare-password
 * Super admin only. Set or update secret declare password.
 * Body: { secretDeclarePassword: string } – min 4 chars
 *       { currentSecretDeclarePassword: string } – required when updating (if you remember it)
 *       { adminLoginPassword: string } – alternative when forgot secret: use admin login password to reset
 */
export const setSecretDeclarePassword = async (req, res) => {
    try {
        const { secretDeclarePassword, currentSecretDeclarePassword, adminLoginPassword } = req.body;
        const val = (secretDeclarePassword ?? '').toString().trim();
        if (val.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'Secret declare password must be at least 4 characters',
            });
        }
        const admin = await Admin.findById(req.admin._id).select('+secretDeclarePassword');
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        // If secret is already set, require verification: either current secret OR admin login password (forgot flow)
        if (admin.secretDeclarePassword && admin.secretDeclarePassword.length > 0) {
            const current = (currentSecretDeclarePassword ?? '').toString().trim();
            const adminPwd = (adminLoginPassword ?? '').toString().trim();
            if (current) {
                const isMatch = await admin.compareSecretDeclarePassword(current);
                if (!isMatch) {
                    return res.status(401).json({
                        success: false,
                        message: 'Current secret password is incorrect',
                    });
                }
            } else if (adminPwd) {
                const isLoginMatch = await admin.comparePassword(adminPwd);
                if (!isLoginMatch) {
                    return res.status(401).json({
                        success: false,
                        message: 'Admin login password is incorrect',
                    });
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Enter current secret password, or your admin login password if you forgot it',
                });
            }
        }
        admin.secretDeclarePassword = val;
        await admin.save({ validateBeforeSave: false });
        await logActivity({
            action: 'set_secret_declare_password',
            performedBy: req.admin.username,
            performedByType: 'super_admin',
            targetType: 'admin',
            targetId: admin._id.toString(),
            details: 'Secret declare password updated',
            ip: getClientIp(req),
        });
        res.status(200).json({
            success: true,
            message: 'Secret declare password set successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
