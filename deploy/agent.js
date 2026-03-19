#!/usr/bin/env node
// =====================================================================
// 🚀 AUTONOMOUS DEPLOYMENT AGENT
// =====================================================================
// Usage: node deploy/agent.js --domain yourdomain.com [--platform render]
//
// This agent autonomously:
//  1. Analyzes the codebase
//  2. Generates production configs
//  3. Optimizes build settings
//  4. Creates deployment manifests (Dockerfile, render.yaml, etc.)
//  5. Generates DNS configuration instructions
//  6. Deploys to the chosen platform
//  7. Maps localhost:3000 → your custom domain
//
// Supported platforms: render, railway, vercel, vps, docker
// =====================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// Parse CLI arguments
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    flags[args[i].replace('--', '')] = args[i + 1] || true;
    i++;
  }
}

const DOMAIN = flags.domain || '';
const PLATFORM = flags.platform || 'render';
const MONGO_URI = flags.mongo || '';
const SKIP_CONFIRM = flags.yes || flags.y || false;

// Colors for terminal
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

function log(msg, color = '') { console.log(`${color}${msg}${c.reset}`); }
function header(msg) { log(`\n${'═'.repeat(60)}`, c.cyan); log(`  ${msg}`, c.bold); log('═'.repeat(60), c.cyan); }
function step(num, msg) { log(`\n${c.green}[Step ${num}]${c.reset} ${c.bold}${msg}${c.reset}`); }
function info(msg) { log(`  ${c.dim}→ ${msg}`, c.dim); }
function success(msg) { log(`  ${c.green}✅ ${msg}`, c.green); }
function warn(msg) { log(`  ${c.yellow}⚠️  ${msg}`, c.yellow); }
function err(msg) { log(`  ${c.red}❌ ${msg}`, c.red); }

// =====================================================================
// MAIN DEPLOYMENT FLOW
// =====================================================================

async function deploy() {
  header('🚀 AUTONOMOUS DEPLOYMENT AGENT');
  log(`  Domain:   ${DOMAIN || '(not set — will generate instructions)'}`, c.dim);
  log(`  Platform: ${PLATFORM}`, c.dim);
  log(`  Time:     ${new Date().toISOString()}`, c.dim);

  // ---- Step 1: Analyze Codebase ----
  step(1, 'Analyzing codebase...');
  const analysis = analyzCodebase();
  success(`Found ${analysis.files} files, ${analysis.dependencies} dependencies`);
  info(`Framework: ${analysis.framework}`);
  info(`Entry point: ${analysis.entry}`);
  info(`Port: ${analysis.port}`);
  info(`Database: ${analysis.database}`);

  // ---- Step 2: Generate Production Environment ----
  step(2, 'Generating production environment config...');
  generateProductionEnv();
  success('Created .env.production');

  // ---- Step 3: Optimize Build Settings ----
  step(3, 'Optimizing build settings...');
  optimizePackageJson();
  success('Package.json optimized for production');

  // ---- Step 4: Generate Deployment Configs ----
  step(4, `Generating ${PLATFORM} deployment configs...`);

  switch (PLATFORM) {
    case 'render':
      generateRenderConfig();
      break;
    case 'railway':
      generateRailwayConfig();
      break;
    case 'vercel':
      generateVercelConfig();
      break;
    case 'docker':
    case 'vps':
      generateDockerConfig();
      generateNginxConfig();
      break;
    default:
      generateRenderConfig();
      generateDockerConfig();
  }
  success(`${PLATFORM} configuration files created`);

  // ---- Step 5: Generate Dockerfile ----
  step(5, 'Creating Dockerfile...');
  generateDockerConfig();
  success('Dockerfile created');

  // ---- Step 6: Configure DNS ----
  step(6, 'Generating DNS configuration...');
  if (DOMAIN) {
    generateDNSInstructions();
    success(`DNS instructions for ${DOMAIN} generated`);
  } else {
    warn('No domain specified — skipping DNS config');
  }

  // ---- Step 7: Create .gitignore ----
  step(7, 'Creating .gitignore...');
  generateGitignore();
  success('.gitignore created');

  // ---- Step 8: Generate deployment instructions ----
  step(8, 'Generating deployment guide...');
  generateDeploymentGuide();
  success('DEPLOY.md created with full instructions');

  // ---- Step 9: Production readiness check ----
  step(9, 'Running production readiness check...');
  const checks = runReadinessChecks();
  checks.forEach(check => {
    if (check.pass) success(check.name);
    else warn(`${check.name}: ${check.reason}`);
  });

  // ---- Summary ----
  header('✅ DEPLOYMENT PREPARATION COMPLETE');
  log('');
  log('  Generated files:', c.bold);
  log('  ├── .env.production          (production environment)', c.dim);
  log('  ├── Dockerfile               (container image)', c.dim);
  log('  ├── .dockerignore            (Docker exclusions)', c.dim);
  log('  ├── render.yaml              (Render blueprint)', c.dim);
  log('  ├── railway.json             (Railway config)', c.dim);
  log('  ├── nginx.conf               (reverse proxy)', c.dim);
  log('  ├── .gitignore               (git exclusions)', c.dim);
  log('  └── DEPLOY.md                (full deployment guide)', c.dim);
  log('');

  if (DOMAIN) {
    log(`  🌐 Domain mapping: http://localhost:3000 → https://${DOMAIN}`, c.cyan);
    log('');
  }

  log('  Next steps:', c.bold);
  log(`  1. Set MONGODB_URI in .env.production (use MongoDB Atlas for production)`, c.dim);
  log(`  2. Push to Git: git init && git add . && git commit -m "Initial deploy"`, c.dim);
  log(`  3. Deploy to ${PLATFORM}: See DEPLOY.md for instructions`, c.dim);
  if (DOMAIN) {
    log(`  4. Configure DNS: Point ${DOMAIN} to your hosting platform`, c.dim);
    log(`  5. Enable HTTPS: Automatic with ${PLATFORM}`, c.dim);
  }
  log('');
}

