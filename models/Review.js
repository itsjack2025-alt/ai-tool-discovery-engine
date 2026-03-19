// =========================================
// Review / Feedback Model
// =========================================
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  tool_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AiTool', index: true },
  tool_slug: { type: String, index: true },
  tool_name: { type: String },
  reviewer_name: { type: String, required: true, trim: true, maxlength: 100 },
  reviewer_email: { type: String, trim: true, lowercase: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  pros: [{ type: String, maxlength: 200 }],
  cons: [{ type: String, maxlength: 200 }],
  use_case: { type: String, trim: true, maxlength: 200 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'flagged'], default: 'pending', index: true },
  helpful_count: { type: Number, default: 0 },
  reported: { type: Boolean, default: false },
  admin_notes: String,
  reviewed_by: String,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

reviewSchema.statics.getToolReviews = async function(toolSlug, limit = 20) {
  return this.find({ tool_slug: toolSlug, status: 'approved' }).sort({ created_at: -1 }).limit(limit).lean();
};

reviewSchema.statics.getToolRating = async function(toolSlug) {
  const result = await this.aggregate([
    { $match: { tool_slug: toolSlug, status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return result[0] || { avg: 0, count: 0 };
};

module.exports = mongoose.model('Review', reviewSchema);
