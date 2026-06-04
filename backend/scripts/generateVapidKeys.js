/**
 * Generate VAPID keys for Web Push (no Firebase).
 * Run: node scripts/generateVapidKeys.js
 * Add output to backend .env
 */
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('\nAdd to backend .env:\n');
console.log(`WEB_PUSH_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`WEB_PUSH_VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('WEB_PUSH_SUBJECT=mailto:support@aakda.in');
console.log('');
