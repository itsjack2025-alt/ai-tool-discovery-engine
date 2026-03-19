// =========================================
// Hacker News Crawler
// =========================================
const BaseCrawler = require('./BaseCrawler');
const { isAIRelated, getAIRelevanceScore, cleanText, detectPricing } = require('../../utils/helpers');
const logger = require('../../utils/logger');

class HackerNewsCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('hackernews', options);
    this.apiBase = 'https://hacker-news.firebaseio.com/v0';
  }

  async crawl() {
    logger.info('[HackerNews] Starting AI tool discovery...');

    // Strategy 1: Search HN Algolia for AI tools
    await this.searchAlgolia();

    // Strategy 2: Scan top/new stories
    await this.scanTopStories();

    // Strategy 3: Scan Show HN posts
    await this.scanShowHN();
  }

  async searchAlgolia() {
    const queries = [
      'AI tool', 'Show HN AI', 'Launch AI', 'AI startup',
      'LLM tool', 'generative AI', 'AI assistant', 'AI open source',
      'machine learning tool', 'AI coding', 'AI writing',
    ];

    for (const query of queries) {
      try {
        const data = await this.fetch(
          `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=30&numericFilters=points>10`
        );

        if (data?.hits) {
          for (const hit of data.hits) {
            this.processAlgoliaHit(hit);
          }
        }
      } catch (error) {
        this.addError(`Algolia search failed: ${query}`, { error: error.message });
      }
    }
  }

  async scanTopStories() {
    try {
      const storyIds = await this.fetch(`${this.apiBase}/topstories.json`);
      const topIds = (storyIds || []).slice(0, 100);

      for (const id of topIds) {
        try {
          const story = await this.fetch(`${this.apiBase}/item/${id}.json`);
          if (story && story.type === 'story') {
            this.processStory(story);
          }
        } catch {
          // Skip individual story errors
        }
      }
    } catch (error) {
      this.addError('Top stories scan failed', { error: error.message });
    }
  }

  async scanShowHN() {
    try {
      const storyIds = await this.fetch(`${this.apiBase}/showstories.json`);
      const showIds = (storyIds || []).slice(0, 50);

      for (const id of showIds) {
        try {
          const story = await this.fetch(`${this.apiBase}/item/${id}.json`);
          if (story && story.type === 'story') {
            this.processStory(story, true);
          }
        } catch {
          // Skip individual story errors
        }
      }
    } catch (error) {
      this.addError('Show HN scan failed', { error: error.message });
    }
  }

  processAlgoliaHit(hit) {
    const title = hit.title || '';
    const text = `${title} ${hit.story_text || ''}`;

    if (!isAIRelated(text)) return;

    // Extract tool name from title
    const name = this.extractToolName(title);
    if (!name) return;

    this.addResult({
      name: cleanText(name, 100),
      description: cleanText(hit.story_text || title, 500),
      short_description: cleanText(title, 200),
      website: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      logo: '',
      category: 'Uncategorized',
      pricing: detectPricing(text),
      free_plan: detectPricing(text).hasFree,
      features: [],
      hackernews_points: hit.points || 0,
      hackernews_mentions: hit.num_comments || 0,
      source_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      release_date: hit.created_at ? new Date(hit.created_at) : null,
      ai_relevance_score: getAIRelevanceScore(text),
    });
  }

  processStory(story, isShowHN = false) {
    const title = story.title || '';
    const text = `${title} ${story.text || ''}`;

    if (!isAIRelated(text)) return;

    // Show HN posts are higher quality signals for new tools
    const name = this.extractToolName(title);
    if (!name) return;

    this.addResult({
      name: cleanText(name, 100),
      description: cleanText(story.text || title, 500),
      short_description: cleanText(title, 200),
      website: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      logo: '',
      category: 'Uncategorized',
      pricing: detectPricing(text),
      free_plan: detectPricing(text).hasFree,
      features: [],
      hackernews_points: story.score || 0,
      hackernews_mentions: story.descendants || 0,
      source_url: `https://news.ycombinator.com/item?id=${story.id}`,
      release_date: story.time ? new Date(story.time * 1000) : null,
      ai_relevance_score: getAIRelevanceScore(text) * (isShowHN ? 1.2 : 1.0),
    });
  }

  extractToolName(title) {
    if (!title) return null;

    // Remove common HN prefixes
    let name = title
      .replace(/^(Show HN|Ask HN|Tell HN|Launch HN):\s*/i, '')
      .replace(/\s*[-–—|]\s.*$/, '')  // Remove subtitle after dash
      .replace(/\s*\(.*?\)\s*$/, '')  // Remove parenthetical
      .trim();

    // If name is too long or too short, skip
    if (name.length < 2 || name.length > 80) return null;

    // If it's just a URL, extract domain
    if (name.startsWith('http')) {
      try {
        const url = new URL(name);
        name = url.hostname.replace(/^www\./, '').split('.')[0];
      } catch {
        return null;
      }
    }

    return name;
  }
}

module.exports = HackerNewsCrawler;
