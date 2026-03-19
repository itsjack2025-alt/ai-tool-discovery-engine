// =========================================
// Auth Middleware
// =========================================
const AdminUser = require('../models/AdminUser');
const logger = require('../utils/logger');

function authMiddleware(requiredPermission = null) {
  return async (req, res, next) => {
    try {
      // Get token from header or cookie
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.admin_token;
      const token = authHeader?.replace('Bearer ', '') || cookieToken;

      if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Verify token
      const payload = AdminUser.verifyToken(token);
      if (!payload) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
      }

      // Check if user still exists and is active
      const user = await AdminUser.findById(payload.id).lean();
      if (!user || !user.is_active) {
        return res.status(401).json({ success: false, error: 'User not found or inactive' });
      }

      // Check specific permission if required
      if (requiredPermission && !user.permissions[requiredPermission] && user.role !== 'superadmin') {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' });
      }

      req.admin = {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      };

      next();
    } catch (error) {
      logger.error('Auth middleware error:', error);
      res.status(500).json({ success: false, error: 'Authentication error' });
    }
  };
}

module.exports = authMiddleware;
