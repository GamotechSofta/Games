import ActivityLog from '../models/activityLog/activityLog.js';
import Admin from '../models/admin/admin.js';
import bcrypt from 'bcryptjs';

/**
 * Get activity logs - super_admin only
 */
export const getLogs = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can view logs',
            });
        }

        const { page = 1, limit = 100, action, performedBy, performedByType, sort = 'desc' } = req.query;
        const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(500, Math.max(1, parseInt(limit, 10)));

        const query = {};
        if (action) query.action = new RegExp(action, 'i');
        if (performedBy) query.performedBy = new RegExp(performedBy, 'i');
        if (performedByType && ['admin', 'super_admin', 'bookie', 'user', 'system'].includes(performedByType)) {
            query.performedByType = performedByType;
        }

        const [logs, total] = await Promise.all([
            ActivityLog.find(query)
                .sort({ createdAt: sort === 'asc' ? 1 : -1 })
                .skip(skip)
                .limit(Math.min(500, Math.max(1, parseInt(limit, 10))))
                .lean(),
            ActivityLog.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total,
                totalPages: Math.ceil(total / parseInt(limit, 10)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete activity logs - super_admin only.
 * Query: olderThanDays (optional) - delete only logs older than N days; if omitted, delete all.
 * Body: { secretDeclarePassword?: string } – required if admin has secret declare password set.
 */
export const deleteLogs = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Super Admin can delete logs',
            });
        }

        const adminWithSecret = await Admin.findById(req.admin._id).select('+secretDeclarePassword').lean();
        if (adminWithSecret?.secretDeclarePassword) {
            const provided = (req.body?.secretDeclarePassword ?? '').toString().trim();
            const isValid = await bcrypt.compare(provided, adminWithSecret.secretDeclarePassword);
            if (!isValid) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid secret declare password. Enter the correct password to delete logs.',
                    code: 'INVALID_SECRET_DECLARE_PASSWORD',
                });
            }
        }

        const olderThanDays = req.query.olderThanDays ? parseInt(req.query.olderThanDays, 10) : null;
        const query = {};
        if (olderThanDays != null && Number.isFinite(olderThanDays) && olderThanDays > 0) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - olderThanDays);
            query.createdAt = { $lt: cutoff };
        }

        const result = await ActivityLog.deleteMany(query);
        res.status(200).json({
            success: true,
            message: `${result.deletedCount} log(s) deleted`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
