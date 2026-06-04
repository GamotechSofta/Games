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
    console.log('\nFix — self-hosted (recommended):');
    console.log('  1. Follow backend/turn-server/README.md (coturn on your VPS)');
    console.log('  2. Add TURN_URL, TURN_USERNAME, TURN_PASSWORD to .env + production host');
    console.log('  3. Restart backend, run npm run check-turn again');
    process.exit(1);
}

console.log('\nCross-network calls should work after backend restart.\n');
process.exit(0);
