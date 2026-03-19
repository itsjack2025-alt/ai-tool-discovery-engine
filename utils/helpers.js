// =========================================
// Utility Helpers
// =========================================
const { AI_KEYWORDS } = require('../config/constants');

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await sleep(delay);
    }
  }
}

/**
 * Check if text contains AI-related keywords
 */
function isAIRelated(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  let matchCount = 0;
  for (const keyword of AI_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchCount++;
      if (matchCount >= 2) return true; // Require at least 2 keyword matches for stronger signal
    }
  }
  // Single match is still valid but with lower confidence
  return matchCount >= 1;
}

/**
 * Get AI relevance score (0-1)
 */
function getAIRelevanceScore(text) {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  let matchCount = 0;
  for (const keyword of AI_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }
  // Normalize: 5+ matches = score 1.0
  return Math.min(matchCount / 5, 1.0);
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Clean and truncate text
 */
function cleanText(text, maxLength = 500) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
    .trim()
    .substring(0, maxLength);
}

/**
 * Generate a URL-friendly slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

/**
 * Batch array into chunks
 */
function batchArray(arr, batchSize) {
  const batches = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Calculate time ago string
 */
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

/**
 * Parse pricing info from text
 */
function detectPricing(text) {
  if (!text) return { model: 'Unknown', hasFree: false };
  const lower = text.toLowerCase();

  if (lower.includes('open source') || lower.includes('open-source') || lower.includes('mit license') || lower.includes('apache')) {
    return { model: 'Open Source', hasFree: true };
  }
  if (lower.includes('free') && lower.includes('paid')) {
    return { model: 'Freemium', hasFree: true };
  }
  if (lower.includes('free trial')) {
    return { model: 'Free Trial', hasFree: true };
  }
  if (lower.includes('free')) {
    return { model: 'Free', hasFree: true };
  }
  if (lower.includes('enterprise') || lower.includes('contact')) {
    return { model: 'Enterprise', hasFree: false };
  }
  if (lower.includes('$') || lower.includes('pricing') || lower.includes('subscription')) {
    return { model: 'Paid', hasFree: false };
  }
  return { model: 'Unknown', hasFree: false };
}

module.exports = {
  sleep,
  retryWithBackoff,
  isAIRelated,
  getAIRelevanceScore,
  extractDomain,
  cleanText,
  slugify,
  batchArray,
  timeAgo,
  detectPricing,
};
