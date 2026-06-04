/**
 * Generate a random TURN password for self-hosted coturn.
 * Run: npm run generate-turn-secret
 */
import crypto from 'crypto';

const user = process.env.TURN_USERNAME?.trim() || 'games';
const secret = crypto.randomBytes(24).toString('base64url');

console.log('\nSelf-hosted coturn — add to turnserver.conf:\n');
console.log(`user=${user}:${secret}\n`);
console.log('Add to backend .env (and production host env):\n');
console.log(`TURN_USERNAME=${user}`);
console.log(`TURN_PASSWORD=${secret}`);
console.log('TURN_URL=turn:YOUR_VPS_PUBLIC_IP:3478');
console.log('STUN_URLS=stun:YOUR_VPS_PUBLIC_IP:3478\n');
