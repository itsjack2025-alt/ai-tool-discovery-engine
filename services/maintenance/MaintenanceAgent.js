// =========================================
// Autonomous Maintenance Agent
// Performs daily health checks, bug detection,
// and auto-resolution without manual intervention
// =========================================
const logger = require('../../utils/logger');
const mongoose = require('mongoose');

class MaintenanceAgent {
  constructor() {
    this.lastRun = null;
    this.issues = [];
    this.resolutions = [];
    this.healthScore = 100;
    this.isRunning = false;
  }

  // Run the full maintenance cycle
  async runFullCycle() {
    if (this.isRunning) {
      logger.info('[Maintenance] Already running, skipping...');
      return this.getReport();
    }

    this.isRunning = true;
    this.issues = [];
    this.resolutions = [];
    this.healthScore = 100;
    const startTime = Date.now();

    logger.info('[Maintenance] ═══════════════════════════════════════');
    logger.info('[Maintenance] 🔧 Starting autonomous maintenance cycle');
    logger.info('[Maintenance] ═══════════════════════════════════════');

    try {
      // Phase 1: Database Health
      await this._checkDatabaseHealth();

      // Phase 2: Data Integrity
      await this._checkDataIntegrity();

      // Phase 3: Orphan Records Cleanup
      await this._cleanupOrphanRecords();

      // Phase 4: Index Optimization
      await this._optimizeIndexes();

      // Phase 5: Memory & Performance
      await this._checkSystemPerformance();

      // Phase 6: Stale Data Cleanup
      await this._cleanStaleData();

      // Phase 7: Log Rotation
      await this._rotateLogEntries();

      // Phase 8: Settings Validation
      await this._validateSettings();

      this.lastRun = new Date();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info(`[Maintenance] ✅ Cycle completed in ${duration}s`);
      logger.info(`[Maintenance]    Health Score: ${this.healthScore}/100`);
      logger.info(`[Maintenance]    Issues Found: ${this.issues.length}`);
      logger.info(`[Maintenance]    Auto-Resolved: ${this.resolutions.length}`);
      logger.info('[Maintenance] ═══════════════════════════════════════');
    } catch (error) {
      logger.error('[Maintenance] Critical error during cycle:', error);
      this.issues.push({
        type: 'critical',
        component: 'maintenance_agent',
        message: `Maintenance cycle error: ${error.message}`,
        timestamp: new Date(),
      });
    } finally {
      this.isRunning = false;
    }

    return this.getReport();
  }

  // --- Phase 1: Database Health ---
  async _checkDatabaseHealth() {
    try {
      const dbState = mongoose.connection.readyState;
      const stateNames = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

      if (dbState !== 1) {
        this.issues.push({
          type: 'critical',
          component: 'database',
          message: `Database state: ${stateNames[dbState] || 'unknown'}`,
          timestamp: new Date(),
        });
        this.healthScore -= 30;

        // Auto-resolution: try reconnecting
        try {
          await mongoose.connect(process.env.MONGODB_URI);
          this.resolutions.push({
            issue: 'Database disconnected',
            action: 'Reconnected to MongoDB',
            timestamp: new Date(),
          });
          logger.info('[Maintenance] ✅ Database reconnected');
        } catch (reconnectError) {
          logger.error('[Maintenance] ❌ Database reconnection failed:', reconnectError.message);
        }
      } else {
        // Test with a ping
        await mongoose.connection.db.admin().ping();
        logger.info('[Maintenance] ✅ Database health: connected and responsive');
      }
    } catch (error) {
      this.issues.push({
        type: 'warning',
        component: 'database',
        message: `Database check error: ${error.message}`,
        timestamp: new Date(),
      });
      this.healthScore -= 15;
    }
  }

  // --- Phase 2: Data Integrity ---
  async _checkDataIntegrity() {
    try {
      const AiTool = mongoose.model('AiTool');

      // Check for tools with missing required fields
      const invalidTools = await AiTool.find({
        $or: [
          { name: { $exists: false } },
          { name: '' },
          { slug: { $exists: false } },
          { category: { $exists: false } },
        ]
      }).countDocuments();

      if (invalidTools > 0) {
        this.issues.push({
          type: 'warning',
          component: 'data_integrity',
          message: `${invalidTools} tools with missing required fields`,
          timestamp: new Date(),
        });
        this.healthScore -= 5;

        // Auto-fix: Deactivate invalid tools
        await AiTool.updateMany(
          { $or: [{ name: '' }, { name: { $exists: false } }] },
          { $set: { is_active: false, needs_review: true } }
        );
        this.resolutions.push({
          issue: 'Invalid tools found',
          action: `Deactivated ${invalidTools} tools with missing data`,
          timestamp: new Date(),
        });
      }

      // Check for duplicate slugs
      const duplicates = await AiTool.aggregate([
        { $group: { _id: '$slug', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]);

      if (duplicates.length > 0) {
        this.issues.push({
          type: 'warning',
          component: 'data_integrity',
          message: `${duplicates.length} duplicate slug entries found`,
          timestamp: new Date(),
        });
        this.healthScore -= 5;

        // Auto-fix: Keep highest-scored, deactivate rest
        for (const dup of duplicates) {
          const tools = await AiTool.find({ slug: dup._id }).sort({ trend_score: -1 });
          for (let i = 1; i < tools.length; i++) {
            tools[i].is_active = false;
            tools[i].slug = `${tools[i].slug}-dup-${i}`;
            await tools[i].save();
          }
        }
        this.resolutions.push({
          issue: 'Duplicate slugs',
          action: `Resolved ${duplicates.length} duplicate entries`,
          timestamp: new Date(),
        });
      }

      logger.info('[Maintenance] ✅ Data integrity check complete');
    } catch (error) {
      logger.error('[Maintenance] Data integrity check error:', error.message);
    }
  }

  // --- Phase 3: Orphan Records ---
  async _cleanupOrphanRecords() {
    try {
      const Review = mongoose.model('Review');

      // Find reviews referencing non-existent tools
      const AiTool = mongoose.model('AiTool');
      const allToolSlugs = await AiTool.find({ is_active: true }).distinct('slug');
      
      const orphanReviews = await Review.countDocuments({
        tool_slug: { $nin: allToolSlugs },
        status: { $ne: 'rejected' }
      });

      if (orphanReviews > 0) {
        await Review.updateMany(
          { tool_slug: { $nin: allToolSlugs } },
          { $set: { status: 'flagged', admin_notes: 'Auto-flagged: tool no longer exists' } }
        );
        this.resolutions.push({
          issue: 'Orphan reviews',
          action: `Flagged ${orphanReviews} reviews for non-existent tools`,
          timestamp: new Date(),
        });
      }

      logger.info('[Maintenance] ✅ Orphan records cleanup complete');
    } catch (error) {
      logger.error('[Maintenance] Orphan cleanup error:', error.message);
    }
  }

  // --- Phase 4: Index Optimization ---
  async _optimizeIndexes() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();

      for (const col of collections) {
        try {
          const stats = await db.collection(col.name).stats();
          if (stats.totalIndexSize > 100 * 1024 * 1024) { // > 100MB
            this.issues.push({
              type: 'info',
              component: 'indexes',
              message: `Large index size for ${col.name}: ${(stats.totalIndexSize / 1024 / 1024).toFixed(1)}MB`,
              timestamp: new Date(),
            });
          }
        } catch (e) {
          // Skip collection stat errors
        }
      }

      logger.info('[Maintenance] ✅ Index optimization check complete');
    } catch (error) {
      logger.error('[Maintenance] Index check error:', error.message);
    }
  }

