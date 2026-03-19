// =========================================
// Subscriber / Share Model (referrals for daily updates)
// =========================================
const mongoose = require('mongoose');
const crypto = require('crypto');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, trim: true, default: '' },
  referral_code: { type: String, unique: true, index: true },
  referred_by: { type: String, default: '' },
  referral_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  preferences: {
    daily_digest: { type: Boolean, default: true },
    trending_alerts: { type: Boolean, default: true },
    new_tools: { type: Boolean, default: true },
    categories: [String],
  },
  share_count: { type: Number, default: 0 },
  last_email_sent: Date,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Generate unique referral code pre-save
subscriberSchema.pre('save', function(next) {
  if (!this.referral_code) {
    this.referral_code = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Subscriber', subscriberSchema);
