import StarlineGroup from '../models/starlineGroup/starlineGroup.js';
import KingBazaarGroup from '../models/kingBazaarGroup/kingBazaarGroup.js';
import Market from '../models/market/market.js';
import { attachDisplayResults } from '../utils/marketDisplayResult.js';

const STARLINE_DEFAULTS = [
    { key: 'kalyan', label: 'Kalyan Starline', order: 0 },
    { key: 'milan', label: 'Milan Starline', order: 1 },
    { key: 'radha', label: 'Radha Starline', order: 2 },
];

const KING_DEFAULTS = [
    { key: 'king-morning', label: 'King Morning Bazaar', order: 0 },
    { key: 'king-evening', label: 'King Evening Bazaar', order: 1 },
    { key: 'king-night', label: 'King Night Bazaar', order: 2 },
];

const SLOT_SELECT =
    'marketName startingTime closingTime showInPopular marketType betClosureTime openingNumber closingNumber winNumber starlineGroup kingBazaarGroup';

async function seedGroups(Model, defaults) {
    let list = await Model.find().sort({ order: 1, key: 1 }).lean();
    if (list.length > 0) return list;
    for (const g of defaults) {
        await Model.findOneAndUpdate(
            { key: g.key },
            { key: g.key, label: g.label, order: g.order },
            { upsert: true, new: true },
        );
    }
    return Model.find().sort({ order: 1, key: 1 }).lean();
}

export async function listStarlineGroups() {
    return seedGroups(StarlineGroup, STARLINE_DEFAULTS);
}

export async function listKingBazaarGroups() {
    return seedGroups(KingBazaarGroup, KING_DEFAULTS);
}

export async function listStarlineSlots() {
    const markets = await Market.find({ marketType: 'startline' })
        .select(SLOT_SELECT)
        .sort({ startingTime: 1 })
        .lean();
    return attachDisplayResults(markets);
}

export async function listKingBazaarSlots() {
    const markets = await Market.find({ marketType: 'king' })
        .select(SLOT_SELECT)
        .sort({ startingTime: 1 })
        .lean();
    return attachDisplayResults(markets);
}

/** One round-trip payload for Starline + King Bazaar UIs. */
export async function getSpecialMarketsBootstrap({ includeSlots = true } = {}) {
    const [starlineGroups, kingGroups] = await Promise.all([
        listStarlineGroups(),
        listKingBazaarGroups(),
    ]);

    if (!includeSlots) {
        return { starlineGroups, kingGroups, starlineSlots: [], kingSlots: [] };
    }

    const [starlineSlots, kingSlots] = await Promise.all([
        listStarlineSlots(),
        listKingBazaarSlots(),
    ]);

    return { starlineGroups, kingGroups, starlineSlots, kingSlots };
}
