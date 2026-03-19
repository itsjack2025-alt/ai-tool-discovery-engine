// =========================================
// Queue Manager - BullMQ job queues
// =========================================
const { Queue, Worker, QueueScheduler } = require('bullmq');
const { getRedisConfig } = require('../config/redis');
const { QUEUE_NAMES } = require('../config/constants');
const logger = require('../utils/logger');

class QueueManager {
  constructor() {
    this.queues = {};
    this.workers = {};
    this.connection = getRedisConfig();
  }

  /**
   * Create a queue
   */
  createQueue(name) {
    if (this.queues[name]) return this.queues[name];

    this.queues[name] = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    logger.info(`[Queue] Created queue: ${name}`);
    return this.queues[name];
  }

  /**
   * Create a worker for a queue
   */
  createWorker(queueName, processor, options = {}) {
    const worker = new Worker(queueName, processor, {
      connection: this.connection,
      concurrency: options.concurrency || 3,
      limiter: options.limiter || {
        max: 10,
        duration: 60000, // 10 jobs per minute
      },
    });

    worker.on('completed', (job) => {
      logger.info(`[Worker:${queueName}] Job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`[Worker:${queueName}] Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
      logger.error(`[Worker:${queueName}] Worker error:`, error.message);
    });

    this.workers[queueName] = worker;
    logger.info(`[Queue] Created worker for: ${queueName}`);
    return worker;
  }

  /**
   * Add a job to a queue
   */
  async addJob(queueName, jobType, data, options = {}) {
    const queue = this.queues[queueName] || this.createQueue(queueName);

    const job = await queue.add(jobType, data, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options,
    });

    logger.info(`[Queue] Added job ${job.id} to ${queueName}: ${jobType}`);
    return job;
  }

  /**
   * Add a repeatable job
   */
  async addRepeatableJob(queueName, jobType, data, cron) {
    const queue = this.queues[queueName] || this.createQueue(queueName);

    const job = await queue.add(jobType, data, {
      repeat: { cron },
    });

    logger.info(`[Queue] Added repeatable job to ${queueName}: ${jobType} (${cron})`);
    return job;
  }

  /**
   * Get queue stats
   */
  async getStats() {
    const stats = {};

    for (const [name, queue] of Object.entries(this.queues)) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats[name] = { waiting, active, completed, failed, delayed };
    }

    return stats;
  }

  /**
   * Close all queues and workers
   */
  async closeAll() {
    for (const worker of Object.values(this.workers)) {
      await worker.close();
    }
    for (const queue of Object.values(this.queues)) {
      await queue.close();
    }
    logger.info('[Queue] All queues and workers closed');
  }
}

module.exports = new QueueManager();
