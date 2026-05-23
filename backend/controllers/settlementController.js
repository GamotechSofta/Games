import DailySettlement from '../models/settlement/dailySettlement.js';
import Admin from '../models/admin/admin.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import {
    parseSettlementDate,
    mapPaymentStatus,
    computeBookieDailyCommission,
    getBookieUserIdsMap,
    getAdminCollectsBookies,
    computeCommissionForBookieDay,
    resolveSettlementPaymentStatus,
    isSettlementDayEnded,
} from '../utils/dailyCommission.js';

function settlementKey(bookieId, dateStr) {
    return `${bookieId}_${dateStr}`;
}

function mergeRows(commissionDays, settlements, bookie) {
    const settlementMap = new Map();
    settlements.forEach((s) => {
        const dateStr = s.settlementDate ? new Date(s.settlementDate).toISOString().slice(0, 10) : '';
        const bid = (s.bookieId?._id || s.bookieId)?.toString?.() || String(s.bookieId || '');
        if (dateStr && bid) settlementMap.set(settlementKey(bid, dateStr), s);
    });

    const rows = [];
    for (const day of commissionDays) {
        const bid = bookie._id.toString();
        const settlement = settlementMap.get(settlementKey(bid, day.date));
        const commission = Number(day.commission) || 0;
        const { paymentStatus, canMarkPaid, dayEnded } = resolveSettlementPaymentStatus(
            settlement,
            commission,
            day.date
        );

        rows.push({
            settlementId: settlement?._id || null,
            bookieId: bookie._id,
            bookieName: bookie.username,
            bookiePhone: bookie.phone || '',
            date: day.date,
            revenue: day.revenue,
            commission,
            betCount: day.betCount,
            paymentStatus,
            canMarkPaid,
            dayEnded,
            paidAt: paymentStatus === 'paid' ? settlement?.adminProcessedAt || settlement?.updatedAt : null,
        });
    }

    // Paid settlements on days with no bets (edge case)
    settlements.forEach((s) => {
        const dateStr = s.settlementDate ? new Date(s.settlementDate).toISOString().slice(0, 10) : '';
        const bid = (s.bookieId?._id || s.bookieId)?.toString?.() || String(s.bookieId || '');
        if (!dateStr || bid !== bookie._id.toString()) return;
        if (rows.some((r) => r.date === dateStr)) return;
        const commission = Number(s.amount) || 0;
        const { paymentStatus, canMarkPaid, dayEnded } = resolveSettlementPaymentStatus(s, commission, dateStr);
        if (mapPaymentStatus(s.status) === 'paid' && paymentStatus !== 'paid') return;
        rows.push({
            settlementId: s._id,
            bookieId: bookie._id,
            bookieName: bookie.username,
            bookiePhone: bookie.phone || '',
            date: dateStr,
            revenue: 0,
            commission,
            betCount: 0,
            paymentStatus,
            canMarkPaid,
            dayEnded,
            paidAt: paymentStatus === 'paid' ? s.adminProcessedAt || s.updatedAt : null,
        });
    });

    rows.sort((a, b) => b.date.localeCompare(a.date) || (a.bookieName || '').localeCompare(b.bookieName || ''));
    return rows;
}

/**
 * Daily commission rows (auto from bets) + payment status (paid/unpaid).
 * Bookie: own rows. Admin: all admin_collects bookies.
 */
