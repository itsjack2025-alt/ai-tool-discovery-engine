// =========================================
// Base Crawler - Abstract crawler class
// =========================================
const axios = require('axios');
const logger = require('../../utils/logger');
const { sleep, retryWithBackoff } = require('../../utils/helpers');

class BaseCrawler {
  constructor(name, options = {}) {
    this.name = name;
    this.concurrency = options.concurrency || parseInt(process.env.CRAWLER_CONCURRENCY || '5');
    this.delayMs = options.delayMs || parseInt(process.env.CRAWLER_DELAY_MS || '2000');
    this.maxPages = options.maxPages || parseInt(process.env.CRAWLER_MAX_PAGES || '100');
    this.userAgent = options.userAgent || process.env.CRAWLER_USER_AGENT || 'AIToolDiscoveryBot/1.0';
    this.results = [];
    this.errors = [];
    this.stats = {
      pagesScanned: 0,
      toolsFound: 0,
      errors: 0,
      startTime: null,
      endTime: null,
    };

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json, text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
    });
  }

  /**
   * Override in subclass - main crawl logic
   */
  async crawl() {
    throw new Error('crawl() must be implemented by subclass');
  }

  /**
   * Execute the crawler with stats tracking
   */
  async execute() {
    this.stats.startTime = new Date();
    logger.info(`🕷️  [${this.name}] Starting crawl...`);

    try {
      await this.crawl();
    } catch (error) {
      logger.error(`❌ [${this.name}] Crawl failed:`, error);
      this.errors.push({ error: error.message, timestamp: new Date() });
      this.stats.errors++;
    }

    this.stats.endTime = new Date();
    this.stats.toolsFound = this.results.length;
    const duration = ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(1);

    logger.info(
      `✅ [${this.name}] Crawl complete: ${this.stats.toolsFound} tools found, ` +
      `${this.stats.pagesScanned} pages scanned, ${this.stats.errors} errors, ` +
      `${duration}s elapsed`
    );

    return {
      source: this.name,
      tools: this.results,
      stats: this.stats,
      errors: this.errors,
    };
  }

  /**
   * Make an HTTP request with retry and rate limiting
   */
  async fetch(url, options = {}) {
    await sleep(this.delayMs);
    this.stats.pagesScanned++;

    return retryWithBackoff(async () => {
      try {
        const response = await this.httpClient.get(url, options);
        return response.data;
      } catch (error) {
        if (error.response?.status === 429) {
          logger.warn(`[${this.name}] Rate limited, backing off...`);
          await sleep(this.delayMs * 5);
          throw error;
        }
        if (error.response?.status >= 400) {
          logger.warn(`[${this.name}] HTTP ${error.response.status} for ${url}`);
        }
        throw error;
      }
    }, 3, this.delayMs);
  }

  /**
   * Make a POST request
   */
  async post(url, data, options = {}) {
    await sleep(this.delayMs);
    this.stats.pagesScanned++;

    return retryWithBackoff(async () => {
      const response = await this.httpClient.post(url, data, options);
      return response.data;
    }, 3, this.delayMs);
  }

  /**
   * Add a discovered tool to results
   */
  addResult(toolData) {
    if (toolData && toolData.name) {
      // Deduplicate by name
      const exists = this.results.find(
        r => r.name.toLowerCase() === toolData.name.toLowerCase()
      );
      if (!exists) {
        this.results.push({
          ...toolData,
          discovered_at: new Date(),
          source: this.name,
        });
      }
    }
  }

  /**
   * Add error to tracking
   */
  addError(message, context = {}) {
    this.errors.push({
      message,
      context,
      timestamp: new Date(),
    });
    this.stats.errors++;
    logger.warn(`[${this.name}] ${message}`, context);
  }
}

module.exports = BaseCrawler;
