// =========================================
// Platform Settings Model
// Stores ad configs, site settings, features
// =========================================
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed, default: '' },
  category: {
    type: String,
    enum: ['ads', 'general', 'seo', 'features', 'deployment', 'analytics', 'notifications', 'maintenance'],
    default: 'general',
  },
  description: String,
  updated_by: String,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Get a setting by key
settingsSchema.statics.get = async function (key, defaultValue = null) {
  const doc = await this.findOne({ key }).lean();
  return doc ? doc.value : defaultValue;
};

// Set a setting
settingsSchema.statics.set = async function (key, value, category = 'general', description = '') {
  return this.findOneAndUpdate(
    { key },
    { value, category, description, updated_at: new Date() },
    { upsert: true, new: true }
  );
};

// Get all settings by category
settingsSchema.statics.getByCategory = async function (category) {
  return this.find({ category }).lean();
};

// Get all settings as key-value object
settingsSchema.statics.getAll = async function () {
  const settings = await this.find().lean();
  const obj = {};
  settings.forEach(s => { obj[s.key] = s.value; });
  return obj;
};

// Seed default settings
settingsSchema.statics.seedDefaults = async function () {
  const defaults = [
    // Ad Settings
    { key: 'ads_enabled', value: false, category: 'ads', description: 'Master toggle for all advertisements' },
    { key: 'ads_provider', value: 'adsense', category: 'ads', description: 'Ad provider (adsense, carbon, ethicalads)' },
    { key: 'adsense_client_id', value: '', category: 'ads', description: 'Google AdSense publisher ID (ca-pub-XXXXX)' },
    { key: 'adsense_slot_header', value: '', category: 'ads', description: 'AdSense slot ID for header banner' },
    { key: 'adsense_slot_sidebar', value: '', category: 'ads', description: 'AdSense slot ID for sidebar' },
    { key: 'adsense_slot_inline', value: '', category: 'ads', description: 'AdSense slot ID for inline (between cards)' },
    { key: 'ads_frequency', value: 5, category: 'ads', description: 'Show ad every N tool cards' },
    { key: 'ads_max_per_page', value: 3, category: 'ads', description: 'Maximum ads per page' },
    { key: 'ads_custom_code_header', value: '', category: 'ads', description: 'Custom ad code for header placement' },
    { key: 'ads_custom_code_footer', value: '', category: 'ads', description: 'Custom ad code for footer placement' },

    // General Settings
    { key: 'site_name', value: 'AI Tool Discovery Engine', category: 'general', description: 'Website name' },
    { key: 'site_tagline', value: 'Discover the Top AI Tools Trending Worldwide', category: 'general', description: 'Website tagline' },
    { key: 'site_url', value: '', category: 'general', description: 'Live website URL' },
    { key: 'contact_email', value: '', category: 'general', description: 'Contact email address' },
    { key: 'tools_per_page', value: 20, category: 'general', description: 'Number of tools per page' },
    { key: 'enable_submissions', value: true, category: 'general', description: 'Allow public tool submissions' },
    { key: 'enable_newsletter', value: true, category: 'general', description: 'Enable newsletter signup' },
    { key: 'maintenance_mode', value: false, category: 'general', description: 'Put site in maintenance mode' },

    // SEO Settings
    { key: 'seo_title_template', value: '{name} - AI Tool Discovery Engine', category: 'seo', description: 'SEO title template' },
    { key: 'seo_description', value: 'Discover, compare, and track the best AI tools trending worldwide. Updated daily.', category: 'seo', description: 'Default meta description' },
    { key: 'google_analytics_id', value: '', category: 'seo', description: 'Google Analytics Measurement ID (G-XXXXX)' },
    { key: 'google_site_verification', value: '', category: 'seo', description: 'Google Search Console verification meta tag' },

    // Feature Toggles
    { key: 'feature_bookmarks', value: true, category: 'features', description: 'Enable tool bookmarking' },
    { key: 'feature_compare', value: true, category: 'features', description: 'Enable tool comparison' },
    { key: 'feature_reviews', value: false, category: 'features', description: 'Enable user reviews' },
    { key: 'feature_submit_tool', value: true, category: 'features', description: 'Enable tool submission form' },
    { key: 'feature_dark_mode', value: true, category: 'features', description: 'Enable dark mode (default on)' },
    { key: 'feature_api_public', value: true, category: 'features', description: 'Allow public API access' },

    // Deployment
    { key: 'deploy_platform', value: '', category: 'deployment', description: 'Hosting platform (render, railway, vercel, vps)' },
    { key: 'deploy_domain', value: '', category: 'deployment', description: 'Custom domain name' },
    { key: 'deploy_ssl', value: true, category: 'deployment', description: 'SSL enabled' },
    { key: 'deploy_cdn', value: false, category: 'deployment', description: 'CDN enabled' },
    { key: 'deploy_last_deployed', value: '', category: 'deployment', description: 'Last deployment timestamp' },

    // Analytics
    { key: 'analytics_total_visitors', value: 0, category: 'analytics', description: 'Total visitor count' },
    { key: 'analytics_total_searches', value: 0, category: 'analytics', description: 'Total search count' },

    // Notifications
    { key: 'notification_email', value: '', category: 'notifications', description: 'Email to receive inquiry notifications' },
    { key: 'notify_on_inquiry', value: true, category: 'notifications', description: 'Send email on new inquiry' },
    { key: 'notify_on_review', value: true, category: 'notifications', description: 'Send email on new review' },

    // Maintenance
    { key: 'maintenance_auto_run', value: true, category: 'maintenance', description: 'Enable daily auto maintenance' },
    { key: 'maintenance_cron', value: '0 3 * * *', category: 'maintenance', description: 'Maintenance cron schedule' },

    // Additional Features
    { key: 'feature_reviews', value: true, category: 'features', description: 'Enable user reviews' },
    { key: 'feature_inquiries', value: true, category: 'features', description: 'Enable business inquiries' },
    { key: 'feature_share', value: true, category: 'features', description: 'Enable social sharing' },
  ];

  for (const setting of defaults) {
    const exists = await this.findOne({ key: setting.key });
    if (!exists) {
      await this.create(setting);
    }
  }
};

module.exports = mongoose.model('Setting', settingsSchema);
