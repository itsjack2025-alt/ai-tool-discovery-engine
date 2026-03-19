// =========================================
// Production Middleware
// Security headers, compression, rate limiting
// =========================================
const logger = require('../utils/logger');

// Security headers
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

// Simple in-memory rate limiter
const rateLimitStore = new Map();

function rateLimit(windowMs = 60000, max = 100) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    record.count++;

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
      });
    }

    next();
  };
}

// Clean up rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Request logging
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
}

// Cache control for static assets
function cacheControl(maxAge = 86400) {
  return (req, res, next) => {
    if (req.path.match(/\.(css|js|png|jpg|svg|ico|woff2?)$/)) {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    } else if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  };
}

// Gzip-like compression (uses built-in zlib through content negotiation)
function compressionHeaders(req, res, next) {
  res.setHeader('Vary', 'Accept-Encoding');
  next();
}

module.exports = {
  securityHeaders,
  rateLimit,
  requestLogger,
  cacheControl,
  compressionHeaders,
};
