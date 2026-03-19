// =========================================
// Admin API Routes v3.0
// Includes review management, inquiry management,
// traffic monitoring, maintenance agent, and subscribers
// =========================================
const express = require('express');
const router = express.Router();
const AdminUser = require('../models/AdminUser');
const AiTool = require('../models/AiTool');
const Setting = require('../models/Settings');
const Submission = require('../models/Submission');
const Review = require('../models/Review');
const Inquiry = require('../models/Inquiry');
const Subscriber = require('../models/Subscriber');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

// ---- Auth Endpoints ----

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const user = await AdminUser.findOne({
      $or: [{ username }, { email: username }],
      is_active: true,
    });

    if (!user || !user.verifyPassword(password)) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = user.generateToken();

    user.last_login = new Date();
    user.login_count += 1;
    await user.save();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

router.get('/me', authMiddleware(), async (req, res) => {
  res.json({ success: true, data: req.admin });
});

router.post('/change-password', authMiddleware(), async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await AdminUser.findById(req.admin.id);

    if (!user.verifyPassword(current_password)) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const { hash, salt } = AdminUser.hashPassword(new_password);
    user.password_hash = hash;
    user.salt = salt;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// ---- Settings Endpoints ----

router.get('/settings', authMiddleware('manage_settings'), async (req, res) => {
  try {
    const category = req.query.category;
    const settings = category
      ? await Setting.getByCategory(category)
      : await Setting.find().sort('category key').lean();

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

router.put('/settings', authMiddleware('manage_settings'), async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }

    for (const [key, value] of Object.entries(updates)) {
      await Setting.findOneAndUpdate(
        { key },
        { value, updated_by: req.admin.username },
        { upsert: true }
      );
    }

    logger.info(`[Admin] Settings updated by ${req.admin.username}:`, Object.keys(updates));
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// ---- Ad Management ----

router.get('/ads/config', authMiddleware('manage_ads'), async (req, res) => {
  try {
    const adSettings = await Setting.getByCategory('ads');
    res.json({ success: true, data: adSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch ad config' });
  }
});

router.put('/ads/toggle', authMiddleware('manage_ads'), async (req, res) => {
  try {
    const { enabled } = req.body;
    await Setting.set('ads_enabled', !!enabled, 'ads');
    logger.info(`[Admin] Ads ${enabled ? 'enabled' : 'disabled'} by ${req.admin.username}`);
    res.json({ success: true, message: `Ads ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to toggle ads' });
  }
});

router.put('/ads/config', authMiddleware('manage_ads'), async (req, res) => {
  try {
    const { provider, client_id, slots, frequency, max_per_page, custom_code } = req.body;

    if (provider) await Setting.set('ads_provider', provider, 'ads');
    if (client_id) await Setting.set('adsense_client_id', client_id, 'ads');
    if (slots?.header) await Setting.set('adsense_slot_header', slots.header, 'ads');
    if (slots?.sidebar) await Setting.set('adsense_slot_sidebar', slots.sidebar, 'ads');
    if (slots?.inline) await Setting.set('adsense_slot_inline', slots.inline, 'ads');
    if (frequency) await Setting.set('ads_frequency', parseInt(frequency), 'ads');
    if (max_per_page) await Setting.set('ads_max_per_page', parseInt(max_per_page), 'ads');
    if (custom_code?.header) await Setting.set('ads_custom_code_header', custom_code.header, 'ads');
    if (custom_code?.footer) await Setting.set('ads_custom_code_footer', custom_code.footer, 'ads');

    logger.info(`[Admin] Ad config updated by ${req.admin.username}`);
    res.json({ success: true, message: 'Ad configuration saved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save ad config' });
  }
});

// ---- Tool Management ----

router.get('/tools', authMiddleware('manage_tools'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const [tools, total] = await Promise.all([
      AiTool.find(query).sort({ trend_score: -1 }).skip((page - 1) * limit).limit(limit)
        .select('-trend_history -__v').lean(),
      AiTool.countDocuments(query),
    ]);

    res.json({ success: true, data: tools, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch tools' });
  }
});

router.put('/tools/:id', authMiddleware('manage_tools'), async (req, res) => {
  try {
    const tool = await AiTool.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });
    logger.info(`[Admin] Tool updated: ${tool.name} by ${req.admin.username}`);
    res.json({ success: true, data: tool });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update tool' });
  }
});

router.delete('/tools/:id', authMiddleware('manage_tools'), async (req, res) => {
  try {
    const tool = await AiTool.findByIdAndUpdate(req.params.id, { is_active: false });
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });
    logger.info(`[Admin] Tool deactivated: ${tool.name} by ${req.admin.username}`);
    res.json({ success: true, message: 'Tool deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete tool' });
  }
});

// ---- Submissions ----

router.get('/submissions', authMiddleware('manage_tools'), async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const submissions = await Submission.find({ status }).sort({ created_at: -1 }).lean();
    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

router.put('/submissions/:id/approve', authMiddleware('manage_tools'), async (req, res) => {
  try {
    const sub = await Submission.findByIdAndUpdate(req.params.id, {
      status: 'approved',
      reviewed_by: req.admin.username,
      reviewed_at: new Date(),
    }, { new: true });

    if (!sub) return res.status(404).json({ success: false, error: 'Submission not found' });

    logger.info(`[Admin] Submission approved: ${sub.name} by ${req.admin.username}`);
    res.json({ success: true, data: sub });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to approve submission' });
  }
});

router.put('/submissions/:id/reject', authMiddleware('manage_tools'), async (req, res) => {
  try {
    const sub = await Submission.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      reviewed_by: req.admin.username,
      reviewed_at: new Date(),
      review_notes: req.body.notes || '',
    }, { new: true });

    if (!sub) return res.status(404).json({ success: false, error: 'Submission not found' });
    res.json({ success: true, data: sub });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reject submission' });
  }
});

// ================================================
// REVIEW MANAGEMENT (Admin)
// ================================================

router.get('/reviews', authMiddleware(), async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const query = {};
    if (status !== 'all') query.status = status;

    const [reviews, total] = await Promise.all([
      Review.find(query).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Review.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

router.put('/reviews/:id/approve', authMiddleware(), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, {
      status: 'approved',
      reviewed_by: req.admin.username,
    }, { new: true });
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    logger.info(`[Admin] Review approved by ${req.admin.username}`);
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to approve review' });
  }
});

router.put('/reviews/:id/reject', authMiddleware(), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      reviewed_by: req.admin.username,
      admin_notes: req.body.notes || '',
    }, { new: true });
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reject review' });
  }
});

router.delete('/reviews/:id', authMiddleware(), async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    logger.info(`[Admin] Review deleted by ${req.admin.username}`);
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete review' });
  }
});

// ================================================
// INQUIRY MANAGEMENT (Admin)
// ================================================

router.get('/inquiries', authMiddleware(), async (req, res) => {
  try {
    const status = req.query.status || 'new';
    const query = status === 'all' ? {} : { status };
    const inquiries = await Inquiry.find(query).sort({ created_at: -1 }).lean();
    res.json({ success: true, data: inquiries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch inquiries' });
  }
});

router.put('/inquiries/:id/status', authMiddleware(), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const update = { status };
    if (notes) update.admin_notes = notes;
    if (status === 'replied') {
      update.replied_by = req.admin.username;
      update.replied_at = new Date();
    }

    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!inquiry) return res.status(404).json({ success: false, error: 'Inquiry not found' });
    res.json({ success: true, data: inquiry });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update inquiry' });
  }
});

router.post('/inquiries/:id/reply', authMiddleware(), async (req, res) => {
  try {
    const { reply_message } = req.body;
    if (!reply_message || !reply_message.trim()) {
      return res.status(400).json({ success: false, error: 'Reply message is required' });
    }

    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, {
      reply_message: reply_message.trim(),
      status: 'replied',
      replied_by: req.admin.username,
      replied_at: new Date(),
    }, { new: true });

    if (!inquiry) return res.status(404).json({ success: false, error: 'Inquiry not found' });
    logger.info(`[Admin] Inquiry replied by ${req.admin.username} to ${inquiry.email}`);
    res.json({ success: true, data: inquiry, message: 'Reply saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reply to inquiry' });
  }
});

router.delete('/inquiries/:id', authMiddleware(), async (req, res) => {
  try {
    await Inquiry.findByIdAndDelete(req.params.id);
    logger.info(`[Admin] Inquiry deleted by ${req.admin.username}`);
    res.json({ success: true, message: 'Inquiry deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete inquiry' });
  }
});

// ================================================
// SUBSCRIBER MANAGEMENT (Admin)
// ================================================

router.get('/subscribers', authMiddleware(), async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ created_at: -1 }).lean();
    const stats = {
      total: subscribers.length,
      active: subscribers.filter(s => s.is_active).length,
      totalReferrals: subscribers.reduce((sum, s) => sum + (s.referral_count || 0), 0),
    };
    res.json({ success: true, data: subscribers, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscribers' });
  }
});

// ================================================
// TRAFFIC MONITORING (Admin)
// ================================================

router.get('/traffic', authMiddleware(), async (req, res) => {
  try {
    const trafficMonitor = req.app.get('trafficMonitor');
    if (!trafficMonitor) {
      return res.status(500).json({ success: false, error: 'Traffic monitor not initialized' });
    }
    res.json({ success: true, data: trafficMonitor.getSnapshot() });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch traffic data' });
  }
});

// ================================================
// MAINTENANCE AGENT (Admin)
// ================================================

router.get('/maintenance', authMiddleware(), async (req, res) => {
  try {
    const agent = req.app.get('maintenanceAgent');
    if (!agent) {
      return res.status(500).json({ success: false, error: 'Maintenance agent not initialized' });
    }
    res.json({ success: true, data: agent.getReport() });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch maintenance data' });
  }
});

router.post('/maintenance/run', authMiddleware(), async (req, res) => {
  try {
    const agent = req.app.get('maintenanceAgent');
    if (!agent) {
      return res.status(500).json({ success: false, error: 'Maintenance agent not initialized' });
    }

    // Run in background
    res.json({
      success: true,
      message: 'Maintenance cycle started. Check /api/admin/maintenance for progress.',
    });

    agent.runFullCycle().catch(err => {
      logger.error('Manual maintenance failed:', err);
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to start maintenance' });
  }
});

// ---- User Management ----

router.get('/users', authMiddleware('manage_users'), async (req, res) => {
  try {
    const users = await AdminUser.find().select('-password_hash -salt').lean();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.post('/users', authMiddleware('manage_users'), async (req, res) => {
  try {
    const { username, email, password, role, permissions } = req.body;
    const { hash, salt } = AdminUser.hashPassword(password);

    const user = await AdminUser.create({
      username, email, password_hash: hash, salt,
      role: role || 'admin',
      permissions: permissions || {},
    });

    res.json({
      success: true,
      data: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Dashboard Analytics ----

router.get('/analytics', authMiddleware(), async (req, res) => {
  try {
    const [totalTools, activeTools, categoryStats, sourceStats,
      trendStats, submissionCount, reviewCount, inquiryCount, subscriberCount] = await Promise.all([
      AiTool.countDocuments(),
      AiTool.countDocuments({ is_active: true }),
      AiTool.getCategoryStats(),
      AiTool.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AiTool.aggregate([
        { $match: { is_active: true } },
        { $group: { _id: '$trend_direction', count: { $sum: 1 } } },
      ]),
      Submission.countDocuments({ status: 'pending' }),
      Review.countDocuments({ status: 'pending' }),
      Inquiry.countDocuments({ status: 'new' }),
      Subscriber.countDocuments({ is_active: true }),
    ]);

    const avgScore = await AiTool.aggregate([
      { $match: { is_active: true, trend_score: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$trend_score' }, max: { $max: '$trend_score' } } },
    ]);

    // Get maintenance summary
    const maintenanceAgent = req.app.get('maintenanceAgent');
    const maintenance = maintenanceAgent ? maintenanceAgent.getSummary() : null;

    // Get traffic snapshot
    const trafficMonitor = req.app.get('trafficMonitor');
    const traffic = trafficMonitor ? trafficMonitor.getSnapshot() : null;

    res.json({
      success: true,
      data: {
        total_tools: totalTools,
        active_tools: activeTools,
        inactive_tools: totalTools - activeTools,
        categories: categoryStats,
        sources: sourceStats,
        trend_distribution: trendStats,
        pending_submissions: submissionCount,
        pending_reviews: reviewCount,
        new_inquiries: inquiryCount,
        active_subscribers: subscriberCount,
        avg_trend_score: avgScore[0]?.avg?.toFixed(1) || 0,
        max_trend_score: avgScore[0]?.max?.toFixed(1) || 0,
        maintenance,
        traffic,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
