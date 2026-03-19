// =========================================
// Scheduler Service - Automated job scheduling
// =========================================
const cron = require('node-cron');
const logger = require('../../utils/logger');
const CrawlerManager = require('../crawlers/CrawlerManager');
const DataNormalizer = require('../normalization/DataNormalizer');
const ClassificationEngine = require('../classification/ClassificationEngine');
const TrendAnalyzer = require('../trends/TrendAnalyzer');
const RankingEngine = require('../ranking/RankingEngine');
const database = require('../../config/database');

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.crawlerManager = new CrawlerManager();
    this.normalizer = new DataNormalizer();
    this.classifier = new ClassificationEngine();
    this.trendAnalyzer = new TrendAnalyzer();
    this.rankingEngine = new RankingEngine();
    this.isRunning = false;
    this.lastRun = null;
    this.runHistory = [];
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    logger.info('⏰ Starting scheduler service...');

    // Daily: Full discovery pipeline (2 AM)
    const dailyCron = process.env.DAILY_DISCOVERY_CRON || '0 2 * * *';
    this.scheduleJob('daily-discovery', dailyCron, () => this.runFullPipeline());

    // Daily: Update rankings (3 AM)
    this.scheduleJob('daily-ranking', '0 3 * * *', () => this.runRankingUpdate());

    // Hourly: Update GitHub signals
    const hourlyCron = process.env.HOURLY_SIGNALS_CRON || '0 * * * *';
    this.scheduleJob('hourly-signals', hourlyCron, () => this.runSignalUpdate());

    // Every 6 hours: Quick discovery (GitHub trending only)
    this.scheduleJob('quick-discovery', '0 */6 * * *', () => this.runQuickDiscovery());

    logger.info(`⏰ ${this.jobs.length} jobs scheduled`);
  }

  /**
   * Schedule a cron job
   */
  scheduleJob(name, cronExpression, handler) {
    if (!cron.validate(cronExpression)) {
      logger.error(`Invalid cron expression for ${name}: ${cronExpression}`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      logger.info(`⏰ Running scheduled job: ${name}`);
      const startTime = Date.now();

      try {
        await handler();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.info(`✅ Job ${name} completed in ${duration}s`);
        this.recordRun(name, 'success', duration);
      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.error(`❌ Job ${name} failed after ${duration}s:`, error);
        this.recordRun(name, 'failed', duration, error.message);
      }
    }, {
      scheduled: true,
      timezone: 'UTC',
    });

    this.jobs.push({ name, cron: cronExpression, job });
    logger.info(`  📅 ${name}: ${cronExpression}`);
  }

  /**
   * Run the full discovery pipeline
   * Step 1-8 as defined in requirements
   */
  async runFullPipeline() {
    if (this.isRunning) {
      logger.warn('[Scheduler] Pipeline already running, skipping...');
      return;
    }

    this.isRunning = true;
    const pipelineStart = Date.now();

    try {
      logger.info('🚀 ═══════════════════════════════════════');
      logger.info('🚀 FULL DISCOVERY PIPELINE STARTED');
      logger.info('🚀 ═══════════════════════════════════════');

      // Step 1 & 2: Crawl external sources and extract raw data
      logger.info('📡 Step 1-2: Crawling external sources...');
      const crawlResult = await this.crawlerManager.runAll();
      logger.info(`   Found ${crawlResult.tools.length} raw tools`);

      if (crawlResult.tools.length === 0) {
        logger.warn('No tools found, pipeline ending early');
        return;
      }

      // Step 3: Normalize data
      logger.info('🔧 Step 3: Normalizing data...');
      const normalizedTools = this.normalizer.normalizeBatch(crawlResult.tools);
      logger.info(`   Normalized ${normalizedTools.length} tools`);

      // Step 4: Classify tools
      logger.info('🏷️  Step 4: Classifying tools...');
      const classifiedTools = this.classifier.classifyBatch(normalizedTools);
      logger.info(`   Classified ${classifiedTools.length} tools`);

      // Step 5: Analyze trends
      logger.info('📊 Step 5: Analyzing trend signals...');
      const analyzedTools = this.trendAnalyzer.analyzeBatch(classifiedTools);
      logger.info(`   Analyzed ${analyzedTools.length} tools`);

      // Step 6: Calculate rankings
      logger.info('🏆 Step 6: Calculating trend scores...');
      // Scores already calculated by TrendAnalyzer

      // Step 7: Save to MongoDB
      logger.info('💾 Step 7: Saving to database...');
      const saveResult = await this.rankingEngine.applyTrendScores(analyzedTools);
      logger.info(`   Created: ${saveResult.created}, Updated: ${saveResult.updated}`);

      // Step 8: Update dashboard trending
      logger.info('📈 Step 8: Updating dashboard...');
      await this.rankingEngine.updateAllRankings();

      const duration = ((Date.now() - pipelineStart) / 1000).toFixed(1);

      logger.info('🚀 ═══════════════════════════════════════');
      logger.info(`🚀 PIPELINE COMPLETE: ${duration}s`);
      logger.info(`🚀 Tools: ${analyzedTools.length} processed`);
      logger.info(`🚀 Saved: ${saveResult.created} new, ${saveResult.updated} updated`);
      logger.info('🚀 ═══════════════════════════════════════');

      this.lastRun = {
        type: 'full-pipeline',
        duration: `${duration}s`,
        toolsProcessed: analyzedTools.length,
        newTools: saveResult.created,
        updatedTools: saveResult.updated,
        timestamp: new Date(),
      };

      return this.lastRun;
    } catch (error) {
      logger.error('❌ Pipeline failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Quick discovery - GitHub trending only
   */
  async runQuickDiscovery() {
    logger.info('[Scheduler] Running quick discovery (GitHub only)...');

    const result = await this.crawlerManager.runCrawler('github');
    const normalized = this.normalizer.normalizeBatch(result.tools);
    const classified = this.classifier.classifyBatch(normalized);
    const analyzed = this.trendAnalyzer.analyzeBatch(classified);
    await this.rankingEngine.applyTrendScores(analyzed);

    logger.info(`[Scheduler] Quick discovery: ${analyzed.length} tools processed`);
  }

  /**
   * Update rankings only (no new discovery)
   */
  async runRankingUpdate() {
    logger.info('[Scheduler] Running ranking update...');
    await this.rankingEngine.updateAllRankings();
  }

  /**
   * Update popularity signals
   */
  async runSignalUpdate() {
    logger.info('[Scheduler] Running signal update...');
    // This would update GitHub stars, PH votes for existing tools
    // For now, runs a quick GitHub check
    try {
      const result = await this.crawlerManager.runCrawler('github');
      if (result.tools.length > 0) {
        const normalized = this.normalizer.normalizeBatch(result.tools);
        const analyzed = this.trendAnalyzer.analyzeBatch(normalized);
        await this.rankingEngine.applyTrendScores(analyzed);
      }
    } catch (error) {
      logger.warn('[Scheduler] Signal update failed:', error.message);
    }
  }

  /**
   * Record job run history
   */
  recordRun(name, status, duration, error = null) {
    this.runHistory.push({
      name,
      status,
      duration,
      error,
      timestamp: new Date(),
    });

    // Keep last 100 entries
    if (this.runHistory.length > 100) {
      this.runHistory = this.runHistory.slice(-100);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      scheduledJobs: this.jobs.map(j => ({
        name: j.name,
        cron: j.cron,
      })),
      recentHistory: this.runHistory.slice(-10),
    };
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    for (const { name, job } of this.jobs) {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    }
    this.jobs = [];
    logger.info('⏰ Scheduler stopped');
  }
}

module.exports = SchedulerService;
