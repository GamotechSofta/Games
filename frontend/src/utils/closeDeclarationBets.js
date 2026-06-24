/** Jodi / Half Sangam / Full Sangam — only before market open time (startingTime). */
const CLOSE_DECLARATION_GAMES = new Set(['jodi', 'jodi bulk', 'half sangam', 'full sangam']);
const CLOSE_DECLARATION_BET_TYPES = new Set(['jodi', 'half-sangam', 'full-sangam']);

export function isCloseDeclarationGame(title) {
    return CLOSE_DECLARATION_GAMES.has((title || '').toString().trim().toLowerCase());
}

export function isCloseDeclarationBetType(betType) {
    return CLOSE_DECLARATION_BET_TYPES.has((betType || '').toString().trim().toLowerCase());
}

export const CLOSE_DECLARATION_BETS_MESSAGE =
    'Jodi and Sangam bets close at open time. You can place close session patti/digit bets until market closing time.';
