// =========================================
// Product Hunt Crawler
// =========================================
const BaseCrawler = require('./BaseCrawler');
const cheerio = require('cheerio');
const { isAIRelated, getAIRelevanceScore, cleanText, detectPricing } = require('../../utils/helpers');
const logger = require('../../utils/logger');

class ProductHuntCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('producthunt', options);
    this.baseUrl = 'https://www.producthunt.com';
  }

  async crawl() {
    logger.info('[ProductHunt] Starting AI tool discovery...');

    // Strategy 1: Crawl AI-specific topic pages
    await this.crawlTopicPages();

    // Strategy 2: Search for AI tools
    await this.searchAITools();

    // Strategy 3: Crawl recent launches
    await this.crawlRecentLaunches();
  }

  async crawlTopicPages() {
    const topics = [
      'artificial-intelligence',
      'machine-learning',
      'generative-ai',
      'chatgpt',
      'ai-tools',
      'developer-tools',
      'productivity',
      'writing-tools',
      'design-tools',
      'no-code',
    ];

    for (const topic of topics) {
      try {
        const html = await this.fetch(`${this.baseUrl}/topics/${topic}`, {
          headers: {
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        this.parseProductPage(html);
      } catch (error) {
        this.addError(`Topic page failed: ${topic}`, { error: error.message });
      }
    }
  }

  async searchAITools() {
    const searchTerms = [
      'AI assistant',
      'AI writing',
      'AI image generator',
      'AI code',
      'AI video',
      'AI automation',
      'LLM tool',
      'chatbot builder',
      'AI productivity',
      'AI marketing',
    ];

    for (const term of searchTerms) {
      try {
        const html = await this.fetch(
          `${this.baseUrl}/search?q=${encodeURIComponent(term)}`,
          {
            headers: {
              'Accept': 'text/html,application/xhtml+xml',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          }
        );

        this.parseProductPage(html);
      } catch (error) {
        this.addError(`Search failed: ${term}`, { error: error.message });
      }
    }
  }

  async crawlRecentLaunches() {
    try {
      // Crawl the main page for today's launches
      const html = await this.fetch(this.baseUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      this.parseProductPage(html);
    } catch (error) {
      this.addError('Recent launches crawl failed', { error: error.message });
    }
  }

  parseProductPage(html) {
    if (!html || typeof html !== 'string') return;

    const $ = cheerio.load(html);

    // Product Hunt uses various selectors for product cards
    // Try different selectors as PH changes their HTML structure
    const selectors = [
      '[data-test="post-item"]',
      '.styles_item__Dk_nz',
      'a[href^="/posts/"]',
      'div[class*="productCard"]',
      'li[class*="item"]',
    ];

    // Extract from structured data if available
    const scripts = $('script[type="application/ld+json"]');
    scripts.each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'Product' || data['@type'] === 'SoftwareApplication') {
          this.processStructuredData(data);
        }
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item['@type'] === 'Product' || item['@type'] === 'SoftwareApplication') {
              this.processStructuredData(item);
            }
          });
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    // Extract from meta tags and page content
    this.extractFromPageContent($);
  }

  processStructuredData(data) {
    const name = data.name;
    const description = data.description || '';

    if (name && isAIRelated(`${name} ${description}`)) {
      const pricing = detectPricing(description);

      this.addResult({
        name: cleanText(name, 100),
        description: cleanText(description, 500),
        short_description: cleanText(description, 200),
        website: data.url || '',
        logo: data.image || data.logo || '',
        category: 'Uncategorized',
        pricing: { model: pricing.model },
        free_plan: pricing.hasFree,
        features: [],
        producthunt_votes: 0,
        producthunt_url: data.url || '',
        source_url: data.url || '',
        ai_relevance_score: getAIRelevanceScore(`${name} ${description}`),
      });
    }
  }

  extractFromPageContent($) {
    // Extract product names and descriptions from the page
    const productElements = $('a[href^="/posts/"]').toArray();

    for (const el of productElements) {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        const name = $el.text().trim();

        if (!name || name.length < 2 || name.length > 100) continue;

        // Get parent context for description
        const parent = $el.closest('li, div[class*="item"], div[class*="post"]');
        const description = parent.find('p, [class*="description"], [class*="tagline"]').first().text().trim();
        const votesText = parent.find('[class*="vote"], [class*="upvote"], button').first().text().trim();
        const votes = parseInt(votesText.replace(/[^\d]/g, '')) || 0;

        if (isAIRelated(`${name} ${description}`)) {
          const pricing = detectPricing(description);

          this.addResult({
            name: cleanText(name, 100),
            description: cleanText(description || `${name} - Discovered on Product Hunt`, 500),
            short_description: cleanText(description, 200),
            website: `${this.baseUrl}${href}`,
            logo: parent.find('img').first().attr('src') || '',
            category: 'Uncategorized',
            pricing: { model: pricing.model },
            free_plan: pricing.hasFree,
            features: [],
            producthunt_votes: votes,
            producthunt_url: `${this.baseUrl}${href}`,
            source_url: `${this.baseUrl}${href}`,
            ai_relevance_score: getAIRelevanceScore(`${name} ${description}`),
          });
        }
      } catch {
        // Skip individual element errors
      }
    }
  }
}

module.exports = ProductHuntCrawler;
