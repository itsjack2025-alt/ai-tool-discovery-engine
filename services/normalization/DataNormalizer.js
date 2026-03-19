// =========================================
// Data Normalization Service
// Standardizes raw crawl data into unified schema
// =========================================
const { cleanText, slugify, detectPricing, extractDomain } = require('../../utils/helpers');
const logger = require('../../utils/logger');

class DataNormalizer {
  constructor() {
    this.normalized = 0;
    this.skipped = 0;
  }

  /**
   * Normalize a batch of raw tool data
   */
  normalizeBatch(rawTools) {
    logger.info(`[Normalizer] Processing batch of ${rawTools.length} tools...`);
    this.normalized = 0;
    this.skipped = 0;

    const results = [];

    for (const raw of rawTools) {
      try {
        const normalized = this.normalize(raw);
        if (normalized) {
          results.push(normalized);
          this.normalized++;
        } else {
          this.skipped++;
        }
      } catch (error) {
        logger.warn(`[Normalizer] Failed to normalize: ${raw.name}`, { error: error.message });
        this.skipped++;
      }
    }

    logger.info(`[Normalizer] Batch complete: ${this.normalized} normalized, ${this.skipped} skipped`);
    return results;
  }

  /**
   * Normalize a single tool record
   */
  normalize(raw) {
    // Validate required fields
    if (!raw.name || raw.name.length < 2) return null;

    const name = this.normalizeName(raw.name);
    const slug = slugify(name);

    if (!slug) return null;

    // Normalize description
    const description = this.normalizeDescription(raw.description, name);
    if (!description) return null;

    // Normalize website URL
    const website = this.normalizeUrl(raw.website);

    // Normalize pricing
    const pricing = this.normalizePricing(raw);

    // Normalize features
    const features = this.normalizeFeatures(raw.features);

    // Normalize tags
    const tags = this.normalizeTags(raw.tags, name, description);

    return {
      name,
      slug,
      description,
      short_description: raw.short_description
        ? cleanText(raw.short_description, 200)
        : description.substring(0, 200),
      website,
      logo: this.normalizeImageUrl(raw.logo),
      category: raw.category || 'Uncategorized',
      sub_category: raw.sub_category || null,
      tags,
      pricing: {
        model: pricing.model,
        starting_price: raw.starting_price || null,
        currency: 'USD',
      },
      free_plan: pricing.hasFree,
      features,

      // Popularity signals
      github_stars: this.normalizeNumber(raw.github_stars),
      github_forks: this.normalizeNumber(raw.github_forks),
      github_url: this.normalizeUrl(raw.github_url),
      github_star_growth: this.normalizeNumber(raw.github_star_growth),

      producthunt_votes: this.normalizeNumber(raw.producthunt_votes),
      producthunt_url: this.normalizeUrl(raw.producthunt_url),

      hackernews_points: this.normalizeNumber(raw.hackernews_points),
      hackernews_mentions: this.normalizeNumber(raw.hackernews_mentions),

      social_signals: {
        twitter_mentions: this.normalizeNumber(raw.social_signals?.twitter_mentions),
        reddit_mentions: this.normalizeNumber(raw.social_signals?.reddit_mentions),
        total_engagement: this.normalizeNumber(raw.social_signals?.total_engagement),
      },

      // Metadata
      source: raw.source || 'manual',
      source_url: raw.source_url || '',
      release_date: this.normalizeDate(raw.release_date),
      ai_relevance_score: Math.min(Math.max(raw.ai_relevance_score || 0, 0), 1),
      last_crawled: new Date(),
    };
  }

  /**
   * Clean and standardize tool name
   */
  normalizeName(name) {
    return name
      .replace(/^(Show HN|Launch|New):\s*/i, '')
      .replace(/\s*[-–—|:]\s.*$/, '')  // Remove subtitles
      .replace(/[™®©]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * Ensure description is useful
   */
  normalizeDescription(description, name) {
    if (!description || description.length < 10) {
      return `${name} - An AI-powered tool`;
    }

    return cleanText(description, 1000)
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate and normalize URLs
   */
  normalizeUrl(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return '';
      return parsed.toString();
    } catch {
      // Try adding protocol
      try {
        const parsed = new URL(`https://${url}`);
        return parsed.toString();
      } catch {
        return '';
      }
    }
  }

  /**
   * Normalize image URLs
   */
  normalizeImageUrl(url) {
    if (!url) return '';
    const normalized = this.normalizeUrl(url);
    if (!normalized) return '';

    // Validate it looks like an image URL or avatar URL
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
    const isImageUrl = imageExtensions.some(ext => normalized.toLowerCase().includes(ext));
    const isAvatarUrl = normalized.includes('avatar') || normalized.includes('logo') || normalized.includes('image');

    return (isImageUrl || isAvatarUrl) ? normalized : normalized;
  }

  /**
   * Normalize pricing information
   */
  normalizePricing(raw) {
    if (raw.pricing?.model && raw.pricing.model !== 'Unknown') {
      return {
        model: raw.pricing.model,
        hasFree: raw.free_plan || ['Free', 'Open Source', 'Freemium', 'Free Trial'].includes(raw.pricing.model),
      };
    }

    // Try to detect from description
    const text = `${raw.description || ''} ${raw.name || ''}`;
    return detectPricing(text);
  }

  /**
   * Normalize features list
   */
  normalizeFeatures(features) {
    if (!Array.isArray(features)) return [];

    return features
      .filter(f => typeof f === 'string' && f.trim().length > 3)
      .map(f => cleanText(f, 150))
      .filter(f => f.length > 3)
      .slice(0, 15);
  }

  /**
   * Generate normalized tags
   */
  normalizeTags(rawTags, name, description) {
    const tags = new Set();

    // Add existing tags
    if (Array.isArray(rawTags)) {
      rawTags.forEach(tag => {
        if (typeof tag === 'string' && tag.length > 1 && tag.length < 50) {
          tags.add(tag.toLowerCase().trim());
        }
      });
    }

    // Extract tags from description
    const text = `${name} ${description}`.toLowerCase();
    const tagPatterns = [
      'ai', 'machine learning', 'deep learning', 'nlp', 'llm', 'gpt',
      'open source', 'api', 'saas', 'free', 'no-code', 'low-code',
      'automation', 'chatbot', 'image generation', 'text generation',
      'code generation', 'video', 'audio', 'productivity', 'developer',
    ];

    for (const pattern of tagPatterns) {
      if (text.includes(pattern)) {
        tags.add(pattern);
      }
    }

    return Array.from(tags).slice(0, 20);
  }

  /**
   * Normalize numbers
   */
  normalizeNumber(value) {
    if (typeof value === 'number') return Math.max(0, Math.round(value));
    if (typeof value === 'string') {
      const parsed = parseInt(value.replace(/[,\s]/g, ''));
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    return 0;
  }

  /**
   * Normalize dates
   */
  normalizeDate(date) {
    if (!date) return null;
    if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}

module.exports = DataNormalizer;
