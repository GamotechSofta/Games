/**
 * Verify TURN is configured for cross-network WebRTC calls.
 * Run: node scripts/checkTurnSetup.js
 */
import 'dotenv/config';
import { getIceServerConfig, iceServersHaveTurn } from '../config/iceServers.js';

const cfg = await getIceServerConfig();
const hasTurn = iceServersHaveTurn(cfg.iceServers);

console.log('\n--- WebRTC ICE check ---');
console.log('Source:', cfg.source);
console.log('TURN configured:', hasTurn ? 'YES ✓' : 'NO ✗ (calls fail across different internet)');
console.log('ICE servers:', cfg.iceServers.length);

if (!hasTurn) {
    console.log('\nFix: add to .env (and production host env), then restart backend:');
    console.log('  METERED_TURN_API_KEY=<key from https://www.metered.ca/tools/openrelay/>');
    console.log('Or paste Metered dashboard iceServers into ICE_SERVERS_JSON=...');
    process.exit(1);
}

console.log('\nCross-network calls should work after backend restart.\n');
process.exit(0);
