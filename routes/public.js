// =========================================
// Public Routes (submissions, newsletter, chatbot,
// reviews, inquiries, sharing, subscriber management)
// =========================================
const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Setting = require('../models/Settings');
const Review = require('../models/Review');
const Inquiry = require('../models/Inquiry');
const Subscriber = require('../models/Subscriber');
const ChatMessage = require('../models/ChatMessage');
const JackAI = require('../services/chatbot/JackAI');
const logger = require('../utils/logger');

// Initialize Jack AI chatbot
const jackAI = new JackAI();

// ================================================
// JACK AI CHATBOT
// ================================================

// Chat with Jack
router.post('/chat', async (req, res) => {
  try {
    const { message, session_id } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save user message
    try {
      await ChatMessage.create({
        session_id: sessionId,
        role: 'user',
        content: message.trim(),
      });
    } catch (e) {
      // Non-blocking: continue even if save fails
    }

    // Process with Jack AI
    const response = await jackAI.processMessage(message.trim(), sessionId);

    // Save assistant response
    try {
      await ChatMessage.create({
        session_id: sessionId,
        role: 'assistant',
        content: response.content,
        metadata: response.metadata,
      });
    } catch (e) {
      // Non-blocking
    }

    res.json({
      success: true,
      data: {
        message: response.content,
        suggestions: response.suggestions,
        session_id: sessionId,
        metadata: response.metadata,
      },
    });
  } catch (error) {
    logger.error('[Chat] Error:', error);
    res.status(500).json({ success: false, error: 'Chat processing failed' });
  }
});

// Get chat history
router.get('/chat/history/:sessionId', async (req, res) => {
  try {
    const messages = await ChatMessage.getHistory(req.params.sessionId, 50);
    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

// ================================================
// REVIEWS & FEEDBACK
// ================================================

// Submit a review
router.post('/reviews', async (req, res) => {
  try {
    const { tool_slug, tool_name, reviewer_name, reviewer_email, rating, title, content, pros, cons, use_case } = req.body;

    if (!reviewer_name || !rating || !content) {
      return res.status(400).json({ success: false, error: 'Name, rating, and review content are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const review = await Review.create({
      tool_slug: tool_slug || 'general',
      tool_name: tool_name || 'Platform Feedback',
      reviewer_name: reviewer_name.trim(),
      reviewer_email: reviewer_email || '',
      rating: parseInt(rating),
      title: title || '',
      content: content.trim(),
      pros: pros || [],
      cons: cons || [],
      use_case: use_case || '',
      status: 'pending',
    });

    logger.info(`[Reviews] New review from ${reviewer_name}: ${rating}★`);
    res.json({
      success: true,
      message: 'Thank you for your review! It will be visible after moderation.',
      data: { id: review._id },
    });
  } catch (error) {
    logger.error('[Reviews] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit review' });
  }
});

// Get approved reviews (for display)
router.get('/reviews', async (req, res) => {
  try {
    const { tool_slug, limit = 20, page = 1 } = req.query;
    const query = { status: 'approved' };
    if (tool_slug) query.tool_slug = tool_slug;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      Review.find(query).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Review.countDocuments(query),
    ]);

    // Calculate aggregate stats
    const stats = await Review.aggregate([
      { $match: query },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: reviews,
      stats: {
        average_rating: stats[0]?.avgRating?.toFixed(1) || 0,
        total_reviews: stats[0]?.count || 0,
      },
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

// Mark review as helpful
router.post('/reviews/:id/helpful', async (req, res) => {
  try {
    await Review.findByIdAndUpdate(req.params.id, { $inc: { helpful_count: 1 } });
    res.json({ success: true, message: 'Thanks for your feedback!' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

// ================================================
// BUSINESS INQUIRIES
// ================================================

// Submit a business inquiry
router.post('/inquiries', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, and message are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address' });
    }

    const inquiry = await Inquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject || 'General Inquiry',
      message: message.trim(),
      ip_address: req.ip || req.connection?.remoteAddress || '',
    });

    logger.info(`[Inquiry] New inquiry from ${name} (${email}): ${subject || 'General'}`);

    // Send notification to admin email (simulated — logs it; integrate with real SMTP in production)
    const adminEmail = await Setting.get('contact_email', '');
    if (adminEmail) {
      logger.info(`[Inquiry] 📧 Notification would be sent to ${adminEmail}`);
      // In production: integrate with nodemailer or SendGrid here
    }

    res.json({
      success: true,
      message: 'Your inquiry has been received! Our team will respond as soon as possible. Thank you for reaching out.',
      data: { id: inquiry._id },
    });
  } catch (error) {
    logger.error('[Inquiry] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit inquiry' });
  }
});

// ================================================
// SHARE & SUBSCRIBE (Referral System)
// ================================================

// Subscribe for daily updates
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name, referral_code } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email required' });
    }

    // Check if already subscribed
    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.json({
        success: true,
        message: 'You\'re already subscribed! Share your referral code with friends.',
        data: { referral_code: existing.referral_code },
      });
    }

    // Create subscriber
    const subscriber = await Subscriber.create({
      email: email.trim().toLowerCase(),
      name: name || '',
      referred_by: referral_code || '',
    });

    // If referred, increment referrer's count
    if (referral_code) {
      await Subscriber.findOneAndUpdate(
        { referral_code: referral_code.toUpperCase() },
        { $inc: { referral_count: 1 } }
      );
    }

    logger.info(`[Subscribe] New subscriber: ${email}${referral_code ? ` (referred by ${referral_code})` : ''}`);

    res.json({
      success: true,
      message: 'Welcome aboard! 🎉 You\'ll receive daily updates on trending AI tools. Share your referral link to invite friends!',
      data: {
        referral_code: subscriber.referral_code,
        share_url: `${req.protocol}://${req.get('host')}?ref=${subscriber.referral_code}`,
      },
    });
  } catch (error) {
    logger.error('[Subscribe] Error:', error);
    res.status(500).json({ success: false, error: 'Subscription failed' });
  }
});

// Unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    await Subscriber.findOneAndUpdate(
      { email: email?.toLowerCase() },
      { $set: { is_active: false } }
    );
    res.json({ success: true, message: 'You have been unsubscribed. We\'re sorry to see you go!' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Unsubscribe failed' });
  }
});

// Generate share links (for social sharing)
router.get('/share-links', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const siteName = await Setting.get('site_name', 'AI Tool Discovery Engine');
  const tagline = await Setting.get('site_tagline', 'Discover Top Trending AI Tools');

  const text = encodeURIComponent(`Check out ${siteName} - ${tagline}! 🤖`);
  const url = encodeURIComponent(baseUrl);

  res.json({
    success: true,
    data: {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      reddit: `https://reddit.com/submit?title=${text}&url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      email: `mailto:?subject=${text}&body=Check%20it%20out%20here:%20${url}`,
      copy_url: baseUrl,
    },
  });
});

// ================================================
// EXISTING ROUTES (kept from v2)
// ================================================

// Submit a new AI tool (public endpoint)
router.post('/submit', async (req, res) => {
  try {
    const enabled = await Setting.get('enable_submissions', true);
    if (!enabled) {
      return res.status(403).json({ success: false, error: 'Submissions are currently closed' });
    }

    const { name, website, description, category, email, submitter_name } = req.body;
    if (!name || !website || !description) {
      return res.status(400).json({ success: false, error: 'Name, website, and description are required' });
    }

    const submission = await Submission.create({
      name, website, description,
      category: category || 'Uncategorized',
      submitter_email: email || '',
      submitter_name: submitter_name || 'Anonymous',
    });

    logger.info(`[Public] New tool submission: ${name}`);
    res.json({ success: true, message: 'Tool submitted for review. Thank you!', id: submission._id });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Submission failed' });
  }
});

// Get ad configuration (public — needed by frontend)
router.get('/ads/config', async (req, res) => {
  try {
    const enabled = await Setting.get('ads_enabled', false);
    if (!enabled) {
      return res.json({ success: true, data: { enabled: false } });
    }

    const [provider, clientId, headerSlot, sidebarSlot, inlineSlot,
      frequency, maxPerPage, headerCode, footerCode] = await Promise.all([
      Setting.get('ads_provider', 'adsense'),
      Setting.get('adsense_client_id', ''),
      Setting.get('adsense_slot_header', ''),
      Setting.get('adsense_slot_sidebar', ''),
      Setting.get('adsense_slot_inline', ''),
      Setting.get('ads_frequency', 5),
      Setting.get('ads_max_per_page', 3),
      Setting.get('ads_custom_code_header', ''),
      Setting.get('ads_custom_code_footer', ''),
    ]);

    res.json({
      success: true,
      data: {
        enabled: true,
        provider,
        adsense: {
          client_id: clientId,
          slots: { header: headerSlot, sidebar: sidebarSlot, inline: inlineSlot },
        },
        frequency,
        max_per_page: maxPerPage,
        custom_code: { header: headerCode, footer: footerCode },
      },
    });
  } catch (error) {
    res.json({ success: true, data: { enabled: false } });
  }
});

// Get site settings (public — needed by frontend)
router.get('/site-config', async (req, res) => {
  try {
    const [siteName, tagline, siteUrl, gaId, verification,
      bookmarks, compare, submitEnabled, darkMode, newsletter] = await Promise.all([
      Setting.get('site_name', 'AI Tool Discovery Engine'),
      Setting.get('site_tagline', 'Discover the Top AI Tools Trending Worldwide'),
      Setting.get('site_url', ''),
      Setting.get('google_analytics_id', ''),
      Setting.get('google_site_verification', ''),
      Setting.get('feature_bookmarks', true),
      Setting.get('feature_compare', true),
      Setting.get('feature_submit_tool', true),
      Setting.get('feature_dark_mode', true),
      Setting.get('enable_newsletter', true),
    ]);

    res.json({
      success: true,
      data: {
        site_name: siteName,
        tagline,
        site_url: siteUrl,
        google_analytics_id: gaId,
        google_site_verification: verification,
        features: {
          bookmarks, compare, submit_tool: submitEnabled,
          dark_mode: darkMode, newsletter,
        },
      },
    });
  } catch (error) {
    res.json({ success: true, data: {} });
  }
});

// Newsletter signup (legacy — redirects to new subscribe)
router.post('/newsletter', async (req, res) => {
  try {
    const enabled = await Setting.get('enable_newsletter', true);
    if (!enabled) {
      return res.status(403).json({ success: false, error: 'Newsletter signups are closed' });
    }

    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email required' });
    }

    // Use the new subscriber system
    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (!existing) {
      await Subscriber.create({ email: email.trim().toLowerCase() });
    }

    logger.info(`[Newsletter] New signup: ${email}`);
    res.json({ success: true, message: 'Subscribed! You\'ll receive daily AI tool updates. 🎉' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Signup failed' });
  }
});

module.exports = router;