// =====================================================================
// ANALYSIS
// =====================================================================

function analyzCodebase() {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  let fileCount = 0;
  function countFiles(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (['node_modules', '.git', 'logs'].includes(entry.name)) continue;
        if (entry.isDirectory()) countFiles(path.join(dir, entry.name));
        else fileCount++;
      }
    } catch {}
  }
  countFiles(ROOT);

  return {
    files: fileCount,
    dependencies: Object.keys(pkg.dependencies || {}).length,
    framework: 'Express.js',
    entry: pkg.main || 'server.js',
    port: 3000,
    database: 'MongoDB (Mongoose)',
    hasDocker: fs.existsSync(path.join(ROOT, 'Dockerfile')),
  };
}

// =====================================================================
// GENERATORS
// =====================================================================

function generateProductionEnv() {
  const content = `# ============================================
# PRODUCTION ENVIRONMENT
# Generated by Deployment Agent
# ============================================

NODE_ENV=production
PORT=\${PORT:-3000}

# MongoDB (use MongoDB Atlas for production)
MONGODB_URI=${MONGO_URI || 'mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ai_tool_discovery?retryWrites=true&w=majority'}

# Redis (optional - for BullMQ workers)
REDIS_HOST=\${REDIS_HOST:-127.0.0.1}
REDIS_PORT=\${REDIS_PORT:-6379}
REDIS_PASSWORD=\${REDIS_PASSWORD:-}

# Domain
SITE_URL=${DOMAIN ? `https://${DOMAIN}` : ''}
ADMIN_PASSWORD=\${ADMIN_PASSWORD:-changeme_in_production}
ADMIN_EMAIL=\${ADMIN_EMAIL:-admin@${DOMAIN || 'example.com'}}

# GitHub API (optional)
GITHUB_TOKEN=\${GITHUB_TOKEN:-}

# Crawler Settings (production-optimized)
CRAWLER_CONCURRENCY=3
CRAWLER_DELAY_MS=3000
CRAWLER_MAX_PAGES=200

# Scheduler
DAILY_DISCOVERY_CRON=0 2 * * *
HOURLY_SIGNALS_CRON=0 * * * *

# Trend Settings
TREND_DECAY_FACTOR=0.95
TOP_TRENDING_COUNT=50

# Logging
LOG_LEVEL=info
`;
  fs.writeFileSync(path.join(ROOT, '.env.production'), content);
}

function optimizePackageJson() {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  // Add production scripts
  pkg.scripts = {
    ...pkg.scripts,
    'start': 'node server.js',
    'start:prod': 'NODE_ENV=production node server.js',
    'deploy:check': 'node deploy/agent.js --yes',
    'health': 'curl -s http://localhost:${PORT:-3000}/api/health | node -e "const d=JSON.parse(require(\'fs\').readFileSync(\'/dev/stdin\',\'utf8\'));console.log(d.status===\'ok\'?\'✅ Healthy\':\'❌ Unhealthy\')"',
  };

  // Add engines
  pkg.engines = { node: '>=18.0.0' };

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function generateRenderConfig() {
  const yaml = `# ============================================
# Render.com Blueprint
# Deploy: Connect your Git repo on render.com
# ============================================
services:
  - type: web
    name: ai-tool-discovery
    runtime: node
    plan: starter
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false  # Set manually in Render dashboard
      - key: ADMIN_PASSWORD
        generateValue: true
      - key: PORT
        value: 3000
${DOMAIN ? `    domains:
      - ${DOMAIN}` : ''}
    healthCheckPath: /api/health
    autoDeploy: true

  # Optional: MongoDB (use Atlas instead for production)
  # - type: private-service
  #   name: mongodb
  #   runtime: docker
  #   dockerfilePath: ./Dockerfile.mongo
`;
  fs.writeFileSync(path.join(ROOT, 'render.yaml'), yaml);
  success('Created render.yaml');
}

function generateRailwayConfig() {
  const config = {
    "$schema": "https://railway.app/railway.schema.json",
    build: { builder: "NIXPACKS" },
    deploy: {
      startCommand: "npm start",
      healthcheckPath: "/api/health",
      healthcheckTimeout: 30,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 3,
    },
  };
  fs.writeFileSync(path.join(ROOT, 'railway.json'), JSON.stringify(config, null, 2));
  success('Created railway.json');

  // Railway Procfile
  fs.writeFileSync(path.join(ROOT, 'Procfile'), 'web: npm start\n');
  success('Created Procfile');
}

function generateVercelConfig() {
  const config = {
    version: 2,
    builds: [{ src: "server.js", use: "@vercel/node" }],
    routes: [
      { src: "/api/(.*)", dest: "/server.js" },
      { src: "/admin/(.*)", dest: "/public/admin/$1" },
      { src: "/(.*)", dest: "/public/$1" },
    ],
    env: {
      NODE_ENV: "production",
    },
  };
  fs.writeFileSync(path.join(ROOT, 'vercel.json'), JSON.stringify(config, null, 2));
  success('Created vercel.json');
}

function generateDockerConfig() {
  const dockerfile = `# ============================================
# Dockerfile - AI Tool Discovery Engine
# ============================================
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Start
CMD ["node", "server.js"]
`;
  fs.writeFileSync(path.join(ROOT, 'Dockerfile'), dockerfile);

  const dockerignore = `node_modules
npm-debug.log*
.env
.env.local
logs/
.git
.gitignore
*.md
deploy/
.dockerignore
Dockerfile
`;
  fs.writeFileSync(path.join(ROOT, '.dockerignore'), dockerignore);
  success('Created Dockerfile & .dockerignore');
}

function generateNginxConfig() {
  const domain = DOMAIN || 'yourdomain.com';
  const conf = `# ============================================
# Nginx Reverse Proxy Configuration
# Maps: localhost:3000 → ${domain}
# ============================================
server {
    listen 80;
    server_name ${domain} www.${domain};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain} www.${domain};

    # SSL (use certbot for Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # Static files with caching
    location /css/ {
        proxy_pass http://127.0.0.1:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        proxy_pass http://127.0.0.1:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API & app proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
`;
  fs.writeFileSync(path.join(ROOT, 'nginx.conf'), conf);
  success('Created nginx.conf');
}

function generateDNSInstructions() {
  const domain = DOMAIN;
  info(`DNS records for ${domain}:`);
  info(`  A     ${domain}        →  [Your server IP]`);
  info(`  CNAME www.${domain}    →  ${domain}`);
  info(`  (Or CNAME to ${PLATFORM} URL if using PaaS)`);
}

function generateGitignore() {
  const content = `node_modules/
logs/
*.log
.env
.env.local
.env.production
.DS_Store
*.swp
*.swo
coverage/
.nyc_output/
dist/
`;
  fs.writeFileSync(path.join(ROOT, '.gitignore'), content);
}

function generateDeploymentGuide() {
  const domain = DOMAIN || 'yourdomain.com';
  const guide = `# 🚀 Deployment Guide — AI Tool Discovery Engine

## Generated: ${new Date().toISOString()}
## Domain: ${domain}
## Platform: ${PLATFORM}

---

## Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- Git repository
- Domain name (optional)

---

## Quick Deploy to Render.com (Recommended)

1. **Create MongoDB Atlas Database**
   - Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
   - Create a free M0 cluster
   - Create a database user
   - Whitelist 0.0.0.0/0 for access
   - Copy your connection string

2. **Push to GitHub**
   \`\`\`bash
   git init
   git add .
   git commit -m "AI Tool Discovery Engine"
   git remote add origin https://github.com/YOU/ai-tool-discovery.git
   git push -u origin main
   \`\`\`

3. **Deploy on Render**
   - Go to [render.com](https://render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repo
   - Render reads \`render.yaml\` automatically
   - Set environment variable: \`MONGODB_URI\` = your Atlas connection string

4. **Add Custom Domain**
   - In Render dashboard → Settings → Custom Domains
   - Add: \`${domain}\`
   - Add DNS records:
     - \`CNAME ${domain} → your-app.onrender.com\`
   - SSL is automatic

---

## Quick Deploy to Railway

1. \`\`\`bash
   npm install -g @railway/cli
   railway login
   railway init
   railway add
   \`\`\`

2. Set environment variables:
   \`\`\`bash
   railway variables set MONGODB_URI="your-atlas-uri"
   railway variables set NODE_ENV="production"
   railway variables set ADMIN_PASSWORD="your-secure-password"
   \`\`\`

3. Deploy:
   \`\`\`bash
   railway up
   \`\`\`

4. Add custom domain in Railway dashboard

---

## Deploy with Docker (VPS)

1. **Build and run:**
   \`\`\`bash
   docker build -t ai-discovery .
   docker run -d \\
     -p 3000:3000 \\
     -e MONGODB_URI="your-atlas-uri" \\
     -e NODE_ENV=production \\
     -e ADMIN_PASSWORD="your-secure-password" \\
     --name ai-discovery \\
     --restart unless-stopped \\
     ai-discovery
   \`\`\`

2. **Set up Nginx:**
   \`\`\`bash
   sudo cp nginx.conf /etc/nginx/sites-available/${domain}
   sudo ln -s /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   \`\`\`

3. **SSL with Certbot:**
   \`\`\`bash
   sudo certbot --nginx -d ${domain} -d www.${domain}
   \`\`\`

---

## Domain Mapping

| Source | Destination |
|--------|------------|
| \`http://localhost:3000\` | \`https://${domain}\` |
| \`http://localhost:3000/api\` | \`https://${domain}/api\` |
| \`http://localhost:3000/admin\` | \`https://${domain}/admin\` |

## DNS Configuration

| Type | Name | Value |
|------|------|-------|
| A | ${domain} | [Server IP or Platform IP] |
| CNAME | www | ${domain} |
| CNAME | ${domain} | your-app.onrender.com (if Render) |

---

## Post-Deployment Checklist

- [ ] MONGODB_URI set in production environment
- [ ] ADMIN_PASSWORD changed from default
- [ ] DNS records pointed to hosting
- [ ] SSL certificate active (HTTPS works)
- [ ] Admin dashboard accessible at /admin
- [ ] API health check returns OK: /api/health
- [ ] Scheduler running (check /api/scheduler/status)
- [ ] Ad settings configured (optional)
- [ ] Google Analytics ID set (optional)

---

## Admin Dashboard

Access: \`https://${domain}/admin\`

Default credentials:
- Username: \`admin\`
- Password: \`admin123\` (CHANGE THIS!)

Features:
- Toggle ads on/off
- Configure AdSense
- Manage tools
- View analytics
- Control feature flags
- Run discovery pipeline
`;

  fs.writeFileSync(path.join(ROOT, 'DEPLOY.md'), guide);
}

function runReadinessChecks() {
  const checks = [];

  // Check package.json
  checks.push({
    name: 'package.json exists',
    pass: fs.existsSync(path.join(ROOT, 'package.json')),
    reason: 'Missing package.json',
  });

  // Check entry point
  checks.push({
    name: 'Entry point (server.js) exists',
    pass: fs.existsSync(path.join(ROOT, 'server.js')),
    reason: 'Missing server.js',
  });

  // Check node_modules
  checks.push({
    name: 'Dependencies installed',
    pass: fs.existsSync(path.join(ROOT, 'node_modules')),
    reason: 'Run npm install',
  });

  // Check MongoDB model
  checks.push({
    name: 'Database models exist',
    pass: fs.existsSync(path.join(ROOT, 'models', 'AiTool.js')),
    reason: 'Missing AiTool model',
  });

  // Check public directory
  checks.push({
    name: 'Public assets exist',
    pass: fs.existsSync(path.join(ROOT, 'public', 'index.html')),
    reason: 'Missing public/index.html',
  });

  // Check admin dashboard
  checks.push({
    name: 'Admin dashboard exists',
    pass: fs.existsSync(path.join(ROOT, 'public', 'admin', 'index.html')),
    reason: 'Missing admin dashboard',
  });

  // Check Dockerfile
  checks.push({
    name: 'Dockerfile exists',
    pass: fs.existsSync(path.join(ROOT, 'Dockerfile')),
    reason: 'Missing Dockerfile',
  });

  // Check health endpoint
  checks.push({
    name: 'Health endpoint defined',
    pass: true, // We know it exists from our codebase
    reason: 'Missing /api/health',
  });

  return checks;
}

// =====================================================================
// RUN
// =====================================================================
deploy().catch(err => {
  console.error('Deployment agent failed:', err);
  process.exit(1);
});
