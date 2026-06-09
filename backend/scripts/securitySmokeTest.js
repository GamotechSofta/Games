/**
 * Quick security checks — run before deploy or in CI.
 *
 * Usage:
 *   node scripts/securitySmokeTest.js
 *   node scripts/securitySmokeTest.js --base=http://localhost:3010
 */

import dotenv from 'dotenv';

dotenv.config();

const base = (() => {
    const arg = process.argv.find((a) => a.startsWith('--base='));
    if (arg) return arg.slice(7).replace(/\/$/, '');
    return `http://localhost:${process.env.PORT || 3010}`;
})();

const api = `${base}/api/v1`;

async function request(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body != null) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    let json = null;
    try {
        json = await res.json();
    } catch {
        json = null;
    }
    return { status: res.status, json };
}

function assert(name, condition, detail = '') {
    if (!condition) {
        throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`);
    }
    console.log(`  OK  ${name}`);
}

async function main() {
    console.log(`Security smoke test → ${api}\n`);

    const create = await request('POST', `${api}/admin/create`, {
        username: `smoke_${Date.now()}`,
        password: 'test123456',
    });
    assert(
        'POST /admin/create blocked',
        create.status === 404 || create.status === 403,
        `got ${create.status}`,
    );

    const dashboard = await request('GET', `${api}/dashboard/stats`);
    assert('GET /dashboard/stats requires auth', dashboard.status === 401, `got ${dashboard.status}`);

    const walletBal = await request('GET', `${api}/wallet/balance?userId=000000000000000000000001`);
    assert('GET /wallet/balance requires auth', walletBal.status === 401, `got ${walletBal.status}`);

    const walletTx = await request('GET', `${api}/wallet/my-transactions?userId=000000000000000000000001`);
    assert('GET /wallet/my-transactions requires auth', walletTx.status === 401, `got ${walletTx.status}`);

    let rateLimited = false;
    for (let i = 0; i < 12; i += 1) {
        const login = await request('POST', `${api}/admin/login`, {
            username: 'nonexistent_smoke_user',
            password: 'wrong-password',
        });
        if (login.status === 429) {
            rateLimited = true;
            break;
        }
    }
    assert('Admin login rate limit triggers', rateLimited, 'no 429 after 12 attempts');

    const health = await request('GET', `${base}/health`);
    assert('Health endpoint reachable', health.status === 200 || health.status === 503, `got ${health.status}`);

    const testReset = await request('GET', `${base}/test-reset`);
    assert(
        'GET /test-reset blocked without dev secret (or 404 in prod)',
        testReset.status === 403 || testReset.status === 404,
        `got ${testReset.status}`,
    );

    const basicAuth = await fetch(`${api}/dashboard/stats`, {
        headers: {
            Authorization: `Basic ${Buffer.from('admin:password').toString('base64')}`,
        },
    });
    assert('Basic Auth rejected for admin routes', basicAuth.status === 401, `got ${basicAuth.status}`);

    console.log('\nAll security smoke checks passed.');
}

main().catch((err) => {
    console.error('\nFAILED:', err.message || err);
    process.exit(1);
});
