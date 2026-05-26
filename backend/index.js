import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';
import connectDB from './config/db_Connection.js';
import marketRoutes from './routes/market/marketRoutes.js';
import adminRoutes from './routes/admin/adminRoutes.js';
import bookieRoutes from './routes/bookie/bookieRoutes.js';
import userRoutes from './routes/user/userRoutes.js';
import betRoutes from './routes/bet/betRoutes.js';
import paymentRoutes from './routes/payment/paymentRoutes.js';
import walletRoutes from './routes/wallet/walletRoutes.js';
import gapWalletRoutes from './routes/wallet.routes.js';
import reportRoutes from './routes/report/reportRoutes.js';
import helpDeskRoutes from './routes/helpDesk/helpDeskRoutes.js';
import dashboardRoutes from './routes/dashboard/dashboardRoutes.js';
import rateRoutes from './routes/rate/rateRoutes.js';
import gameRoutes, { adminGameRoutes } from './routes/game.routes.js';

import bankDetailRoutes from './routes/bankDetail/bankDetailRoutes.js';
import commissionRoutes from './routes/commission/commissionRoutes.js';
import settlementRoutes from './routes/settlement/settlementRoutes.js';
import { getClientIp } from './utils/activityLogger.js';
import { ensureResultsResetForNewDay } from './utils/resultReset.js';
import Market from './models/market/market.js';
import cors from 'cors';
import path from 'path';
import { getCorsOptions, logCorsConfig, parseAllowedOrigins } from './config/cors.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3010;

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const signatureEnabled = String(process.env.GAP_SIGNATURE_ENABLED || 'false').toLowerCase() === 'true';

function validateEnvConfig() {
    const warnings = [];
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) warnings.push('Missing MONGODB_URI (or MONGO_URI)');
    if (!process.env.PORT) warnings.push('PORT not set (using default 3010)');

    if (!process.env.GAP_BASE_URL) warnings.push('Missing GAP_BASE_URL');
    if (!process.env.OPERATOR_ID) warnings.push('Missing OPERATOR_ID');
    if (signatureEnabled) {
        const hasInline = String(process.env.GAP_PUBLIC_KEY || '').trim().length > 0;
        const hasPath = String(process.env.GAP_PUBLIC_KEY_PATH || '').trim().length > 0;
        if (!hasInline && !hasPath) {
            warnings.push('GAP_SIGNATURE_ENABLED=true but GAP_PUBLIC_KEY or GAP_PUBLIC_KEY_PATH is missing');
        }
    }

    const corsOrigins = parseAllowedOrigins();
    if (corsOrigins.length === 0 && isProd) {
        warnings.push('CORS_ORIGINS not set (and no FRONTEND_BASE_URL) — browser API calls may fail');
    }
    for (const o of corsOrigins) {
        if (/localhost:\d{1,2}$/.test(o) || /localhost:517$/.test(o)) {
            warnings.push(`CORS origin looks invalid (typo?): ${o} — did you mean localhost:5173?`);
        }
    }

    if (warnings.length > 0) {
        const level = isProd ? '[WARN][PROD]' : '[WARN]';
        for (const w of warnings) console.warn(`${level} ${w}`);
    }
}

console.log("Hello World!!");

validateEnvConfig();
logCorsConfig({ isProd });

connectDB();

app.set('trust proxy', 1);

app.use(cors(getCorsOptions({ isProd })));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve downloadable files (e.g. APK) from public folder at /downloads
const publicDir = path.join(__dirname, 'public');
app.use('/downloads', express.static(publicDir));
// Optional: force download for APK (Content-Disposition) so browsers don't open it
app.get('/downloads/myapp.apk', (req, res) => {
  const filePath = path.join(publicDir, 'myapp.apk');
  res.download(filePath, 'myapp.apk', (err) => {
    if (err && !res.headersSent) res.status(404).send('File not found');
  });
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/health', (req, res) => {
    return res.status(200).json({
        success: true,
        status: 'ok',
        service: 'games-backend',
        timestamp: new Date().toISOString(),
    });
});

// Temporary: verify real client IP behind Render proxy
app.get('/test-ip', (req, res) => {
    if (isProd) {
        return res.status(404).json({
            success: false,
            message: 'Route not available',
        });
    }
    res.json({
        'req.ip': req.ip ?? null,
        'req.headers[\'x-forwarded-for\']': req.headers['x-forwarded-for'] ?? null,
        getClientIp: getClientIp(req),
    });
});

// Test endpoint: manually trigger market reset (for testing/debugging)
app.get('/test-reset', async (req, res) => {
    if (isProd) {
        return res.status(404).json({
            success: false,
            message: 'Route not available',
        });
    }
    const now = new Date();
    const istTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    try {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('[TEST] 🧪 Manual Market Reset Triggered');
        console.log('[TEST] UTC Time:', now.toISOString());
        console.log('[TEST] IST Time:', istTime);
        console.log('═══════════════════════════════════════════════════════════');
        
        await ensureResultsResetForNewDay(Market);
        
        console.log('[TEST] ✅ Manual reset completed successfully');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        res.json({ 
            success: true, 
            message: 'Market reset executed successfully',
            timestamp: now.toISOString(),
            istTime: istTime
        });
    } catch (error) {
        console.error('[TEST] ❌ Manual reset failed:', error.message);
        console.error('[TEST] Error stack:', error.stack);
        console.log('═══════════════════════════════════════════════════════════\n');
        
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

app.use('/api/v1/markets', marketRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/bookie', bookieRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/bets', betRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/wallet', walletRoutes);
// GAP partner callbacks (signed POST): /api/wallet/balance|debit|credit|rollback ; lookup GET /api/wallet/transaction/:id
app.use('/api/wallet', gapWalletRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/v1/game', gameRoutes); // POST /api/v1/game/launch — same handlers as /api/game/launch
app.use('/api/admin/game', adminGameRoutes);
app.use('/api/v1/admin/game', adminGameRoutes); // compatibility alias for admin panel
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/help-desk', helpDeskRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/rates', rateRoutes);

app.use('/api/v1/bank-details', bankDetailRoutes);
app.use('/api/v1/commission', commissionRoutes);
app.use('/api/v1/settlements', settlementRoutes);

// Global error handler: ensure API always returns JSON (no HTML 500)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: isProd ? 'Internal server error' : (err.message || 'Internal server error'),
        });
    }
});

// Cron job: Reset market results at midnight IST (00:00 IST = 18:30 UTC previous day)
// Runs every day at 00:00 IST to clear opening/closing numbers for fresh day
cron.schedule('30 18 * * *', async () => {
    const now = new Date();
    const istTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[CRON] 🕐 Midnight Market Reset Job Started');
    console.log('[CRON] UTC Time:', now.toISOString());
    console.log('[CRON] IST Time:', istTime);
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
        await ensureResultsResetForNewDay(Market);
        console.log('[CRON] ✅ Market reset job completed successfully');
    } catch (error) {
        console.error('[CRON] ❌ Market reset job failed:', error.message);
        console.error('[CRON] Error stack:', error.stack);
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
}, {
    timezone: 'UTC'
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
