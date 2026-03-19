// =========================================
// AI Tool Discovery Engine - Main Server v3.0
// Full-featured platform with chatbot, reviews,
// maintenance, traffic monitoring, and more
// =========================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const database = require('./config/database');
const { router: apiRouter, setScheduler } = require('./routes/api');
const adminRouter = require('./routes/admin');
const publicRouter = require('./routes/public');
const SchedulerService = require('./services/scheduler/SchedulerService');
const MaintenanceAgent = require('./services/maintenance/MaintenanceAgent');
const TrafficMonitor = require('./middleware/trafficMonitor');
const AdminUser = require('./models/AdminUser');
const Setting = require('./models/Settings');
const { securityHeaders, rateLimit, requestLogger, cacheControl } = require('./middleware/production');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize traffic monitor & maintenance agent
const trafficMonitor = new TrafficMonitor();
const maintenanceAgent = new MaintenanceAgent();

// ---- Production Middleware ----
app.use(securityHeaders);
app.use(requestLogger);
app.use(cacheControl());
app.use(rateLimit(60000, 200)); // 200 requests per minute
app.use(trafficMonitor.middleware()); // Real-time traffic monitoring

// ---- Core Middleware ----
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.SITE_URL, `https://${process.env.DEPLOY_DOMAIN}`].filter(Boolean)
    : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser (simple inline)
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      req.cookies[name] = value;
    });
  }
  next();
});

// ---- Make shared services available to routes ----
app.set('trafficMonitor', trafficMonitor);
app.set('maintenanceAgent', maintenanceAgent);

// ---- Static Files ----
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
}));

// ---- API Routes ----
app.use('/api', apiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/public', publicRouter);

// ---- Page Routes ----

// Dynamic sitemap.xml (SEO)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const AiTool = require('./models/AiTool');
    const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
    const tools = await AiTool.find({ is_active: true }).select('slug updated_at').lean();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url><loc>${baseUrl}/</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;

    tools.forEach(tool => {
      const lastmod = tool.updated_at ? new Date(tool.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `  <url><loc>${baseUrl}/tool/${tool.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
    });

    xml += `</urlset>`;
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    // Fallback to static sitemap
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
  }
});

// Admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SPA catch-all
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ---- Error Handling ----
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// ---- Start Server ----
async function start() {
  try {
    // Connect to MongoDB
    await database.connect();

    // Ensure default admin user exists
    await AdminUser.ensureDefaultAdmin();

    // Seed default settings
    await Setting.seedDefaults();

    // Initialize scheduler
    const scheduler = new SchedulerService();
    setScheduler(scheduler);

    // Start scheduled jobs
    if (process.env.NODE_ENV !== 'test') {
      scheduler.start();
    }

    // Schedule daily maintenance agent (runs at 3 AM)
    const cron = require('node-cron');
    cron.schedule('0 3 * * *', async () => {
      logger.info('[Scheduler] Running daily maintenance cycle...');
      await maintenanceAgent.runFullCycle();
    });

    // Run initial maintenance check on startup (deferred)
    setTimeout(async () => {
      logger.info('[Startup] Running initial maintenance health check...');
      await maintenanceAgent.runFullCycle();
    }, 10000);

    // Auto-seed if database is empty
    const AiTool = require('./models/AiTool');
    const count = await AiTool.countDocuments();
    if (count === 0) {
      logger.info('🌱 Database is currently EMPTY. Running auto-seed to populate trending tools...');
      const { execSync } = require('child_process');
      try {
        execSync('node scripts/seed.js', { env: process.env, stdio: 'inherit' });
        logger.info('✅ Database auto-seeded successfully!');
      } catch (err) {
        logger.warn('⚠️ Auto-seed failed (if in cloud, it may take a minute). Details:', err.message);
      }
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info('');
      logger.info('═══════════════════════════════════════════════════');
      logger.info('  🤖  AI Tool Discovery Engine v3.0');
      logger.info('═══════════════════════════════════════════════════');
      logger.info(`  🌐  Dashboard:    http://localhost:${PORT}`);
      logger.info(`  ⚙️   Admin:        http://localhost:${PORT}/admin`);
      logger.info(`  📡  API:          http://localhost:${PORT}/api`);
      logger.info(`  ❤️   Health:       http://localhost:${PORT}/api/health`);
      logger.info(`  📊  Trending:     http://localhost:${PORT}/api/trending`);
      logger.info(`  💬  Jack AI Chat: http://localhost:${PORT}/api/public/chat`);
      logger.info(`  🔧  Maintenance:  http://localhost:${PORT}/api/admin/maintenance`);
      logger.info(`  📈  Traffic:      http://localhost:${PORT}/api/admin/traffic`);
      logger.info('═══════════════════════════════════════════════════');
      logger.info(`  👤  Admin login: CallmeJack / Jack@2026`);
      logger.info('═══════════════════════════════════════════════════');
      logger.info('');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  trafficMonitor.destroy();
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  trafficMonitor.destroy();
  await database.disconnect();
  process.exit(0);
});

module.exports = app;
