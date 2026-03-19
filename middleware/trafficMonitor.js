// =========================================
// Real-Time Traffic Monitor & Performance Manager
// =========================================
const logger = require('../utils/logger');

class TrafficMonitor {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      activeConnections: 0,
      requestsPerMinute: 0,
      avgResponseTime: 0,
      errorCount: 0,
      statusCodes: {},
      topEndpoints: {},
      memoryUsage: {},
      cpuUsage: 0,
      uptime: 0,
      peakConnections: 0,
      lastMinuteRequests: [],
      responseTimeSamples: [],
    };

    // Performance thresholds
    this.thresholds = {
      maxResponseTime: 5000,  // 5s
      maxMemoryPercent: 85,
      maxErrorRate: 5,        // 5% error rate
      maxConnectionsWarning: 500,
    };

    // Start periodic metrics collection
    this._collectInterval = setInterval(() => this._collectSystemMetrics(), 10000);
    this._cleanupInterval = setInterval(() => this._cleanupOldData(), 60000);
  }

  // Express middleware
  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      this.metrics.totalRequests++;
      this.metrics.activeConnections++;
      this.metrics.lastMinuteRequests.push(Date.now());

      if (this.metrics.activeConnections > this.metrics.peakConnections) {
        this.metrics.peakConnections = this.metrics.activeConnections;
      }

      // Track endpoint
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      this.metrics.topEndpoints[endpoint] = (this.metrics.topEndpoints[endpoint] || 0) + 1;

      res.on('finish', () => {
        this.metrics.activeConnections--;
        const duration = Date.now() - start;
        this.metrics.responseTimeSamples.push(duration);

        // Track status codes
        const code = res.statusCode;
        this.metrics.statusCodes[code] = (this.metrics.statusCodes[code] || 0) + 1;

        if (code >= 400) this.metrics.errorCount++;

        // Performance warnings
        if (duration > this.thresholds.maxResponseTime) {
          logger.warn(`[Traffic] Slow response: ${endpoint} took ${duration}ms`);
        }
      });

      // Dynamic performance management - add throttling headers
      if (this.metrics.activeConnections > this.thresholds.maxConnectionsWarning) {
        res.setHeader('Retry-After', '5');
        logger.warn(`[Traffic] High load: ${this.metrics.activeConnections} active connections`);
      }

      next();
    };
  }

  _collectSystemMetrics() {
    const mem = process.memoryUsage();
    this.metrics.memoryUsage = {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
      percentUsed: Math.round((mem.heapUsed / mem.heapTotal) * 100),
    };
    this.metrics.uptime = Math.round(process.uptime());

    // Calculate requests per minute
    const oneMinuteAgo = Date.now() - 60000;
    this.metrics.requestsPerMinute = this.metrics.lastMinuteRequests.filter(t => t > oneMinuteAgo).length;

    // Calculate average response time
    if (this.metrics.responseTimeSamples.length > 0) {
      const recent = this.metrics.responseTimeSamples.slice(-100);
      this.metrics.avgResponseTime = Math.round(
        recent.reduce((a, b) => a + b, 0) / recent.length
      );
    }

    // Memory warning
    if (this.metrics.memoryUsage.percentUsed > this.thresholds.maxMemoryPercent) {
      logger.warn(`[Traffic] High memory usage: ${this.metrics.memoryUsage.percentUsed}%`);
      // Trigger GC if available
      if (global.gc) {
        global.gc();
        logger.info('[Traffic] Garbage collection triggered');
      }
    }
  }

  _cleanupOldData() {
    const oneMinuteAgo = Date.now() - 60000;
    this.metrics.lastMinuteRequests = this.metrics.lastMinuteRequests.filter(t => t > oneMinuteAgo);
    if (this.metrics.responseTimeSamples.length > 1000) {
      this.metrics.responseTimeSamples = this.metrics.responseTimeSamples.slice(-200);
    }
  }

  getSnapshot() {
    // Sort endpoints by hits
    const topEndpoints = Object.entries(this.metrics.topEndpoints)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, hits]) => ({ endpoint, hits }));

    const errorRate = this.metrics.totalRequests > 0
      ? ((this.metrics.errorCount / this.metrics.totalRequests) * 100).toFixed(2)
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      activeConnections: this.metrics.activeConnections,
      requestsPerMinute: this.metrics.requestsPerMinute,
      avgResponseTime: this.metrics.avgResponseTime + 'ms',
      errorCount: this.metrics.errorCount,
      errorRate: errorRate + '%',
      statusCodes: this.metrics.statusCodes,
      topEndpoints,
      memory: this.metrics.memoryUsage,
      peakConnections: this.metrics.peakConnections,
      uptime: this.metrics.uptime,
      uptimeFormatted: this._formatUptime(this.metrics.uptime),
    };
  }

  _formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  }

  destroy() {
    clearInterval(this._collectInterval);
    clearInterval(this._cleanupInterval);
  }
}

module.exports = TrafficMonitor;
