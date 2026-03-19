// =========================================
// Crawler Manager - Orchestrates all crawlers
// =========================================
const GitHubCrawler = require('./GitHubCrawler');
const ProductHuntCrawler = require('./ProductHuntCrawler');
const HackerNewsCrawler = require('./HackerNewsCrawler');
const DirectoryCrawler = require('./DirectoryCrawler');
const logger = require('../../utils/logger');

class CrawlerManager {
  constructor() {
    this.crawlers = {
      github: new GitHubCrawler(),
      producthunt: new ProductHuntCrawler(),
      hackernews: new HackerNewsCrawler(),
      directory: new DirectoryCrawler(),
    };
    this.lastRunResults = null;
  }

  /**
   * Run all crawlers and aggregate results
   */
  async runAll() {
    logger.info('🚀 Starting full discovery crawl across all sources...');
    const startTime = Date.now();
    const allResults = [];
    const allStats = {};

    for (const [name, crawler] of Object.entries(this.crawlers)) {
      try {
        const result = await crawler.execute();
        allResults.push(...result.tools);
        allStats[name] = result.stats;
        logger.info(`[CrawlerManager] ${name}: ${result.tools.length} tools found`);
      } catch (error) {
        logger.error(`[CrawlerManager] ${name} crawler failed:`, error);
        allStats[name] = { error: error.message };
      }
    }

    // Deduplicate across all sources
    const deduped = this.deduplicateTools(allResults);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    const summary = {
      totalRawResults: allResults.length,
      totalDeduped: deduped.length,
      duration: `${duration}s`,
      stats: allStats,
      timestamp: new Date(),
    };

    this.lastRunResults = summary;

    logger.info(
      `✅ Full discovery complete: ${deduped.length} unique tools from ${allResults.length} raw results (${duration}s)`
    );

    return { tools: deduped, summary };
  }

  /**
   * Run a specific crawler
   */
  async runCrawler(name) {
    const crawler = this.crawlers[name];
    if (!crawler) {
      throw new Error(`Unknown crawler: ${name}. Available: ${Object.keys(this.crawlers).join(', ')}`);
    }

    return crawler.execute();
  }

  /**
   * Run crawlers in parallel (for faster discovery)
   */
  async runParallel(crawlerNames = null) {
    const names = crawlerNames || Object.keys(this.crawlers);
    logger.info(`🚀 Running ${names.length} crawlers in parallel...`);

    const promises = names.map(name => {
      const crawler = this.crawlers[name];
      if (!crawler) {
        logger.warn(`Unknown crawler: ${name}`);
        return Promise.resolve({ tools: [], stats: { error: 'Unknown crawler' } });
      }
      return crawler.execute().catch(error => {
        logger.error(`Crawler ${name} failed:`, error);
        return { tools: [], stats: { error: error.message } };
      });
    });

    const results = await Promise.all(promises);
    const allTools = results.flatMap(r => r.tools);
    const deduped = this.deduplicateTools(allTools);

    logger.info(`✅ Parallel crawl complete: ${deduped.length} unique tools`);
    return { tools: deduped, results };
  }

  /**
   * Deduplicate tools by name similarity
   */
  deduplicateTools(tools) {
    const seen = new Map();

    for (const tool of tools) {
      const key = tool.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (seen.has(key)) {
        // Merge: prefer the record with more data
        const existing = seen.get(key);
        seen.set(key, this.mergeToolData(existing, tool));
      } else {
        seen.set(key, tool);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Merge two tool records, preferring the one with more information
   */
  mergeToolData(existing, incoming) {
    return {
      ...existing,
      description: existing.description?.length > incoming.description?.length
        ? existing.description
        : incoming.description || existing.description,
      website: existing.website || incoming.website,
      logo: existing.logo || incoming.logo,
      github_url: existing.github_url || incoming.github_url,
      github_stars: Math.max(existing.github_stars || 0, incoming.github_stars || 0),
      github_forks: Math.max(existing.github_forks || 0, incoming.github_forks || 0),
      producthunt_votes: Math.max(existing.producthunt_votes || 0, incoming.producthunt_votes || 0),
      producthunt_url: existing.producthunt_url || incoming.producthunt_url,
      hackernews_points: Math.max(existing.hackernews_points || 0, incoming.hackernews_points || 0),
      hackernews_mentions: Math.max(existing.hackernews_mentions || 0, incoming.hackernews_mentions || 0),
      features: [...new Set([...(existing.features || []), ...(incoming.features || [])])].slice(0, 15),
      tags: [...new Set([...(existing.tags || []), ...(incoming.tags || [])])].slice(0, 20),
      ai_relevance_score: Math.max(existing.ai_relevance_score || 0, incoming.ai_relevance_score || 0),
      sources: [...new Set([existing.source, incoming.source])],
    };
  }

  /**
   * Get last run summary
   */
  getLastRunSummary() {
    return this.lastRunResults;
  }
}

module.exports = CrawlerManager;
