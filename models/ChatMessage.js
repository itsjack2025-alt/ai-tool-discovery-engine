// =========================================
// Chat Message Model (Jack AI interactions)
// =========================================
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  session_id: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  metadata: {
    tools_mentioned: [String],
    intent: String,
    confidence: Number,
  },
}, {
  timestamps: { createdAt: 'created_at' },
});

// Keep only last 100 messages per session
chatMessageSchema.statics.getHistory = async function(sessionId, limit = 20) {
  return this.find({ session_id: sessionId }).sort({ created_at: -1 }).limit(limit).lean();
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
