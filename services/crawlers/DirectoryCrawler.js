// =========================================
// AI Directory Crawler
// Crawls AI tool directories and listings
// =========================================
const BaseCrawler = require('./BaseCrawler');
const cheerio = require('cheerio');
const { isAIRelated, getAIRelevanceScore, cleanText, detectPricing, extractDomain } = require('../../utils/helpers');
const logger = require('../../utils/logger');

class DirectoryCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('directory', options);
  }

  async crawl() {
    logger.info('[Directory] Starting AI directory discovery...');

    // Crawl known AI tool directories and aggregator sites
    const directories = [
      { name: 'AI Tool Directory', fn: () => this.crawlGenericDirectory('https://aitoolsdirectory.com') },
      { name: 'There\'s An AI For That', fn: () => this.crawlThereIsAnAI() },
      { name: 'Future Tools', fn: () => this.crawlFutureTools() },
      { name: 'AI Tool Guru', fn: () => this.crawlGenericDirectory('https://aitoolguru.com') },
    ];

    for (const dir of directories) {
      try {
        logger.info(`[Directory] Crawling ${dir.name}...`);
        await dir.fn();
      } catch (error) {
        this.addError(`Directory crawl failed: ${dir.name}`, { error: error.message });
      }
    }
  }

  async crawlThereIsAnAI() {
    try {
      const categories = [
        'text', 'image', 'code', 'video', 'audio', 'business',
        'marketing', 'productivity', 'education', 'design',
      ];

      for (const category of categories) {
        try {
          const html = await this.fetch(`https://theresanaiforthat.com/${category}/`, {
            headers: { 'Accept': 'text/html' },
          });

          if (typeof html === 'string') {
            this.parseDirectoryPage(html, 'theresanaiforthat.com');
          }
        } catch {
          // Category page not accessible
        }
      }
    } catch (error) {
      this.addError('TheresAnAIForThat crawl failed', { error: error.message });
    }
  }

  async crawlFutureTools() {
    try {
      const pages = [
        'https://www.futuretools.io/',
        'https://www.futuretools.io/tools?pricing-model=free',
        'https://www.futuretools.io/tools?sort=new',
      ];

      for (const url of pages) {
        try {
          const html = await this.fetch(url, {
            headers: { 'Accept': 'text/html' },
          });

          if (typeof html === 'string') {
            this.parseDirectoryPage(html, 'futuretools.io');
          }
        } catch {
          // Page not accessible
        }
      }
    } catch (error) {
      this.addError('FutureTools crawl failed', { error: error.message });
    }
  }

  async crawlGenericDirectory(baseUrl) {
    try {
      const html = await this.fetch(baseUrl, {
        headers: { 'Accept': 'text/html' },
      });

      if (typeof html === 'string') {
        const domain = extractDomain(baseUrl);
        this.parseDirectoryPage(html, domain);

        // Follow category links
        const $ = cheerio.load(html);
        const categoryLinks = $('a[href*="category"], a[href*="tag"], a[href*="tools"]')
          .map((_, el) => $(el).attr('href'))
          .get()
          .filter(href => href && !href.startsWith('#'))
          .slice(0, 10);

        for (const link of categoryLinks) {
          try {
            const fullUrl = link.startsWith('http') ? link : `${baseUrl}${link}`;
            const categoryHtml = await this.fetch(fullUrl, {
              headers: { 'Accept': 'text/html' },
            });
            if (typeof categoryHtml === 'string') {
              this.parseDirectoryPage(categoryHtml, domain);
            }
          } catch {
            // Category link not accessible
          }
        }
      }
    } catch (error) {
      this.addError(`Generic directory crawl failed: ${baseUrl}`, { error: error.message });
    }
  }

  parseDirectoryPage(html, sourceDomain) {
    const $ = cheerio.load(html);

    // Strategy 1: Look for structured data
    const scripts = $('script[type="application/ld+json"]');
    scripts.each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        this.processStructuredData(data, sourceDomain);
      } catch {
        // Invalid JSON
      }
    });

    // Strategy 2: Look for common card/list patterns
    const cardSelectors = [
      'article', '.tool-card', '.card', '[class*="tool"]',
      '[class*="product"]', '[class*="item"]', '.post',
    ];

    for (const selector of cardSelectors) {
      $(selector).each((_, el) => {
        this.extractToolFromCard($, $(el), sourceDomain);
      });
    }

    // Strategy 3: Extract from lists
    $('ul li, ol li').each((_, el) => {
      const $li = $(el);
      const link = $li.find('a').first();
      const href = link.attr('href');
      const name = link.text().trim();
      const description = $li.text().replace(name, '').trim();

      if (name && href && isAIRelated(`${name} ${description}`)) {
        const pricing = detectPricing(description);
        this.addResult({
          name: cleanText(name, 100),
          description: cleanText(description || `${name} - AI Tool`, 500),
          short_description: cleanText(description, 200),
          website: href.startsWith('http') ? href : '',
          logo: $li.find('img').first().attr('src') || '',
          category: 'Uncategorized',
          pricing: { model: pricing.model },
          free_plan: pricing.hasFree,
          features: [],
          source_url: `https://${sourceDomain}`,
          ai_relevance_score: getAIRelevanceScore(`${name} ${description}`),
        });
      }
    });
  }

  extractToolFromCard($, $card, sourceDomain) {
    const name = $card.find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
    const description = $card.find('p, [class*="desc"], [class*="summary"], [class*="excerpt"]').first().text().trim();
    const link = $card.find('a').first().attr('href');
    const image = $card.find('img').first().attr('src') || $card.find('img').first().attr('data-src');

    if (!name || name.length < 2) return;

    const combinedText = `${name} ${description}`;
    if (!isAIRelated(combinedText)) return;

    const pricing = detectPricing(description);

    // Try to extract features from the card
    const features = [];
    $card.find('li, [class*="feature"], [class*="tag"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 3 && text.length < 100) {
        features.push(text);
      }
    });

    this.addResult({
      name: cleanText(name, 100),
      description: cleanText(description || `${name} - AI Tool`, 500),
      short_description: cleanText(description, 200),
      website: link && link.startsWith('http') ? link : '',
      logo: image || '',
      category: 'Uncategorized',
      pricing: { model: pricing.model },
      free_plan: pricing.hasFree,
      features: features.slice(0, 10),
      source_url: `https://${sourceDomain}`,
      ai_relevance_score: getAIRelevanceScore(combinedText),
    });
  }

  processStructuredData(data, sourceDomain) {
    if (Array.isArray(data)) {
      data.forEach(item => this.processStructuredData(item, sourceDomain));
      return;
    }

    if (data['@type'] === 'Product' || data['@type'] === 'SoftwareApplication') {
      const name = data.name;
      const description = data.description || '';

      if (name && isAIRelated(`${name} ${description}`)) {
        const pricing = detectPricing(description);
        this.addResult({
          name: cleanText(name, 100),
          description: cleanText(description, 500),
          short_description: cleanText(description, 200),
          website: data.url || '',
          logo: data.image || '',
          category: 'Uncategorized',
          pricing: { model: pricing.model },
          free_plan: pricing.hasFree,
          features: [],
          source_url: `https://${sourceDomain}`,
          ai_relevance_score: getAIRelevanceScore(`${name} ${description}`),
        });
      }
    }
  }
}

module.exports = DirectoryCrawler;
