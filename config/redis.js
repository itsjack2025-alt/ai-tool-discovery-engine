// =========================================
// Redis Configuration
// =========================================
const IORedis = require('ioredis');
const logger = require('../utils/logger');

let redisConnection = null;

function getRedisConnection() {
  if (redisConnection) return redisConnection;

  redisConnection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
      return delay;
    },
  });

  redisConnection.on('connect', () => {
    logger.info('✅ Redis connected');
  });

  redisConnection.on('error', (err) => {
    logger.error('Redis connection error:', err.message);
  });

  return redisConnection;
}

function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

module.exports = { getRedisConnection, getRedisConfig };
