// =========================================
// API Routes
// =========================================
const express = require('express');
const router = express.Router();
const AiTool = require('../models/AiTool');
const RankingEngine = require('../services/ranking/RankingEngine');
const SchedulerService = require('../services/scheduler/SchedulerService');
const logger = require('../utils/logger');

const rankingEngine = new RankingEngine();
let schedulerService = null;

function setScheduler(scheduler) {
  schedulerService = scheduler;
}

// ---- Trending Tools ----

/**
 * GET /api/trending
 * Get top trending AI tools
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category || null;
    const tools = await rankingEngine.getTopTrending(limit, category);

    res.json({
      success: true,
      count: tools.length,
      data: tools,
      generated_at: new Date(),
    });
  } catch (error) {
    logger.error('API error /trending:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trending tools' });
  }
});

/**
 * GET /api/trending/categories
 * Get trending tools grouped by category
 */
router.get('/trending/categories', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const result = await rankingEngine.getTrendingByCategory(limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('API error /trending/categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch category trends' });
  }
});

/**
 * GET /api/dashboard
 * Get complete dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const data = await rankingEngine.getDashboardData();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('API error /dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// ---- Tool CRUD ----

/**
 * GET /api/tools
 * List tools with pagination
 */
router.get('/tools', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const category = req.query.category;
    const sort = req.query.sort || 'trend_score';
    const order = req.query.order === 'asc' ? 1 : -1;

    const query = { is_active: true };
    if (category) query.category = category;

    const [tools, total] = await Promise.all([
      AiTool.find(query)
        .sort({ [sort]: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-trend_history -__v')
        .lean(),
      AiTool.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: tools,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('API error /tools:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tools' });
  }
});

/**
 * GET /api/tools/search
 * Full-text search for tools
 */
router.get('/tools/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const tools = await AiTool.searchTools(query, limit);

    res.json({
      success: true,
      query,
      count: tools.length,
      data: tools,
    });
  } catch (error) {
    logger.error('API error /tools/search:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

/**
 * GET /api/tools/:slug
 * Get a single tool by slug
 */
router.get('/tools/:slug', async (req, res) => {
  try {
    const tool = await AiTool.findOne({ slug: req.params.slug, is_active: true }).lean();
    if (!tool) {
      return res.status(404).json({ success: false, error: 'Tool not found' });
    }

    res.json({ success: true, data: tool });
  } catch (error) {
    logger.error('API error /tools/:slug:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tool' });
  }
});

// ---- Stats & Admin ----

/**
 * GET /api/stats
 * Get system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalTools, categoryStats, sourceStats] = await Promise.all([
      AiTool.countDocuments({ is_active: true }),
      AiTool.getCategoryStats(),
      AiTool.aggregate([
        { $match: { is_active: true } },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            avg_score: { $avg: '$trend_score' },
          },
        },
      ]),
    ]);

    const trendDistribution = await AiTool.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: '$trend_direction',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        total_tools: totalTools,
        categories: categoryStats,
        sources: sourceStats,
        trends: trendDistribution,
      },
    });
  } catch (error) {
    logger.error('API error /stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/scheduler/status
 * Get scheduler status
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = schedulerService ? schedulerService.getStatus() : { error: 'Scheduler not initialized' };
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch scheduler status' });
  }
});

/**
 * POST /api/discovery/run
 * Manually trigger discovery pipeline
 */
router.post('/discovery/run', async (req, res) => {
  try {
    if (!schedulerService) {
      return res.status(500).json({ success: false, error: 'Scheduler not initialized' });
    }

    // Run in background
    res.json({
      success: true,
      message: 'Discovery pipeline started. Check /api/scheduler/status for progress.',
    });

    // Don't await - run in background
    schedulerService.runFullPipeline().catch(error => {
      logger.error('Manual pipeline failed:', error);
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to start discovery' });
  }
});

/**
 * GET /api/traffic/live
 * Public-facing live visitor count (no auth required)
 */
router.get('/traffic/live', async (req, res) => {
  try {
    const trafficMonitor = req.app.get('trafficMonitor');
    if (!trafficMonitor) {
      return res.json({ success: true, data: { activeConnections: 0, requestsPerMinute: 0 } });
    }
    const snapshot = trafficMonitor.getSnapshot();
    res.json({
      success: true,
      data: {
        activeConnections: snapshot.activeConnections,
        requestsPerMinute: snapshot.requestsPerMinute,
        avgResponseTime: snapshot.avgResponseTime,
        uptimeFormatted: snapshot.uptimeFormatted,
      },
    });
  } catch (error) {
    res.json({ success: true, data: { activeConnections: 0, requestsPerMinute: 0 } });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  const dbStatus = require('../config/database').getStatus();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
    database: dbStatus,
  });
});



/**
 * GET /api/tools/:slug/similar
 * Get similar tools in the same category
 */
router.get('/tools/:slug/similar', async (req, res) => {
  try {
    const tool = await AiTool.findOne({ slug: req.params.slug, is_active: true }).lean();
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });

    const similar = await AiTool.find({
      category: tool.category,
      slug: { $ne: tool.slug },
      is_active: true,
    })
      .sort({ trend_score: -1 })
      .limit(6)
      .select('name slug category short_description trend_score trend_direction pricing features logo')
      .lean();

    res.json({ success: true, data: similar });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch similar tools' });
  }
});

module.exports = { router, setScheduler };
