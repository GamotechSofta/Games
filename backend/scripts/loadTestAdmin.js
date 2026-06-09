/**
 * Lightweight load test for admin read APIs.
 *
 * Usage:
 *   node scripts/loadTestAdmin.js --token=ADMIN_JWT
 *   node scripts/loadTestAdmin.js --token=ADMIN_JWT --endpoint=dashboard --requests=30 --concurrency=5
 *   node scripts/loadTestAdmin.js --token=ADMIN_JWT --endpoint=users --base=http://localhost:3010/api/v1
 */

import dotenv from 'dotenv';

dotenv.config();

const ENDPOINTS = {
    dashboard: '/dashboard/stats',
    users: '/users?filter=all&limit=50',
    wallet: '/wallet/all?limit=50',
    bets: '/bets/history?limit=50',
};

function parseArgs(argv) {
    const opts = {
        base: process.env.API_BASE || 'http://localhost:3010/api/v1',
        endpoint: 'dashboard',
        requests: 20,
        concurrency: 5,
        token: '',
    };

    for (const arg of argv) {
        if (arg.startsWith('--token=')) opts.token = arg.slice(8);
        else if (arg.startsWith('--base=')) opts.base = arg.slice(7).replace(/\/$/, '');
        else if (arg.startsWith('--endpoint=')) opts.endpoint = arg.slice(11);
        else if (arg.startsWith('--requests=')) opts.requests = Number(arg.slice(11)) || 20;
        else if (arg.startsWith('--concurrency=')) opts.concurrency = Number(arg.slice(14)) || 5;
    }

    return opts;
}

function percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[idx];
}

async function runRequest(url, token) {
    const start = performance.now();
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
        },
    });
    const elapsed = performance.now() - start;
    const cacheHeader = res.headers.get('x-dashboard-cache') || '';
    let bodyBytes = 0;
    try {
        const text = await res.text();
        bodyBytes = text.length;
    } catch {
        // ignore
    }
    return { ok: res.ok, status: res.status, elapsed, cacheHeader, bodyBytes };
}

async function runBatch(url, token, count, concurrency) {
    const results = [];
    let next = 0;

    async function worker() {
        while (next < count) {
            const i = next;
            next += 1;
            results[i] = await runRequest(url, token);
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, count) }, () => worker());
    await Promise.all(workers);
    return results;
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));

    if (!opts.token) {
        console.error('Missing --token=ADMIN_JWT (login via admin panel and copy adminToken from localStorage)');
        process.exit(1);
    }

    const path = ENDPOINTS[opts.endpoint];
    if (!path) {
        console.error(`Unknown endpoint "${opts.endpoint}". Choose: ${Object.keys(ENDPOINTS).join(', ')}`);
        process.exit(1);
    }

    const url = `${opts.base}${path}`;
    console.log(`Load test: ${url}`);
    console.log(`Requests: ${opts.requests}, concurrency: ${opts.concurrency}\n`);

    const results = await runBatch(url, opts.token, opts.requests, opts.concurrency);
    const times = results.map((r) => r.elapsed).sort((a, b) => a - b);
    const errors = results.filter((r) => !r.ok);
    const hits = results.filter((r) => /HIT/i.test(r.cacheHeader));

    console.log('Results:');
    console.log(`  OK:        ${results.length - errors.length}/${results.length}`);
    console.log(`  Errors:    ${errors.length}`);
    if (opts.endpoint === 'dashboard' && hits.length > 0) {
        console.log(`  Cache HIT: ${hits.length}/${results.length} (X-Dashboard-Cache)`);
    }
    console.log(`  p50:       ${percentile(times, 50).toFixed(1)} ms`);
    console.log(`  p95:       ${percentile(times, 95).toFixed(1)} ms`);
    console.log(`  p99:       ${percentile(times, 99).toFixed(1)} ms`);
    console.log(`  min/max:   ${times[0].toFixed(1)} / ${times[times.length - 1].toFixed(1)} ms`);
    console.log(`  avg body:  ${Math.round(results.reduce((s, r) => s + r.bodyBytes, 0) / results.length)} bytes`);

    if (errors.length > 0) {
        const sample = errors[0];
        console.log(`\nFirst error: HTTP ${sample.status}`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Load test failed:', err?.message || err);
    process.exit(1);
});
