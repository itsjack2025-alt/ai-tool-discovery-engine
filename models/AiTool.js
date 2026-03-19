// =========================================
// AI Tool Model - MongoDB Schema
// =========================================
const mongoose = require('mongoose');

const trendHistorySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  score: { type: Number, required: true },
  github_stars: { type: Number, default: 0 },
  producthunt_votes: { type: Number, default: 0 },
  community_mentions: { type: Number, default: 0 },
}, { _id: false });

const aiToolSchema = new mongoose.Schema({
  // Core Identity
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  slug: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  short_description: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  website: {
    type: String,
    trim: true,
  },
  logo: {
    type: String,
    trim: true,
  },

  // Classification
  category: {
    type: String,
    required: true,
    index: true,
  },
  sub_category: {
    type: String,
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],

  // Pricing
  pricing: {
    model: {
      type: String,
      enum: ['Free', 'Freemium', 'Free Trial', 'Paid', 'Open Source', 'Enterprise', 'Contact for Pricing', 'Usage-Based', 'Unknown'],
      default: 'Unknown',
    },
    starting_price: String,
    currency: { type: String, default: 'USD' },
  },
  free_plan: {
    type: Boolean,
    default: false,
  },

  // Features
  features: [{
    type: String,
    trim: true,
  }],

  // Popularity Signals
  github_stars: {
    type: Number,
    default: 0,
    index: true,
  },
  github_forks: {
    type: Number,
    default: 0,
  },
  github_url: String,
  github_star_growth: {
    type: Number,
    default: 0,
  },

  producthunt_votes: {
    type: Number,
    default: 0,
    index: true,
  },
  producthunt_url: String,
  producthunt_rank: Number,

  hackernews_points: {
    type: Number,
    default: 0,
  },
  hackernews_mentions: {
    type: Number,
    default: 0,
  },

  social_signals: {
    twitter_mentions: { type: Number, default: 0 },
    reddit_mentions: { type: Number, default: 0 },
    total_engagement: { type: Number, default: 0 },
  },

  search_interest: {
    type: Number,
    default: 0,
  },

  // Trend Score
  trend_score: {
    type: Number,
    default: 0,
    index: true,
  },
  trend_direction: {
    type: String,
    enum: ['rising', 'stable', 'declining', 'new'],
    default: 'new',
  },
  trend_history: [trendHistorySchema],

  // Feature Innovation Scoring
  feature_innovation_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },

  // Metadata
  source: {
    type: String,
    required: true,
    enum: ['github', 'producthunt', 'hackernews', 'directory', 'blog', 'community', 'manual'],
    index: true,
  },
  source_url: String,
  release_date: Date,
  last_crawled: Date,
  crawl_count: {
    type: Number,
    default: 1,
  },
  ai_relevance_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },

  // Status
  is_active: {
    type: Boolean,
    default: true,
    index: true,
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  needs_review: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for common queries
aiToolSchema.index({ trend_score: -1, is_active: 1 });
aiToolSchema.index({ category: 1, trend_score: -1 });
aiToolSchema.index({ created_at: -1 });
aiToolSchema.index({ source: 1, source_url: 1 });
aiToolSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual for display pricing
aiToolSchema.virtual('pricing_display').get(function () {
  if (this.free_plan) return '✅ Free plan available';
  if (this.pricing?.model === 'Open Source') return '🆓 Open Source';
  if (this.pricing?.starting_price) return `💰 From ${this.pricing.starting_price}`;
  return this.pricing?.model || 'Unknown';
});

// Static: Get top trending tools
aiToolSchema.statics.getTopTrending = function (limit = 50, category = null) {
  const query = { is_active: true, trend_score: { $gt: 0 } };
  if (category) query.category = category;
  return this.find(query)
    .sort({ trend_score: -1 })
    .limit(limit)
    .select('-trend_history -__v')
    .lean();
};

// Static: Get recently discovered tools
aiToolSchema.statics.getRecentlyDiscovered = function (limit = 20) {
  return this.find({ is_active: true })
    .sort({ created_at: -1 })
    .limit(limit)
    .select('-trend_history -__v')
    .lean();
};

// Static: Get category breakdown
aiToolSchema.statics.getCategoryStats = function () {
  return this.aggregate([
    { $match: { is_active: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avg_trend_score: { $avg: '$trend_score' },
        top_tool: { $first: '$name' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static: Search tools
aiToolSchema.statics.searchTools = function (query, limit = 20) {
  return this.find(
    { $text: { $search: query }, is_active: true },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
};

// Instance: Update trend score
aiToolSchema.methods.updateTrendScore = function (score) {
  const previousScore = this.trend_score;
  this.trend_score = Math.round(score * 100) / 100;

  // Calculate trend direction
  if (previousScore === 0 && score > 0) {
    this.trend_direction = 'new';
  } else if (score > previousScore * 1.05) {
    this.trend_direction = 'rising';
  } else if (score < previousScore * 0.95) {
    this.trend_direction = 'declining';
  } else {
    this.trend_direction = 'stable';
  }

  // Add to history (keep last 90 entries)
  this.trend_history.push({
    date: new Date(),
    score: this.trend_score,
    github_stars: this.github_stars,
    producthunt_votes: this.producthunt_votes,
    community_mentions: this.social_signals?.total_engagement || 0,
  });

  if (this.trend_history.length > 90) {
    this.trend_history = this.trend_history.slice(-90);
  }
};

const AiTool = mongoose.model('AiTool', aiToolSchema);

module.exports = AiTool;
