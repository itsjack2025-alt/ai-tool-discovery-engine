// =========================================
// Discovery Worker - Background job processor
// =========================================
require('dotenv').config();
const database = require('../config/database');
const queueManager = require('../queues/QueueManager');
const { QUEUE_NAMES, JOB_TYPES } = require('../config/constants');
const CrawlerManager = require('../services/crawlers/CrawlerManager');
const DataNormalizer = require('../services/normalization/DataNormalizer');
const ClassificationEngine = require('../services/classification/ClassificationEngine');
const TrendAnalyzer = require('../services/trends/TrendAnalyzer');
const RankingEngine = require('../services/ranking/RankingEngine');
const logger = require('../utils/logger');

async function startWorker() {
  logger.info('🔧 Starting Discovery Worker...');

  // Connect to database
  await database.connect();

  // Initialize services
  const crawlerManager = new CrawlerManager();
  const normalizer = new DataNormalizer();
  const classifier = new ClassificationEngine();
  const trendAnalyzer = new TrendAnalyzer();
  const rankingEngine = new RankingEngine();

  // Create queues
  queueManager.createQueue(QUEUE_NAMES.DISCOVERY);
  queueManager.createQueue(QUEUE_NAMES.NORMALIZATION);
  queueManager.createQueue(QUEUE_NAMES.CLASSIFICATION);
  queueManager.createQueue(QUEUE_NAMES.TREND_ANALYSIS);
  queueManager.createQueue(QUEUE_NAMES.RANKING);

  // Discovery Worker
  queueManager.createWorker(QUEUE_NAMES.DISCOVERY, async (job) => {
    logger.info(`[Worker] Processing discovery job: ${job.data.type}`);

    switch (job.data.type) {
      case JOB_TYPES.CRAWL_GITHUB: {
        const result = await crawlerManager.runCrawler('github');
        // Queue normalization for results
        await queueManager.addJob(QUEUE_NAMES.NORMALIZATION, JOB_TYPES.NORMALIZE_DATA, {
          tools: result.tools,
        });
        return { toolsFound: result.tools.length };
      }

      case JOB_TYPES.CRAWL_PRODUCTHUNT: {
        const result = await crawlerManager.runCrawler('producthunt');
        await queueManager.addJob(QUEUE_NAMES.NORMALIZATION, JOB_TYPES.NORMALIZE_DATA, {
          tools: result.tools,
        });
        return { toolsFound: result.tools.length };
      }

      case JOB_TYPES.CRAWL_HACKERNEWS: {
        const result = await crawlerManager.runCrawler('hackernews');
        await queueManager.addJob(QUEUE_NAMES.NORMALIZATION, JOB_TYPES.NORMALIZE_DATA, {
          tools: result.tools,
        });
        return { toolsFound: result.tools.length };
      }

      case JOB_TYPES.CRAWL_DIRECTORIES: {
        const result = await crawlerManager.runCrawler('directory');
        await queueManager.addJob(QUEUE_NAMES.NORMALIZATION, JOB_TYPES.NORMALIZE_DATA, {
          tools: result.tools,
        });
        return { toolsFound: result.tools.length };
      }

      case JOB_TYPES.FULL_PIPELINE: {
        const result = await crawlerManager.runAll();
        await queueManager.addJob(QUEUE_NAMES.NORMALIZATION, JOB_TYPES.NORMALIZE_DATA, {
          tools: result.tools,
        });
        return { toolsFound: result.tools.length };
      }

      default:
        throw new Error(`Unknown discovery job type: ${job.data.type}`);
    }
  }, { concurrency: 1 }); // Only 1 crawl at a time

  // Normalization Worker
  queueManager.createWorker(QUEUE_NAMES.NORMALIZATION, async (job) => {
    logger.info(`[Worker] Normalizing ${job.data.tools.length} tools...`);
    const normalized = normalizer.normalizeBatch(job.data.tools);

    // Queue classification
    await queueManager.addJob(QUEUE_NAMES.CLASSIFICATION, JOB_TYPES.CLASSIFY_TOOL, {
      tools: normalized,
    });

    return { normalized: normalized.length };
  });

  // Classification Worker
  queueManager.createWorker(QUEUE_NAMES.CLASSIFICATION, async (job) => {
    logger.info(`[Worker] Classifying ${job.data.tools.length} tools...`);
    const classified = classifier.classifyBatch(job.data.tools);

    // Queue trend analysis
    await queueManager.addJob(QUEUE_NAMES.TREND_ANALYSIS, JOB_TYPES.ANALYZE_TRENDS, {
      tools: classified,
    });

    return { classified: classified.length };
  });

  // Trend Analysis Worker
  queueManager.createWorker(QUEUE_NAMES.TREND_ANALYSIS, async (job) => {
    logger.info(`[Worker] Analyzing trends for ${job.data.tools.length} tools...`);
    const analyzed = trendAnalyzer.analyzeBatch(job.data.tools);

    // Queue ranking update
    await queueManager.addJob(QUEUE_NAMES.RANKING, JOB_TYPES.UPDATE_RANKINGS, {
      tools: analyzed,
    });

    return { analyzed: analyzed.length };
  });

  // Ranking Worker
  queueManager.createWorker(QUEUE_NAMES.RANKING, async (job) => {
    logger.info(`[Worker] Applying rankings for ${job.data.tools.length} tools...`);
    const result = await rankingEngine.applyTrendScores(job.data.tools);
    return result;
  });

  logger.info('✅ Discovery Worker started - waiting for jobs...');
}

startWorker().catch((error) => {
  logger.error('Worker failed to start:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Worker shutting down...');
  await queueManager.closeAll();
  await database.disconnect();
  process.exit(0);
});