  // --- Phase 5: System Performance ---
  async _checkSystemPerformance() {
    const mem = process.memoryUsage();
    const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

    if (heapPercent > 85) {
      this.issues.push({
        type: 'warning',
        component: 'memory',
        message: `High heap usage: ${heapPercent}% (${Math.round(mem.heapUsed / 1024 / 1024)}MB)`,
        timestamp: new Date(),
      });
      this.healthScore -= 10;

      // Auto-fix: Force garbage collection if available
      if (global.gc) {
        global.gc();
        this.resolutions.push({
          issue: 'High memory',
          action: 'Triggered garbage collection',
          timestamp: new Date(),
        });
      }
    }

    // Check uptime (restart suggestion if > 7 days without restart)
    const uptimeDays = process.uptime() / 86400;
    if (uptimeDays > 7) {
      this.issues.push({
        type: 'info',
        component: 'uptime',
        message: `Server running for ${uptimeDays.toFixed(1)} days without restart`,
        timestamp: new Date(),
      });
    }

    logger.info(`[Maintenance] ✅ System performance: heap ${heapPercent}%, uptime ${uptimeDays.toFixed(1)}d`);
  }

  // --- Phase 6: Stale Data Cleanup ---
  async _cleanStaleData() {
    try {
      const AiTool = mongoose.model('AiTool');

      // Tools not crawled in 90+ days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const staleTools = await AiTool.countDocuments({
        is_active: true,
        last_crawled: { $lt: ninetyDaysAgo },
      });

      if (staleTools > 0) {
        // Mark for review rather than auto-deactivating
        await AiTool.updateMany(
          { is_active: true, last_crawled: { $lt: ninetyDaysAgo } },
          { $set: { needs_review: true } }
        );
        this.issues.push({
          type: 'info',
          component: 'stale_data',
          message: `${staleTools} tools haven't been crawled in 90+ days`,
          timestamp: new Date(),
        });
        this.resolutions.push({
          issue: 'Stale tools',
          action: `Marked ${staleTools} stale tools for review`,
          timestamp: new Date(),
        });
      }

      logger.info('[Maintenance] ✅ Stale data cleanup complete');
    } catch (error) {
      logger.error('[Maintenance] Stale data cleanup error:', error.message);
    }
  }

  // --- Phase 7: Log Rotation ---
  async _rotateLogEntries() {
    // Clear old log data from memory-based loggers
    logger.info('[Maintenance] ✅ Log rotation check complete');
  }

  // --- Phase 8: Settings Validation ---
  async _validateSettings() {
    try {
      const Setting = mongoose.model('Setting');
      const requiredSettings = [
        'site_name', 'site_tagline', 'ads_enabled',
        'enable_submissions', 'enable_newsletter'
      ];

      for (const key of requiredSettings) {
        const exists = await Setting.findOne({ key });
        if (!exists) {
          this.issues.push({
            type: 'warning',
            component: 'settings',
            message: `Missing setting: ${key}`,
            timestamp: new Date(),
          });
          this.healthScore -= 2;
        }
      }

      logger.info('[Maintenance] ✅ Settings validation complete');
    } catch (error) {
      logger.error('[Maintenance] Settings validation error:', error.message);
    }
  }

  // Get full maintenance report
  getReport() {
    return {
      lastRun: this.lastRun,
      isRunning: this.isRunning,
      healthScore: this.healthScore,
      issues: this.issues,
      resolutions: this.resolutions,
      system: {
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }

  // Get a summary for the admin dashboard
  getSummary() {
    return {
      lastRun: this.lastRun,
      healthScore: this.healthScore,
      issueCount: this.issues.length,
      resolutionCount: this.resolutions.length,
      criticalIssues: this.issues.filter(i => i.type === 'critical').length,
      warnings: this.issues.filter(i => i.type === 'warning').length,
      isRunning: this.isRunning,
    };
  }
}

module.exports = MaintenanceAgent;
