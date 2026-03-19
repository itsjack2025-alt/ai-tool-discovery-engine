// =========================================
// Trend Signal Analyzer
// Analyzes popularity signals and adoption metrics
// =========================================
const { TREND_WEIGHTS } = require('../../config/constants');
const logger = require('../../utils/logger');

class TrendAnalyzer {
  constructor() {
    this.weights = TREND_WEIGHTS;
    this.maxValues = {
      github_stars: 100000,
      github_growth: 1000,
      producthunt_votes: 5000,
      community_mentions: 500,
      search_interest: 100,
    };
  }

  /**
   * Analyze trend signals for a single tool
   */
  analyze(tool) {
    const signals = {
      githubGrowth: this.analyzeGitHubSignal(tool),
      productHuntVotes: this.analyzeProductHuntSignal(tool),
      communityMentions: this.analyzeCommunitySignal(tool),
      searchTrend: this.analyzeSearchTrend(tool),
      featureInnovation: this.analyzeFeatureInnovation(tool),
    };

    const trendScore = this.calculateTrendScore(signals);
    const velocity = this.calculateVelocity(tool);

    return {
      signals,
      trendScore,
      velocity,
      breakdown: {
        github_component: signals.githubGrowth * this.weights.GITHUB_GROWTH,
        producthunt_component: signals.productHuntVotes * this.weights.PRODUCTHUNT_VOTES,
        community_component: signals.communityMentions * this.weights.COMMUNITY_MENTIONS,
        search_component: signals.searchTrend * this.weights.SEARCH_TREND,
        innovation_component: signals.featureInnovation * this.weights.FEATURE_INNOVATION,
      },
    };
  }

  /**
   * Analyze a batch of tools
   */
  analyzeBatch(tools) {
    logger.info(`[TrendAnalyzer] Analyzing ${tools.length} tools...`);

    const results = tools.map(tool => {
      const analysis = this.analyze(tool);
      return {
        ...tool,
        trend_score: analysis.trendScore,
        trend_signals: analysis.signals,
        trend_breakdown: analysis.breakdown,
        trend_velocity: analysis.velocity,
        feature_innovation_score: analysis.signals.featureInnovation,
      };
    });

    // Sort by trend score
    results.sort((a, b) => b.trend_score - a.trend_score);

    logger.info(
      `[TrendAnalyzer] ✅ Analysis complete. Top score: ${results[0]?.trend_score?.toFixed(2) || 0}`
    );

    return results;
  }

  /**
   * Calculate the composite trend score
   * Formula: (GitHub Growth × 0.30) + (ProductHunt Votes × 0.25) + 
   *          (Community Mentions × 0.20) + (Search Trend Growth × 0.15) + 
   *          (Feature Innovation Score × 0.10)
   */
  calculateTrendScore(signals) {
    const score =
      (signals.githubGrowth * this.weights.GITHUB_GROWTH) +
      (signals.productHuntVotes * this.weights.PRODUCTHUNT_VOTES) +
      (signals.communityMentions * this.weights.COMMUNITY_MENTIONS) +
      (signals.searchTrend * this.weights.SEARCH_TREND) +
      (signals.featureInnovation * this.weights.FEATURE_INNOVATION);

    // Scale to 0-100
    return Math.round(score * 100 * 100) / 100;
  }

  /**
   * GitHub signal: star count + growth rate
   */
  analyzeGitHubSignal(tool) {
    const stars = tool.github_stars || 0;
    const growth = tool.github_star_growth || 0;
    const forks = tool.github_forks || 0;

    // Logarithmic scale for stars (diminishing returns for mega-popular repos)
    const starScore = stars > 0 ? Math.log10(stars) / Math.log10(this.maxValues.github_stars) : 0;

    // Linear growth bonus (daily new stars)
    const growthScore = Math.min(growth / this.maxValues.github_growth, 1);

    // Fork ratio as activity indicator
    const forkScore = stars > 0 ? Math.min(forks / stars, 0.5) : 0;

    // Combined: stars (40%) + growth (40%) + fork ratio (20%)
    return Math.min((starScore * 0.4) + (growthScore * 0.4) + (forkScore * 0.2), 1);
  }

