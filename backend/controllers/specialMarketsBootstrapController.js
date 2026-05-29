import { getSpecialMarketsBootstrap } from '../services/specialMarketGroupsService.js';

/**
 * GET /markets/special-bootstrap
 * Starline + King Bazaar groups and (optional) all time slots in one response.
 */
export const getSpecialMarketsBootstrapHandler = async (req, res) => {
    try {
        const includeSlots = !['0', 'false', 'no'].includes(
            String(req.query.includeSlots || '1').toLowerCase(),
        );
        const data = await getSpecialMarketsBootstrap({ includeSlots });
        res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
