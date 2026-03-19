// =========================================
// Tool Submission Model (user-submitted tools)
// =========================================
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  website: { type: String, required: true, trim: true },
  description: { type: String, required: true, maxlength: 1000 },
  category: { type: String, default: 'Uncategorized' },
  submitter_email: { type: String, trim: true },
  submitter_name: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  review_notes: String,
  reviewed_by: String,
  reviewed_at: Date,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

module.exports = mongoose.model('Submission', submissionSchema);