  /**
   * Product Hunt signal: votes + ranking
   */
  analyzeProductHuntSignal(tool) {
    const votes = tool.producthunt_votes || 0;

    // Logarithmic scale for votes
    if (votes === 0) return 0;

    const voteScore = Math.log1p(votes) / Math.log1p(this.maxValues.producthunt_votes);
    const rankBonus = tool.producthunt_rank
      ? Math.max(0, 1 - (tool.producthunt_rank / 10)) * 0.3
      : 0;

    return Math.min(voteScore + rankBonus, 1);
  }

  /**
   * Community signal: HN mentions + social engagement
   */
  analyzeCommunitySignal(tool) {
    const hnPoints = tool.hackernews_points || 0;
    const hnMentions = tool.hackernews_mentions || 0;
    const socialEngagement = tool.social_signals?.total_engagement || 0;
    const twitterMentions = tool.social_signals?.twitter_mentions || 0;
    const redditMentions = tool.social_signals?.reddit_mentions || 0;

    const hnScore = hnPoints > 0 ? Math.log1p(hnPoints) / Math.log1p(1000) : 0;
    const mentionScore = Math.min(hnMentions / 50, 1);
    const socialScore = socialEngagement > 0
      ? Math.log1p(socialEngagement) / Math.log1p(10000)
      : 0;
    const twitterScore = Math.min(twitterMentions / this.maxValues.community_mentions, 1);
    const redditScore = Math.min(redditMentions / this.maxValues.community_mentions, 1);

    return Math.min(
      (hnScore * 0.3) + (mentionScore * 0.15) + (socialScore * 0.25) +
      (twitterScore * 0.15) + (redditScore * 0.15),
      1
    );
  }

  /**
   * Search trend signal: estimated search interest
   */
  analyzeSearchTrend(tool) {
    // Use search_interest if available, otherwise estimate from other signals
    if (tool.search_interest) {
      return Math.min(tool.search_interest / 100, 1);
    }

    // Estimate from name popularity and recency
    const recencyBonus = this.getRecencyBonus(tool);
    const nameLength = tool.name?.length || 0;
    const uniqueNameBonus = nameLength < 15 ? 0.1 : 0; // Short names are more searchable

    // AI relevance as a proxy
    const relevanceScore = (tool.ai_relevance_score || 0) * 0.3;

    return Math.min(recencyBonus + uniqueNameBonus + relevanceScore, 1);
  }

  /**
   * Feature innovation score
   */
  analyzeFeatureInnovation(tool) {
    let score = 0;
    const features = tool.features || [];
    const description = (tool.description || '').toLowerCase();

    // More features = higher innovation signal
    score += Math.min(features.length / 10, 0.3);

    // Innovation keywords
    const innovationKeywords = [
      'first', 'novel', 'unique', 'breakthrough', 'revolutionary',
      'state-of-the-art', 'cutting-edge', 'next-gen', 'patent',
      'multimodal', 'real-time', 'zero-shot', 'few-shot',
      'open source', 'API', 'plugin', 'integration',
    ];

    let keywordMatches = 0;
    for (const keyword of innovationKeywords) {
      if (description.includes(keyword)) keywordMatches++;
    }
    score += Math.min(keywordMatches / 5, 0.4);

    // Recency bonus (newer = more innovative)
    score += this.getRecencyBonus(tool) * 0.3;

    return Math.min(score, 1);
  }

  /**
   * Calculate velocity (rate of trend score change)
   */
  calculateVelocity(tool) {
    const history = tool.trend_history || [];
    if (history.length < 2) return 0;

    const recent = history.slice(-7); // Last 7 data points
    if (recent.length < 2) return 0;

    const firstScore = recent[0].score;
    const lastScore = recent[recent.length - 1].score;

    if (firstScore === 0) return lastScore > 0 ? 1 : 0;
    return (lastScore - firstScore) / firstScore;
  }

  /**
   * Calculate recency bonus (0-1)
   */
  getRecencyBonus(tool) {
    const releaseDate = tool.release_date || tool.created_at;
    if (!releaseDate) return 0.3; // Default for unknown dates

    const daysSinceRelease = (Date.now() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceRelease < 7) return 1.0;
    if (daysSinceRelease < 30) return 0.8;
    if (daysSinceRelease < 90) return 0.6;
    if (daysSinceRelease < 180) return 0.4;
    if (daysSinceRelease < 365) return 0.2;
    return 0.1;
  }
}

module.exports = TrendAnalyzer;
