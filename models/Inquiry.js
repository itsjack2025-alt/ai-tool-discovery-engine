// =========================================
// Business Inquiry Model
// =========================================
const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, trim: true, maxlength: 200, default: 'General Inquiry' },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['new', 'read', 'replied', 'archived'], default: 'new', index: true },
  admin_notes: String,
  reply_message: { type: String, trim: true, maxlength: 5000, default: '' },
  replied_by: String,
  replied_at: Date,
  ip_address: String,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

module.exports = mongoose.model('Inquiry', inquirySchema);
