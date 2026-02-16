import DailySettlement from '../models/settlement/dailySettlement.js';
import Admin from '../models/admin/admin.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';

/**
 * Parse date string (YYYY-MM-DD) to start of day in UTC
 */
const parseSettlementDate = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
};

/**
 * Admin: Get all settlements with filters (bookieType, bookieId, date range)
 * Bookie: Get own settlements only
 */
export const getSettlements = async (req, res) => {
    try {
        const { bookieType, bookieId, startDate, endDate } = req.query;
        const isBookie = req.admin?.role === 'bookie';

        const query = {};

        if (isBookie) {
            query.bookieId = req.admin._id;
        } else {
            if (bookieType) query.bookieType = bookieType;
            if (bookieId) query.bookieId = bookieId;
        }

        if (startDate || endDate) {
            query.settlementDate = {};
            if (startDate) {
                const from = parseSettlementDate(startDate);
                if (from) query.settlementDate.$gte = from;
            }
            if (endDate) {
                const to = parseSettlementDate(endDate);
                if (to) {
                    to.setUTCDate(to.getUTCDate() + 1);
                    query.settlementDate.$lt = to;
                }
            }
            if (Object.keys(query.settlementDate).length === 0) delete query.settlementDate;
        }

        const settlements = await DailySettlement.find(query)
            .populate('bookieId', 'username phone bookieType')
            .populate('createdBy', 'username role')
            .sort({ settlementDate: -1, createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, data: settlements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create settlement request:
 * - Admin Collects: Bookie creates (bookie requests money from admin) - bookie is the requester
 * - Bookie Collects: Admin creates (admin requests money from bookie)
 */
export const createSettlement = async (req, res) => {
    try {
        const { bookieId, bookieType, settlementDate, amount, remarks } = req.body;
        const isBookie = req.admin?.role === 'bookie';

        if (!settlementDate || amount == null || amount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Settlement date and amount (>= 0) are required',
            });
        }

        const parsedDate = parseSettlementDate(settlementDate);
        if (!parsedDate) {
            return res.status(400).json({ success: false, message: 'Invalid settlement date (use YYYY-MM-DD)' });
        }

        let finalBookieId = bookieId;
        let finalBookieType = bookieType;

        if (isBookie) {
            // Bookie creates: only admin_collects type (bookie requests commission from admin)
            finalBookieId = req.admin._id;
            const bookieDoc = await Admin.findById(req.admin._id).select('bookieType').lean();
            finalBookieType = bookieDoc?.bookieType || 'admin_collects';
            if (finalBookieType !== 'admin_collects') {
                return res.status(400).json({
                    success: false,
                    message: 'Only Admin Collects bookies can request money from admin',
                });
            }
        } else {
            // Admin creates: only bookie_collects type (admin requests platform charge from bookie)
            if (!bookieId) {
                return res.status(400).json({ success: false, message: 'Bookie is required' });
            }
            const bookieDoc = await Admin.findById(bookieId).select('bookieType role').lean();
            if (!bookieDoc || bookieDoc.role !== 'bookie') {
                return res.status(400).json({ success: false, message: 'Invalid bookie' });
            }
            finalBookieType = bookieDoc.bookieType || 'admin_collects';
            if (finalBookieType !== 'bookie_collects') {
                return res.status(400).json({
                    success: false,
                    message: 'Only Bookie Collects bookies can receive money requests from admin',
                });
            }
            if (bookieType && bookieType !== finalBookieType) {
                return res.status(400).json({
                    success: false,
                    message: `Bookie type mismatch. This bookie is "${finalBookieType}"`,
                });
            }
        }

        const settlement = await DailySettlement.create({
            bookieId: finalBookieId,
            bookieType: finalBookieType,
            settlementDate: parsedDate,
            amount: Number(amount),
            remarks: remarks || '',
            status: 'pending',
            createdBy: req.admin._id,
        });

        await settlement.populate([
            { path: 'bookieId', select: 'username phone bookieType' },
            { path: 'createdBy', select: 'username role' },
        ]);

        await logActivity({
            action: 'settlement_create',
            performedBy: req.admin.username,
            performedByType: req.admin.role,
            targetType: 'settlement',
            targetId: settlement._id.toString(),
            details: `${finalBookieType === 'admin_collects' ? 'Commission' : 'Platform charge'} ₹${amount} for ${settlement.bookieId?.username || 'bookie'} (pending bookie confirmation)`,
            ip: getClientIp(req),
        });

        res.status(201).json({ success: true, data: settlement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Mark payment as sent (Admin Collects flow - admin pays bookie, then clicks Payment Sent)
 */
export const markPaymentSent = async (req, res) => {
    try {
        if (req.admin?.role === 'bookie') {
            return res.status(403).json({ success: false, message: 'Only admin can mark payment sent' });
        }

        const { id } = req.params;
        const settlement = await DailySettlement.findById(id);

        if (!settlement) {
            return res.status(404).json({ success: false, message: 'Settlement not found' });
        }

        if (settlement.bookieType !== 'admin_collects') {
            return res.status(400).json({ success: false, message: 'Only Admin Collects flow uses Payment Sent' });
        }

        if (settlement.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Can only mark payment sent for pending requests' });
        }

        settlement.status = 'payment_sent';
        await settlement.save();

        await settlement.populate([
            { path: 'bookieId', select: 'username phone bookieType' },
            { path: 'createdBy', select: 'username role' },
        ]);

        await logActivity({
            action: 'settlement_payment_sent',
            performedBy: req.admin.username,
            performedByType: req.admin.role,
            targetType: 'settlement',
            targetId: settlement._id.toString(),
            details: `Admin marked payment ₹${settlement.amount} sent to ${settlement.bookieId?.username || 'bookie'}. Awaiting bookie confirmation.`,
            ip: getClientIp(req),
        });

        res.status(200).json({ success: true, data: settlement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Bookie: Confirm settlement - "I have paid" (bookie_collects) or "I have received" (admin_collects)
 * Admin Collects: bookie can confirm only when status is payment_sent (admin has sent payment)
 * Bookie Collects: bookie can confirm when status is pending (admin requested)
 */
export const bookieConfirmSettlement = async (req, res) => {
    try {
        if (req.admin?.role !== 'bookie') {
            return res.status(403).json({ success: false, message: 'Only bookie can confirm' });
        }

        const { id } = req.params;
        const settlement = await DailySettlement.findById(id).populate('bookieId', 'username bookieType');

        if (!settlement) {
            return res.status(404).json({ success: false, message: 'Settlement not found' });
        }

        const bid = (settlement.bookieId?._id || settlement.bookieId)?.toString();
        if (bid !== req.admin._id.toString()) {
            return res.status(403).json({ success: false, message: 'This settlement is not for you' });
        }

        const bType = settlement.bookieType || settlement.bookieId?.bookieType;
        const allowedStatus = bType === 'admin_collects' ? 'payment_sent' : 'pending';
        if (settlement.status !== allowedStatus) {
            return res.status(400).json({
                success: false,
                message: bType === 'admin_collects'
                    ? 'Admin must mark payment sent before you can confirm receipt'
                    : 'Settlement already processed',
            });
        }

        // Admin Collects: bookie confirms received → auto-approved (no admin Accept step)
        // Bookie Collects: bookie confirms paid → status bookie_confirmed, admin then Accept/Reject
        settlement.status = bType === 'admin_collects' ? 'approved' : 'bookie_confirmed';
        settlement.bookieConfirmedAt = new Date();
        if (bType === 'admin_collects') {
            settlement.adminProcessedAt = new Date();
            settlement.adminRemarks = 'Auto-approved (bookie confirmed received)';
        }
        await settlement.save();

        await settlement.populate([
            { path: 'bookieId', select: 'username phone bookieType' },
            { path: 'createdBy', select: 'username role' },
        ]);

        await logActivity({
            action: 'settlement_bookie_confirm',
            performedBy: req.admin.username,
            performedByType: 'bookie',
            targetType: 'settlement',
            targetId: settlement._id.toString(),
            details: `Bookie confirmed ${settlement.bookieType === 'admin_collects' ? 'received' : 'paid'} ₹${settlement.amount}`,
            ip: getClientIp(req),
        });

        res.status(200).json({ success: true, data: settlement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Approve settlement (after bookie confirmed)
 */
export const approveSettlement = async (req, res) => {
    try {
        if (req.admin?.role === 'bookie') {
            return res.status(403).json({ success: false, message: 'Only admin can approve' });
        }

        const { id } = req.params;
        const { adminRemarks } = req.body || {};

        const settlement = await DailySettlement.findById(id);
        if (!settlement) {
            return res.status(404).json({ success: false, message: 'Settlement not found' });
        }

        if (settlement.status !== 'bookie_confirmed') {
            return res.status(400).json({ success: false, message: 'Only settlements awaiting verification (after bookie confirmed) can be approved' });
        }

        settlement.status = 'approved';
        settlement.adminProcessedAt = new Date();
        settlement.adminRemarks = adminRemarks || 'Approved';
        await settlement.save();

        await settlement.populate([
            { path: 'bookieId', select: 'username phone bookieType' },
            { path: 'createdBy', select: 'username role' },
        ]);

        await logActivity({
            action: 'settlement_approve',
            performedBy: req.admin.username,
            performedByType: req.admin.role,
            targetType: 'settlement',
            targetId: settlement._id.toString(),
            details: `Settlement ₹${settlement.amount} approved for ${settlement.bookieId?.username || 'bookie'}`,
            ip: getClientIp(req),
        });

        res.status(200).json({ success: true, data: settlement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Reject settlement (after bookie confirmed)
 */
export const rejectSettlement = async (req, res) => {
    try {
        if (req.admin?.role === 'bookie') {
            return res.status(403).json({ success: false, message: 'Only admin can reject' });
        }

        const { id } = req.params;
        const { adminRemarks } = req.body || {};

        const settlement = await DailySettlement.findById(id);
        if (!settlement) {
            return res.status(404).json({ success: false, message: 'Settlement not found' });
        }

        const rejectable = ['pending', 'payment_sent', 'bookie_confirmed'];
        if (!rejectable.includes(settlement.status)) {
            return res.status(400).json({ success: false, message: 'Cannot reject this settlement' });
        }

        settlement.status = 'rejected';
        settlement.adminProcessedAt = new Date();
        settlement.adminRemarks = adminRemarks || 'Rejected';
        await settlement.save();

        await settlement.populate([
            { path: 'bookieId', select: 'username phone bookieType' },
            { path: 'createdBy', select: 'username role' },
        ]);

        await logActivity({
            action: 'settlement_reject',
            performedBy: req.admin.username,
            performedByType: req.admin.role,
            targetType: 'settlement',
            targetId: settlement._id.toString(),
            details: `Settlement ₹${settlement.amount} rejected for ${settlement.bookieId?.username || 'bookie'}`,
            ip: getClientIp(req),
        });

        res.status(200).json({ success: true, data: settlement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Update settlement (only when pending)
 */
export const updateSettlement = async (req, res) => {
    try {
        if (req.admin?.role === 'bookie') {
            return res.status(403).json({ success: false, message: 'Only admin can update settlements' });
        }

        const { id } = req.params;
        const { amount, remarks } = req.body;

        const settlement = await DailySettlement.findById(id);
        if (!settlement) {
            return res.status(404).json({ success: false, message: 'Settlement not found' });
        }

        if (settlement.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Can only edit pending settlements' });
        }

        if (amount != null && amount >= 0) settlement.amount = Number(amount);
        if (remarks !== undefined) settlement.remarks = remarks || '';
        await settlement.save();

        await settlement.populate([
            { path: 'bookieId', select: 'username phone bookieType' },
            { path: 'createdBy', select: 'username role' },
        ]);

        res.status(200).json({ success: true, data: settlement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Delete settlement (only when pending)
 */
export const deleteSettlement = async (req, res) => {
    try {
        if (req.admin?.role === 'bookie') {
            return res.status(403).json({ success: false, message: 'Only admin can delete settlements' });
        }

        const settlement = await DailySettlement.findById(req.params.id);
        if (!settlement) {
            return res.status(404).json({ success: false, message: 'Settlement not found' });
        }
        if (settlement.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Can only delete pending settlements' });
        }
        await DailySettlement.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: 'Settlement deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
