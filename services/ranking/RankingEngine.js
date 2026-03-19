// =========================================
// Ranking Engine
// Calculates final tool rankings and selects top trending
// =========================================
const AiTool = require('../../models/AiTool');
const logger = require('../../utils/logger');

class RankingEngine {
  constructor() {
    this.decayFactor = parseFloat(process.env.TREND_DECAY_FACTOR || '0.95');
    this.topCount = parseInt(process.env.TOP_TRENDING_COUNT || '50');
  }

  /**
   * Update rankings for all tools in database
   */
  async updateAllRankings() {
    logger.info('[RankingEngine] Updating all tool rankings...');
    const startTime = Date.now();

    try {
      const tools = await AiTool.find({ is_active: true })
        .select('name trend_score trend_history github_stars producthunt_votes hackernews_points social_signals')
        .lean();

      logger.info(`[RankingEngine] Processing ${tools.length} tools...`);

      // Apply time decay to existing scores
      let updated = 0;
      for (const tool of tools) {
        const decayedScore = tool.trend_score * this.decayFactor;

        await AiTool.updateOne(
          { _id: tool._id },
          {
            $set: {
              trend_score: Math.round(decayedScore * 100) / 100,
              updated_at: new Date(),
            },
          }
        );
        updated++;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(`[RankingEngine] ✅ Updated ${updated} rankings (${duration}s)`);

      return { updated, duration: `${duration}s` };
    } catch (error) {
      logger.error('[RankingEngine] Ranking update failed:', error);
      throw error;
    }
  }

  /**
   * Apply new trend scores from analysis
   */
  async applyTrendScores(analyzedTools) {
    logger.info(`[RankingEngine] Applying trend scores for ${analyzedTools.length} tools...`);
    let updated = 0;
    let created = 0;

    for (const tool of analyzedTools) {
      try {
        const existing = await AiTool.findOne({
          $or: [
            { slug: tool.slug },
            { name: { $regex: new RegExp(`^${this.escapeRegex(tool.name)}$`, 'i') } },
          ],
        });

        if (existing) {
          // Update existing tool
          existing.trend_score = tool.trend_score || existing.trend_score;
          existing.github_stars = Math.max(existing.github_stars, tool.github_stars || 0);
          existing.github_forks = Math.max(existing.github_forks, tool.github_forks || 0);
          existing.github_star_growth = tool.github_star_growth || existing.github_star_growth;
          existing.producthunt_votes = Math.max(existing.producthunt_votes, tool.producthunt_votes || 0);
          existing.hackernews_points = Math.max(existing.hackernews_points, tool.hackernews_points || 0);
          existing.hackernews_mentions = Math.max(existing.hackernews_mentions, tool.hackernews_mentions || 0);
          existing.feature_innovation_score = tool.feature_innovation_score || existing.feature_innovation_score;
          existing.last_crawled = new Date();
          existing.crawl_count += 1;

          // Update description if new one is better
          if (tool.description && tool.description.length > (existing.description?.length || 0)) {
            existing.description = tool.description;
          }

          // Update features if new ones found
          if (tool.features?.length > (existing.features?.length || 0)) {
            existing.features = tool.features;
          }

          // Update category if not manually set
          if (existing.category === 'Uncategorized' && tool.category !== 'Uncategorized') {
            existing.category = tool.category;
            existing.sub_category = tool.sub_category;
          }

          existing.updateTrendScore(tool.trend_score || 0);
          await existing.save();
          updated++;
        } else {
          // Create new tool
          const newTool = new AiTool({
            ...tool,
            is_active: true,
            needs_review: true,
          });
          newTool.updateTrendScore(tool.trend_score || 0);
          await newTool.save();
          created++;
        }
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key - try update instead
          try {
            await AiTool.updateOne(
              { slug: tool.slug },
              {
                $set: {
                  trend_score: tool.trend_score || 0,
                  last_crawled: new Date(),
                },
                $inc: { crawl_count: 1 },
              }
            );
            updated++;
          } catch {
            logger.warn(`[RankingEngine] Failed to upsert: ${tool.name}`);
          }
        } else {
          logger.warn(`[RankingEngine] Error processing ${tool.name}:`, error.message);
        }
      }
    }

    logger.info(`[RankingEngine] ✅ Applied scores: ${created} created, ${updated} updated`);
    return { created, updated };
  }

  /**
   * Get top trending tools
   */
  async getTopTrending(limit = null, category = null) {
    const count = limit || this.topCount;
    return AiTool.getTopTrending(count, category);
  }

  /**
   * Get trending tools by category
   */
  async getTrendingByCategory(limit = 10) {
    const categories = await AiTool.getCategoryStats();
    const result = {};

    for (const cat of categories) {
      result[cat._id] = await AiTool.getTopTrending(limit, cat._id);
    }

    return { categories, trending: result };
  }

  /**
   * Get dashboard data (for the trending dashboard)
   */
  async getDashboardData() {
    const [topTrending, categoryStats, recentTools, totalCount] = await Promise.all([
      this.getTopTrending(20),
      AiTool.getCategoryStats(),
      AiTool.getRecentlyDiscovered(10),
      AiTool.countDocuments({ is_active: true }),
    ]);

    // Get trend summary
    const risingTools = await AiTool.find({
      is_active: true,
      trend_direction: 'rising',
    })
      .sort({ trend_score: -1 })
      .limit(10)
      .select('name category trend_score trend_direction')
      .lean();

    return {
      top_trending: topTrending.map(tool => ({
        name: tool.name,
        logo: tool.logo,
        short_description: tool.short_description || tool.description?.substring(0, 200),
        features: (tool.features || []).slice(0, 5),
        free_plan: tool.free_plan,
        has_paid: tool.pricing?.model !== 'Free' && tool.pricing?.model !== 'Open Source',
        website: tool.website,
        category: tool.category,
        trend_score: tool.trend_score,
        trend_direction: tool.trend_direction,
        github_stars: tool.github_stars,
        producthunt_votes: tool.producthunt_votes,
      })),
      category_stats: categoryStats,
      recent_discoveries: recentTools,
      rising_tools: risingTools,
      total_tools: totalCount,
      last_updated: new Date(),
    };
  }

  /**
   * Escape special regex chars
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = RankingEngine;
