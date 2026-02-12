import KingBazaarGroup from '../models/kingBazaarGroup/kingBazaarGroup.js';
import Market from '../models/market/market.js';
import Admin from '../models/admin/admin.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import bcrypt from 'bcryptjs';

const DEFAULT_GROUPS = [
    { key: 'king-morning', label: 'King Morning Bazaar', order: 0 },
    { key: 'king-evening', label: 'King Evening Bazaar', order: 1 },
    { key: 'king-night', label: 'King Night Bazaar', order: 2 },
];

const slugFromLabel = (label) => {
    return String(label || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'king-bazaar';
};

/**
 * GET /markets/king-bazaar-groups – list all king bazaar markets (for tabs/cards).
 * If none exist, seeds default Morning/Evening/Night and returns them.
 */
export const getKingBazaarGroups = async (req, res) => {
    try {
        let list = await KingBazaarGroup.find().sort({ order: 1, key: 1 }).lean();
        if (list.length === 0) {
            for (const g of DEFAULT_GROUPS) {
                await KingBazaarGroup.findOneAndUpdate(
                    { key: g.key },
                    { key: g.key, label: g.label, order: g.order },
                    { upsert: true, new: true }
                );
            }
            list = await KingBazaarGroup.find().sort({ order: 1, key: 1 }).lean();
        }
        res.status(200).json({ success: true, data: list });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /markets/king-bazaar-groups – add a new king bazaar market (super admin).
 * Body: { label } (e.g. "King Afternoon Bazaar"). key is derived from label or can be passed.
 */
export const createKingBazaarGroup = async (req, res) => {
    try {
        const { label, key: keyParam } = req.body;
        const labelStr = (label || '').toString().trim();
        if (!labelStr) {
            return res.status(400).json({ success: false, message: 'label is required' });
        }
        const key = (keyParam && String(keyParam).trim().toLowerCase()) || slugFromLabel(labelStr);
        if (!key) {
            return res.status(400).json({ success: false, message: 'Could not derive key from label' });
        }
        const existing = await KingBazaarGroup.findOne({ key });
        if (existing) {
            return res.status(409).json({ success: false, message: 'A king bazaar market with this key already exists' });
        }
        const maxOrder = await KingBazaarGroup.find().sort({ order: -1 }).limit(1).select('order').lean();
        const order = (maxOrder[0]?.order ?? -1) + 1;
        const group = new KingBazaarGroup({ key, label: labelStr, order });
        await group.save();

        if (req.admin) {
            await logActivity({
                action: 'create_king_bazaar_group',
                performedBy: req.admin.username,
                performedByType: req.admin.role || 'super_admin',
                targetType: 'king_bazaar_group',
                targetId: group._id.toString(),
                details: `King Bazaar market "${labelStr}" (${key}) created`,
                ip: getClientIp(req),
            });
        }

        res.status(201).json({ success: true, data: group.toObject() });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'A king bazaar market with this key already exists' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /markets/king-bazaar-groups/:key – remove king bazaar market and all its slots (super admin).
 * Body: { secretDeclarePassword?: string } – required if admin has it set
 */
export const deleteKingBazaarGroup = async (req, res) => {
    try {
        const adminWithSecret = await Admin.findById(req.admin._id).select('+secretDeclarePassword').lean();
        if (adminWithSecret?.secretDeclarePassword) {
            const provided = (req.body?.secretDeclarePassword ?? '').toString().trim();
            const isValid = await bcrypt.compare(provided, adminWithSecret.secretDeclarePassword);
            if (!isValid) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid secret declare password. Enter the correct password to delete this King Bazaar market.',
                    code: 'INVALID_SECRET_DECLARE_PASSWORD',
                });
            }
        }

        const key = (req.params.key || '').toString().trim().toLowerCase();
        if (!key) {
            return res.status(400).json({ success: false, message: 'key is required' });
        }
        const group = await KingBazaarGroup.findOne({ key });
        if (!group) {
            return res.status(404).json({ success: false, message: 'King Bazaar market not found' });
        }

        const deletedSlots = await Market.deleteMany({ marketType: 'king', kingBazaarGroup: key });
        await KingBazaarGroup.deleteOne({ key });

        if (req.admin) {
            await logActivity({
                action: 'delete_king_bazaar_group',
                performedBy: req.admin.username,
                performedByType: req.admin.role || 'super_admin',
                targetType: 'king_bazaar_group',
                targetId: group._id.toString(),
                details: `King Bazaar market "${group.label}" (${key}) deleted; ${deletedSlots.deletedCount} slots removed`,
                ip: getClientIp(req),
            });
        }

        res.status(200).json({
            success: true,
            message: `King Bazaar market and ${deletedSlots.deletedCount} slot(s) deleted`,
            data: { deletedSlots: deletedSlots.deletedCount },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