export const getDailyCommissionSettlements = async (req, res) => {
    try {
        const { startDate, endDate, bookieId: filterBookieId } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'startDate and endDate are required (YYYY-MM-DD)' });
        }

        const isBookie = req.admin?.role === 'bookie';
        let bookies = [];

        if (isBookie) {
            const bookie = await Admin.findById(req.admin._id)
                .select('_id username phone commissionPercentage bookieType')
                .lean();
            if (!bookie || (bookie.bookieType || 'admin_collects') !== 'admin_collects') {
                return res.status(400).json({ success: false, message: 'Daily settlement is only for Admin Collects bookies' });
            }
            bookies = [bookie];
        } else {
            if (req.admin?.role !== 'super_admin') {
                return res.status(403).json({ success: false, message: 'Only Super Admin can access' });
            }
            bookies = await getAdminCollectsBookies(filterBookieId || null);
        }

        const bookieUserMap = await getBookieUserIdsMap();
        const bookieIds = bookies.map((b) => b._id);

        const from = parseSettlementDate(startDate);
        const to = parseSettlementDate(endDate);
        const settlementQuery = { bookieId: { $in: bookieIds }, bookieType: 'admin_collects' };
        if (from) settlementQuery.settlementDate = { $gte: from };
        if (to) {
            const toEnd = new Date(to);
            toEnd.setUTCDate(toEnd.getUTCDate() + 1);
            settlementQuery.settlementDate = settlementQuery.settlementDate || {};
            settlementQuery.settlementDate.$lt = toEnd;
        }

        const settlements = await DailySettlement.find(settlementQuery).lean();

        let allRows = [];
        for (const bookie of bookies) {
            const userIds = bookieUserMap[bookie._id.toString()] || [];
            const commissionDays = await computeBookieDailyCommission(bookie, userIds, startDate, endDate);
            const bookieSettlements = settlements.filter(
                (s) => (s.bookieId?._id || s.bookieId)?.toString?.() === bookie._id.toString()
            );
            allRows = allRows.concat(mergeRows(commissionDays, bookieSettlements, bookie));
        }

        const totals = {
            commission: allRows.reduce((s, r) => s + (r.commission || 0), 0),
            revenue: allRows.reduce((s, r) => s + (r.revenue || 0), 0),
            paidCommission: allRows.filter((r) => r.paymentStatus === 'paid').reduce((s, r) => s + (r.commission || 0), 0),
            unpaidCommission: allRows.filter((r) => r.paymentStatus !== 'paid').reduce((s, r) => s + (r.commission || 0), 0),
        };

        res.status(200).json({ success: true, data: { rows: allRows, totals } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: mark daily commission as paid or unpaid (upserts settlement record).
 */
export const setDailySettlementStatus = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Only Super Admin can update payment status' });
        }

        const { bookieId, settlementDate, status } = req.body;
        if (!bookieId || !settlementDate) {
            return res.status(400).json({ success: false, message: 'bookieId and settlementDate are required' });
        }
        if (!['paid', 'unpaid'].includes(status)) {
            return res.status(400).json({ success: false, message: 'status must be paid or unpaid' });
        }

        const parsedDate = parseSettlementDate(settlementDate);
        if (!parsedDate) {
            return res.status(400).json({ success: false, message: 'Invalid settlement date (use YYYY-MM-DD)' });
        }

        const bookie = await Admin.findOne({ _id: bookieId, role: 'bookie', bookieType: 'admin_collects' }).lean();
        if (!bookie) {
            return res.status(404).json({ success: false, message: 'Admin Collects bookie not found' });
        }

        const { commission } = await computeCommissionForBookieDay(bookieId, settlementDate);

        if (status === 'paid' && !isSettlementDayEnded(settlementDate)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot mark today as paid until the day ends. More bets may still be placed.',
            });
        }

        const settlement = await DailySettlement.findOneAndUpdate(
            { bookieId, settlementDate: parsedDate },
            {
                $set: {
                    bookieType: 'admin_collects',
                    amount: commission,
                    status,
                    adminProcessedAt: status === 'paid' ? new Date() : null,
                    adminRemarks: status === 'paid' ? 'Paid' : '',
                },
                $setOnInsert: {
                    remarks: '',
                    createdBy: req.admin._id,
                },
            },
            { upsert: true, new: true, runValidators: true }
        );

        await logActivity({
            action: status === 'paid' ? 'settlement_mark_paid' : 'settlement_mark_unpaid',
            performedBy: req.admin.username,
            performedByType: req.admin.role,
            targetType: 'settlement',
            targetId: settlement._id.toString(),
            details: `Daily commission ₹${commission} for ${bookie.username} on ${settlementDate} marked ${status}`,
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            data: {
                settlementId: settlement._id,
                bookieId,
                date: settlementDate,
                commission,
                paymentStatus: status,
                paidAt: status === 'paid' ? settlement.adminProcessedAt : null,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/** @deprecated Legacy list — prefer GET /settlements/daily */
export const getSettlements = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        req.query = { ...req.query, startDate, endDate };
        return getDailyCommissionSettlements(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
