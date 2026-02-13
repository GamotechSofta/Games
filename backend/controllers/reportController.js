import Bet from '../models/bet/bet.js';
import Payment from '../models/payment/payment.js';
import User from '../models/user/user.js';
import Admin from '../models/admin/admin.js';
import { getBookieUserIds } from '../utils/bookieFilter.js';

export const getReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {};
        const admin = req.admin;
        const bookieUserIds = await getBookieUserIds(admin);

        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }
        if (bookieUserIds !== null) {
            dateFilter.userId = { $in: bookieUserIds };
        }

        // Total revenue (from all bets; exclude cancelled – they are refunded)
        const revenueFilter = { ...dateFilter, status: { $ne: 'cancelled' } };
        const totalRevenue = await Bet.aggregate([
            { $match: revenueFilter },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const wonFilter = { status: 'won', ...dateFilter };
        // Total payouts (from winning bets)
        const totalPayouts = await Bet.aggregate([
            { $match: wonFilter },
            { $group: { _id: null, total: { $sum: '$payout' } } },
        ]);

        // Total bets (exclude cancelled for counts)
        const totalBets = await Bet.countDocuments(revenueFilter);

        // Winning and losing bets
        const winningBets = await Bet.countDocuments({ status: 'won', ...dateFilter });
        const losingBets = await Bet.countDocuments({ status: 'lost', ...dateFilter });

        // Active users (filter by bookie if applicable)
        const userFilter = bookieUserIds !== null ? { _id: { $in: bookieUserIds }, isActive: true } : { isActive: true };
        const activeUsers = await User.countDocuments(userFilter);

        // Calculate net profit
        const revenue = totalRevenue[0]?.total || 0;
        const payouts = totalPayouts[0]?.total || 0;
        const netProfit = revenue - payouts;

        // Win rate
        const winRate = totalBets > 0 ? ((winningBets / totalBets) * 100).toFixed(2) : 0;

        // Include bookieType & commission info for bookie users
        const bookieType = admin.role === 'bookie' ? (admin.bookieType || 'admin_collects') : undefined;
        const commissionPercentage = admin.role === 'bookie' ? (admin.commissionPercentage || 0) : undefined;

        // For bookie: calculate their share based on type
        let bookieShare, platformCharge, bookieNetProfit;
        if (admin.role === 'bookie') {
            const commPct = admin.commissionPercentage || 0;
            if (bookieType === 'bookie_collects') {
                // Bookie collects all, pays admin platform charge
                platformCharge = Math.round((revenue * commPct / 100) * 100) / 100;
                bookieShare = Math.round((revenue - platformCharge) * 100) / 100;
                bookieNetProfit = Math.round((bookieShare - payouts) * 100) / 100;
            } else {
                // Admin collects all, pays bookie commission
                bookieShare = Math.round((revenue * commPct / 100) * 100) / 100;
                platformCharge = 0;
                bookieNetProfit = bookieShare; // bookie's net is just the commission (admin handles payouts)
            }
        }

        res.status(200).json({
            success: true,
            data: {
                totalRevenue: revenue,
                totalPayouts: payouts,
                netProfit,
                totalBets,
                activeUsers,
                winningBets,
                losingBets,
                winRate,
                ...(admin.role === 'bookie' && {
                    bookieType,
                    commissionPercentage,
                    bookieShare,
                    platformCharge,
                    bookieNetProfit,
                }),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Revenue report.
 * - Bookie: sees their own commission-based revenue (flat % of total bet amount from their users)
 * - Admin: sees per-bookie breakdown + direct users + totals
 */
export const getRevenueReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {};

        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }

        const admin = req.admin;

        // ---- BOOKIE VIEW ----
        if (admin.role === 'bookie') {
            const users = await User.find({ referredBy: admin._id }).select('_id').lean();
            const userIds = users.map((u) => u._id);

            const betFilter = { ...dateFilter };
            if (userIds.length > 0) {
                betFilter.userId = { $in: userIds };
            } else {
                // Bookie has no users yet
                return res.status(200).json({
                    success: true,
                    data: {
                        totalBetAmount: 0,
                        totalPayouts: 0,
                        commissionPercentage: admin.commissionPercentage || 0,
                        bookieType: admin.bookieType || 'admin_collects',
                        bookieRevenue: 0,
                        totalUsers: 0,
                        totalBets: 0,
                        winningBets: 0,
                        losingBets: 0,
                    },
                });
            }

            const [betAgg] = await Bet.aggregate([
                { $match: { ...betFilter, status: { $ne: 'cancelled' } } },
                { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]);

            const [payoutAgg] = await Bet.aggregate([
                { $match: { status: 'won', ...betFilter } },
                { $group: { _id: null, totalPayout: { $sum: '$payout' } } },
            ]);

            const totalBetAmount = betAgg?.totalAmount || 0;
            const totalPayouts = payoutAgg?.totalPayout || 0;
            const totalBets = betAgg?.count || 0;
            const commissionPct = admin.commissionPercentage || 0;
            const selfBookieType = admin.bookieType || 'admin_collects';

            let bookieRevenue, platformCharge, bookieGross;
            if (selfBookieType === 'bookie_collects') {
                // Bookie collects all money. Pays admin platform charge (commPct%).
                // Bookie also handles payouts.
                platformCharge = Math.round((totalBetAmount * commissionPct / 100) * 100) / 100;
                bookieGross = Math.round((totalBetAmount - platformCharge) * 100) / 100;
                bookieRevenue = Math.round((bookieGross - totalPayouts) * 100) / 100;
            } else {
                // Admin collects all, pays bookie commission (commPct%).
                // Admin handles payouts. Bookie just gets commission.
                platformCharge = 0;
                bookieGross = Math.round((totalBetAmount * commissionPct / 100) * 100) / 100;
                bookieRevenue = bookieGross;
            }

            const winningBets = await Bet.countDocuments({ status: 'won', ...betFilter });
            const losingBets = await Bet.countDocuments({ status: 'lost', ...betFilter });

            return res.status(200).json({
                success: true,
                data: {
                    totalBetAmount,
                    totalPayouts,
                    commissionPercentage: commissionPct,
                    bookieType: selfBookieType,
                    bookieGross,
                    bookieRevenue,
                    platformCharge,
                    totalUsers: userIds.length,
                    totalBets,
                    winningBets,
                    losingBets,
                },
            });
        }

        // ---- ADMIN VIEW ----
        // Get all bookies
        const bookies = await Admin.find({ role: 'bookie' }).select('_id username phone commissionPercentage bookieType status').lean();

        // Get all users with their referredBy
        const allUsers = await User.find().select('_id referredBy source').lean();

        // Map: bookieId -> [userIds]
        const bookieUserMap = {};
        const directUserIds = []; // Users not referred by any bookie (admin's own)

        for (const user of allUsers) {
            if (user.referredBy) {
                const bId = user.referredBy.toString();
                if (!bookieUserMap[bId]) bookieUserMap[bId] = [];
                bookieUserMap[bId].push(user._id);
            } else {
                directUserIds.push(user._id);
            }
        }

        // Calculate per-bookie revenue
        const bookieRevenues = [];
        let totalBookieCommission = 0;
        let totalAdminProfit = 0;
        let grandTotalBets = 0;
        let grandTotalPayouts = 0;

        for (const bookie of bookies) {
            const bId = bookie._id.toString();
            const userIds = bookieUserMap[bId] || [];

            if (userIds.length === 0) {
                bookieRevenues.push({
                    bookieId: bookie._id,
                    bookieName: bookie.username,
                    bookiePhone: bookie.phone,
                    bookieStatus: bookie.status,
                    bookieType: bookie.bookieType || 'admin_collects',
                    commissionPercentage: bookie.commissionPercentage || 0,
                    totalBetAmount: 0,
                    totalPayouts: 0,
                    bookieShare: 0,
                    adminPool: 0,
                    adminProfit: 0,
                    totalUsers: 0,
                    totalBets: 0,
                });
                continue;
            }

            const betFilter = { ...dateFilter, userId: { $in: userIds } };

            const [betAgg] = await Bet.aggregate([
                { $match: { ...betFilter, status: { $ne: 'cancelled' } } },
                { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]);

            const [payoutAgg] = await Bet.aggregate([
                { $match: { status: 'won', ...betFilter } },
                { $group: { _id: null, totalPayout: { $sum: '$payout' } } },
            ]);

            const totalBetAmount = betAgg?.totalAmount || 0;
            const totalPayouts = payoutAgg?.totalPayout || 0;
            const totalBets = betAgg?.count || 0;
            const commPct = bookie.commissionPercentage || 0;
            const bType = bookie.bookieType || 'admin_collects';

            let bookieShare, adminPool, adminProfit;
            if (bType === 'bookie_collects') {
                // Bookie collects all money & handles payouts. Pays admin platform charge (commPct%).
                // Admin profit = platform charge only (admin does NOT pay payouts).
                // Bookie net = (bet volume - platform charge - payouts).
                adminPool = Math.round((totalBetAmount * commPct / 100) * 100) / 100;
                bookieShare = Math.round((totalBetAmount - adminPool - totalPayouts) * 100) / 100;
                adminProfit = adminPool;
            } else {
                // Admin collects all money & handles payouts. Pays bookie commission (commPct%).
                // Admin profit = (bet volume - commission - payouts).
                bookieShare = Math.round((totalBetAmount * commPct / 100) * 100) / 100;
                adminPool = Math.round((totalBetAmount - bookieShare) * 100) / 100;
                adminProfit = Math.round((adminPool - totalPayouts) * 100) / 100;
            }

            totalBookieCommission += bookieShare;
            totalAdminProfit += adminProfit;
            grandTotalBets += totalBetAmount;
            grandTotalPayouts += totalPayouts;

            bookieRevenues.push({
                bookieId: bookie._id,
                bookieName: bookie.username,
                bookiePhone: bookie.phone,
                bookieStatus: bookie.status,
                bookieType: bType,
                commissionPercentage: commPct,
                totalBetAmount,
                totalPayouts,
                bookieShare,
                adminPool,
                adminProfit,
                totalUsers: userIds.length,
                totalBets,
            });
        }

        // Direct users (admin's own users - 100% admin revenue)
        let directStats = { totalBetAmount: 0, totalPayouts: 0, adminProfit: 0, totalBets: 0 };
        if (directUserIds.length > 0) {
            const betFilter = { ...dateFilter, userId: { $in: directUserIds } };

            const [betAgg] = await Bet.aggregate([
                { $match: { ...betFilter, status: { $ne: 'cancelled' } } },
                { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]);

            const [payoutAgg] = await Bet.aggregate([
                { $match: { status: 'won', ...betFilter } },
                { $group: { _id: null, totalPayout: { $sum: '$payout' } } },
            ]);

            const totalBetAmount = betAgg?.totalAmount || 0;
            const totalPayouts = payoutAgg?.totalPayout || 0;
            const totalBets = betAgg?.count || 0;

            directStats = {
                totalBetAmount,
                totalPayouts,
                adminProfit: Math.round((totalBetAmount - totalPayouts) * 100) / 100,
                totalBets,
                totalUsers: directUserIds.length,
            };

            grandTotalBets += totalBetAmount;
            grandTotalPayouts += totalPayouts;
            totalAdminProfit += directStats.adminProfit;
        }

        // Build per-type sub-summaries
        const adminCollectsBookies = bookieRevenues.filter(b => (b.bookieType || 'admin_collects') === 'admin_collects');
        const bookieCollectsBookies = bookieRevenues.filter(b => b.bookieType === 'bookie_collects');

        const calcSubSummary = (list) => ({
            totalBets: Math.round(list.reduce((s, b) => s + b.totalBetAmount, 0) * 100) / 100,
            totalPayouts: Math.round(list.reduce((s, b) => s + b.totalPayouts, 0) * 100) / 100,
            totalBookieShare: Math.round(list.reduce((s, b) => s + b.bookieShare, 0) * 100) / 100,
            totalAdminPool: Math.round(list.reduce((s, b) => s + b.adminPool, 0) * 100) / 100,
            totalAdminProfit: Math.round(list.reduce((s, b) => s + b.adminProfit, 0) * 100) / 100,
            bookieCount: list.length,
            totalUsers: list.reduce((s, b) => s + b.totalUsers, 0),
        });

        return res.status(200).json({
            success: true,
            data: {
                bookies: bookieRevenues,
                directUsers: directStats,
                adminCollectsSummary: calcSubSummary(adminCollectsBookies),
                bookieCollectsSummary: calcSubSummary(bookieCollectsBookies),
                summary: {
                    grandTotalBets: Math.round(grandTotalBets * 100) / 100,
                    grandTotalPayouts: Math.round(grandTotalPayouts * 100) / 100,
                    totalBookieCommission: Math.round(totalBookieCommission * 100) / 100,
                    totalAdminProfit: Math.round(totalAdminProfit * 100) / 100,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Bookie detail: comprehensive info for a single bookie.
 * Returns bookie profile, revenue stats, users list, and recent bet history.
 * Admin only.
 */
export const getBookieRevenueDetail = async (req, res) => {
    try {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Only Super Admin can view bookie details' });
        }

        const { bookieId } = req.params;
        const { startDate, endDate } = req.query;

        const bookie = await Admin.findOne({ _id: bookieId, role: 'bookie' }).select('-password').lean();
        if (!bookie) {
            return res.status(404).json({ success: false, message: 'Bookie not found' });
        }

        // Date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }

        // Get bookie's users
        const users = await User.find({ referredBy: bookieId })
            .select('_id username email phone isActive createdAt')
            .sort({ createdAt: -1 })
            .lean();
        const userIds = users.map((u) => u._id);

        // Revenue stats
        let totalBetAmount = 0;
        let totalPayouts = 0;
        let totalBetCount = 0;
        let winningBets = 0;
        let losingBets = 0;

        if (userIds.length > 0) {
            const betFilter = { ...dateFilter, userId: { $in: userIds } };

            const [betAgg] = await Bet.aggregate([
                { $match: { ...betFilter, status: { $ne: 'cancelled' } } },
                { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]);
            const [payoutAgg] = await Bet.aggregate([
                { $match: { status: 'won', ...betFilter } },
                { $group: { _id: null, totalPayout: { $sum: '$payout' } } },
            ]);

            totalBetAmount = betAgg?.totalAmount || 0;
            totalPayouts = payoutAgg?.totalPayout || 0;
            totalBetCount = betAgg?.count || 0;
            winningBets = await Bet.countDocuments({ status: 'won', ...betFilter });
            losingBets = await Bet.countDocuments({ status: 'lost', ...betFilter });
        }

        const commPct = bookie.commissionPercentage || 0;
        const bType = bookie.bookieType || 'admin_collects';

        let bookieShare, adminPool, adminProfit;
        if (bType === 'bookie_collects') {
            adminPool = Math.round((totalBetAmount * commPct / 100) * 100) / 100;
            bookieShare = Math.round((totalBetAmount * (100 - commPct) / 100) * 100) / 100;
            adminProfit = Math.round((adminPool - totalPayouts) * 100) / 100;
        } else {
            bookieShare = Math.round((totalBetAmount * commPct / 100) * 100) / 100;
            adminPool = Math.round((totalBetAmount * (100 - commPct) / 100) * 100) / 100;
            adminProfit = Math.round((adminPool - totalPayouts) * 100) / 100;
        }

        // Recent bets from bookie's users (last 100)
        let recentBets = [];
        if (userIds.length > 0) {
            recentBets = await Bet.find({ userId: { $in: userIds }, ...dateFilter })
                .sort({ createdAt: -1 })
                .limit(100)
                .populate('userId', 'username')
                .populate('marketId', 'marketName')
                .lean();
        }

        // Per-user bet summary
        const userBetSummary = [];
        if (userIds.length > 0) {
            const perUser = await Bet.aggregate([
                { $match: { userId: { $in: userIds }, ...dateFilter, status: { $ne: 'cancelled' } } },
                {
                    $group: {
                        _id: '$userId',
                        totalBets: { $sum: 1 },
                        totalAmount: { $sum: '$amount' },
                        totalPayout: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$payout', 0] } },
                        wins: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                        losses: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    },
                },
            ]);

            const userMap = {};
            for (const u of users) userMap[u._id.toString()] = u;

            for (const row of perUser) {
                const user = userMap[row._id.toString()];
                if (user) {
                    userBetSummary.push({
                        userId: user._id,
                        username: user.username,
                        phone: user.phone,
                        isActive: user.isActive,
                        totalBets: row.totalBets,
                        totalAmount: row.totalAmount,
                        totalPayout: row.totalPayout,
                        wins: row.wins,
                        losses: row.losses,
                        profit: Math.round((row.totalAmount - row.totalPayout) * 100) / 100,
                    });
                }
            }
            // Add users with 0 bets
            for (const u of users) {
                if (!perUser.find((r) => r._id.toString() === u._id.toString())) {
                    userBetSummary.push({
                        userId: u._id,
                        username: u.username,
                        phone: u.phone,
                        isActive: u.isActive,
                        totalBets: 0, totalAmount: 0, totalPayout: 0, wins: 0, losses: 0, profit: 0,
                    });
                }
            }
            userBetSummary.sort((a, b) => b.totalAmount - a.totalAmount);
        }

        return res.status(200).json({
            success: true,
            data: {
                bookie: {
                    _id: bookie._id,
                    username: bookie.username,
                    email: bookie.email,
                    phone: bookie.phone,
                    status: bookie.status,
                    bookieType: bType,
                    commissionPercentage: commPct,
                    createdAt: bookie.createdAt,
                },
                revenue: {
                    totalBetAmount,
                    totalPayouts,
                    bookieShare,
                    adminPool,
                    adminProfit,
                    totalBetCount,
                    winningBets,
                    losingBets,
                    winRate: totalBetCount > 0 ? ((winningBets / totalBetCount) * 100).toFixed(2) : 0,
                },
                users: userBetSummary,
                totalUsers: users.length,
                recentBets: recentBets.map((b) => ({
                    _id: b._id,
                    username: b.userId?.username || '—',
                    marketName: b.marketId?.marketName || '—',
                    betType: b.betType,
                    betNumber: b.betNumber,
                    betOn: b.betOn,
                    amount: b.amount,
                    payout: b.payout,
                    status: b.status,
                    createdAt: b.createdAt,
                })),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
