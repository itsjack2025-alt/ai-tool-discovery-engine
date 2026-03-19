// =========================================
// Run Discovery - Manual pipeline trigger
// =========================================
require('dotenv').config();
const database = require('../config/database');
const SchedulerService = require('../services/scheduler/SchedulerService');
const logger = require('../utils/logger');

async function runDiscovery() {
  logger.info('🚀 Manual Discovery Pipeline Triggered');

  try {
    await database.connect();
    const scheduler = new SchedulerService();
    const result = await scheduler.runFullPipeline();

    logger.info('🏁 Discovery Results:', result);
  } catch (error) {
    logger.error('Discovery failed:', error);
  } finally {
    await database.disconnect();
    process.exit(0);
  }
}

runDiscovery();
