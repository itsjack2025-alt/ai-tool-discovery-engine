# 🚀 Deployment Guide — AI Tool Discovery Engine

## Generated: 2026-03-16T23:09:40.197Z
## Domain: aitool.discovery
## Platform: render

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
   ```bash
   git init
   git add .
   git commit -m "AI Tool Discovery Engine"
   git remote add origin https://github.com/YOU/ai-tool-discovery.git
   git push -u origin main
   ```

3. **Deploy on Render**
   - Go to [render.com](https://render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repo
   - Render reads `render.yaml` automatically
   - Set environment variable: `MONGODB_URI` = your Atlas connection string

4. **Add Custom Domain**
   - In Render dashboard → Settings → Custom Domains
   - Add: `aitool.discovery`
   - Add DNS records:
     - `CNAME aitool.discovery → your-app.onrender.com`
   - SSL is automatic

---

## Quick Deploy to Railway

1. ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway add
   ```

2. Set environment variables:
   ```bash
   railway variables set MONGODB_URI="your-atlas-uri"
   railway variables set NODE_ENV="production"
   railway variables set ADMIN_PASSWORD="your-secure-password"
   ```

3. Deploy:
   ```bash
   railway up
   ```

4. Add custom domain in Railway dashboard

---

## Deploy with Docker (VPS)

1. **Build and run:**
   ```bash
   docker build -t ai-discovery .
   docker run -d \
     -p 3000:3000 \
     -e MONGODB_URI="your-atlas-uri" \
     -e NODE_ENV=production \
     -e ADMIN_PASSWORD="your-secure-password" \
     --name ai-discovery \
     --restart unless-stopped \
     ai-discovery
   ```

2. **Set up Nginx:**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/aitool.discovery
   sudo ln -s /etc/nginx/sites-available/aitool.discovery /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **SSL with Certbot:**
   ```bash
   sudo certbot --nginx -d aitool.discovery -d www.aitool.discovery
   ```

---

## Domain Mapping

| Source | Destination |
|--------|------------|
| `http://localhost:3000` | `https://aitool.discovery` |
| `http://localhost:3000/api` | `https://aitool.discovery/api` |
| `http://localhost:3000/admin` | `https://aitool.discovery/admin` |

## DNS Configuration

| Type | Name | Value |
|------|------|-------|
| A | aitool.discovery | [Server IP or Platform IP] |
| CNAME | www | aitool.discovery |
| CNAME | aitool.discovery | your-app.onrender.com (if Render) |

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

Access: `https://aitool.discovery/admin`

Default credentials:
- Username: `admin`
- Password: `admin123` (CHANGE THIS!)

Features:
- Toggle ads on/off
- Configure AdSense
- Manage tools
- View analytics
- Control feature flags
- Run discovery pipeline
