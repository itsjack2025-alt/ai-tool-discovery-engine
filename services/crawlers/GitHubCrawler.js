// =========================================
// GitHub Trending Crawler
// =========================================
const BaseCrawler = require('./BaseCrawler');
const cheerio = require('cheerio');
const { isAIRelated, getAIRelevanceScore, detectPricing, cleanText } = require('../../utils/helpers');
const logger = require('../../utils/logger');

class GitHubCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('github', options);
    this.apiBase = 'https://api.github.com';
    this.token = process.env.GITHUB_TOKEN;
    if (this.token) {
      this.httpClient.defaults.headers['Authorization'] = `Bearer ${this.token}`;
    }
  }

  async crawl() {
    logger.info('[GitHub] Starting AI tool discovery from GitHub...');

    // Strategy 1: Search for AI-related repositories
    await this.searchAIRepositories();

    // Strategy 2: Crawl GitHub trending page
    await this.crawlTrendingPage();

    // Strategy 3: Search specific AI tool topics
    await this.searchByTopics();
  }

  async searchAIRepositories() {
    const queries = [
      'AI tool',
      'machine learning tool',
      'LLM framework',
      'generative AI',
      'AI assistant',
      'AI automation',
      'text-to-image',
      'AI coding assistant',
      'AI writing tool',
      'AI chatbot framework',
      'stable diffusion',
      'RAG framework',
      'vector database',
      'AI agent framework',
    ];

    for (const query of queries) {
      try {
        // GitHub search API: sort by stars, recently updated
        const data = await this.fetch(
          `${this.apiBase}/search/repositories?q=${encodeURIComponent(query)}+language:python+language:javascript+language:typescript&sort=stars&order=desc&per_page=30`
        );

        if (data?.items) {
          for (const repo of data.items) {
            await this.processRepo(repo);
          }
        }
      } catch (error) {
        this.addError(`Search failed for query: ${query}`, { error: error.message });
      }
    }
  }

  async crawlTrendingPage() {
    try {
      const languages = ['python', 'javascript', 'typescript', ''];
      for (const lang of languages) {
        const url = lang
          ? `https://github.com/trending/${lang}?since=weekly`
          : 'https://github.com/trending?since=weekly';

        const html = await this.fetch(url, {
          headers: { 'Accept': 'text/html' },
        });

        const $ = cheerio.load(html);
        const articles = $('article.Box-row');

        articles.each((_, el) => {
          try {
            const repoLink = $(el).find('h2 a').attr('href');
            const description = $(el).find('p').text().trim();
            const starsText = $(el).find('[href$="/stargazers"]').text().trim();
            const stars = parseInt(starsText.replace(/,/g, '')) || 0;

            if (repoLink && isAIRelated(description)) {
              const [owner, name] = repoLink.replace(/^\//, '').split('/');
              const todayStarsMatch = $(el).text().match(/([\d,]+)\s*stars?\s*today/i);
              const todayStars = todayStarsMatch
                ? parseInt(todayStarsMatch[1].replace(/,/g, ''))
                : 0;

              this.addResult({
                name: name,
                description: cleanText(description),
                website: `https://github.com${repoLink}`,
                github_url: `https://github.com${repoLink}`,
                github_stars: stars,
                github_star_growth: todayStars,
                category: 'Uncategorized',
                pricing: { model: 'Open Source' },
                free_plan: true,
                features: [],
                source_url: `https://github.com${repoLink}`,
              });
            }
          } catch (e) {
            // Skip individual element errors
          }
        });
      }
    } catch (error) {
      this.addError('Trending page crawl failed', { error: error.message });
    }
  }

  async searchByTopics() {
    const topics = [
      'ai', 'machine-learning', 'deep-learning', 'llm',
      'generative-ai', 'chatgpt', 'stable-diffusion', 'langchain',
      'ai-tools', 'nlp', 'computer-vision', 'transformers',
    ];

    for (const topic of topics) {
      try {
        const data = await this.fetch(
          `${this.apiBase}/search/repositories?q=topic:${topic}&sort=stars&order=desc&per_page=20`
        );

        if (data?.items) {
          for (const repo of data.items) {
            await this.processRepo(repo);
          }
        }
      } catch (error) {
        this.addError(`Topic search failed: ${topic}`, { error: error.message });
      }
    }
  }

  async processRepo(repo) {
    const combinedText = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`;

    if (!isAIRelated(combinedText)) return;
    if (repo.stargazers_count < 50) return; // Minimum stars threshold

    // Try to get more details from README
    let readmeFeatures = [];
    try {
      const readme = await this.fetch(
        `${this.apiBase}/repos/${repo.full_name}/readme`,
        { headers: { 'Accept': 'application/vnd.github.v3.raw' } }
      );
      if (typeof readme === 'string') {
        readmeFeatures = this.extractFeaturesFromReadme(readme);
      }
    } catch {
      // README not accessible, continue without features
    }

    const pricing = detectPricing(combinedText);

    this.addResult({
      name: repo.name,
      description: cleanText(repo.description || `${repo.name} - AI tool on GitHub`, 500),
      short_description: cleanText(repo.description || '', 200),
      website: repo.homepage || `https://github.com/${repo.full_name}`,
      logo: repo.owner?.avatar_url || '',
      github_url: repo.html_url,
      github_stars: repo.stargazers_count || 0,
      github_forks: repo.forks_count || 0,
      github_star_growth: 0,
      category: 'Uncategorized',
      tags: repo.topics || [],
      pricing: { model: pricing.model },
      free_plan: pricing.hasFree || repo.license != null,
      features: readmeFeatures.slice(0, 10),
      release_date: repo.created_at,
      source_url: repo.html_url,
      ai_relevance_score: getAIRelevanceScore(combinedText),
    });
  }

  extractFeaturesFromReadme(readme) {
    const features = [];
    const lines = readme.split('\n');

    let inFeatureSection = false;
    for (const line of lines) {
      const trimmed = line.trim();

      if (/^#+\s*(features|key features|highlights|what|capabilities)/i.test(trimmed)) {
        inFeatureSection = true;
        continue;
      }
      if (/^#+/.test(trimmed) && inFeatureSection) {
        inFeatureSection = false;
        continue;
      }
      if (inFeatureSection && /^[-*•]\s+/.test(trimmed)) {
        const feature = trimmed.replace(/^[-*•]\s+/, '').replace(/\*\*/g, '').trim();
        if (feature.length > 5 && feature.length < 200) {
          features.push(feature);
        }
      }
    }

    return features;
  }
}

module.exports = GitHubCrawler;
