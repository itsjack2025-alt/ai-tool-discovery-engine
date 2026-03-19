# 🤖 AI Tool Discovery Engine

> **Discover, analyze, and track the hottest AI tools trending worldwide.**

A fully automated platform that crawls GitHub, Product Hunt, Hacker News, and 50+ sources daily to find, rank, and showcase trending AI tools — complete with real-time analytics, AI chatbot (Jack), reviews, and more.

![Node.js](https://img.shields.io/badge/Node.js-v20-green?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green?style=flat-square&logo=mongodb)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?style=flat-square&logo=express)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## ✨ Features

- 🔥 **Trending AI Tools** — Auto-discovery and ranking from 50+ data sources
- 🔍 **Smart Search** — Real-time search with dropdown results, ranking, and tool details
- 📊 **Real-Time Analytics** — Live visitor count and performance metrics
- 🤖 **Jack AI Chatbot** — Built-in AI assistant for tool discovery
- ⭐ **Reviews & Feedback** — Community-driven review system
- 📂 **Category Browsing** — Filter tools by AI category
- 🚀 **Innovation Showcase** — Curated trending AI technologies
- 📧 **Subscription System** — Daily AI tool newsletter with referral tracking
- 💼 **Business Inquiries** — Contact form with notification system
- 🛡️ **Admin Dashboard** — Full-featured management panel with real-time analytics
- 📺 **Ad Management** — Google AdSense, Carbon Ads, and custom ad support
- 🔧 **Self-Healing System** — Automated maintenance and health monitoring
- 🔒 **Production-Ready** — Security headers, rate limiting, graceful shutdown

## 🖼️ Screenshots

### Public Dashboard
- Modern dark-themed UI with animated logo
- Live visitor counter
- Trending AI tools with official brand logos
- Search dropdown with rankings

### Admin Panel
- Real-time analytics (visitors, RPM, response time, uptime)
- Tools, submissions, reviews management
- SEO, ads, feature toggles configuration

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.0.0
- **MongoDB** (local or MongoDB Atlas)
- **Redis** (optional — for BullMQ job queues)

### Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/ai-tool-discovery-engine.git
cd ai-tool-discovery-engine

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and settings

# Start the server
npm start
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/ai_tool_discovery` |
| `ADMIN_USERNAME` | Admin login username | `CallmeJack` |
| `ADMIN_PASSWORD` | Admin login password | `Jack@2026` |
| `GITHUB_TOKEN` | GitHub API token (optional) | — |
| `SITE_URL` | Production URL | — |

---

## 🏗️ Architecture

```
ai-tool-discovery-engine/
├── server.js              # Express app entry point
├── config/                # Database & app configuration
├── middleware/             # Auth, rate limiting, traffic monitor
├── models/                # Mongoose schemas (AiTool, Review, etc.)
├── routes/
│   ├── api.js             # Public API routes
│   ├── admin.js           # Admin API routes
│   └── public.js          # Public routes (chat, reviews, etc.)
├── services/
│   ├── chatbot/           # Jack AI chatbot service
│   ├── crawlers/          # GitHub, ProductHunt, HN crawlers
│   ├── maintenance/       # Self-healing maintenance agent
│   ├── ranking/           # Trend scoring & ranking engine
│   └── scheduler/         # Cron-based discovery scheduler
├── public/
│   ├── index.html         # Main dashboard SPA
│   ├── css/styles.css     # Full design system
│   ├── js/dashboard.js    # Dashboard logic
│   └── admin/index.html   # Admin panel SPA
├── Dockerfile             # Docker container configuration
├── render.yaml            # Render.com deployment blueprint
└── package.json           # Dependencies & scripts
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/trending` | Top trending AI tools |
| `GET` | `/api/dashboard` | Full dashboard data |
| `GET` | `/api/tools/search?q=` | Search AI tools |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/traffic/live` | Live visitor count |
| `POST` | `/api/public/chat` | Chat with Jack AI |
| `POST` | `/api/public/reviews` | Submit a review |
| `POST` | `/api/public/subscribe` | Subscribe to newsletter |
| `GET` | `/sitemap.xml` | Dynamic SEO sitemap |

---

## 🌐 Deployment

### Render.com (Recommended)
1. Push code to GitHub
2. Connect repo on [render.com](https://render.com)
3. Set `MONGODB_URI` environment variable (MongoDB Atlas recommended)
4. Deploy automatically — blueprint included (`render.yaml`)

### Docker
```bash
docker build -t ai-tool-discovery .
docker run -p 3000:3000 -e MONGODB_URI=your_uri ai-tool-discovery
```

---

## 👤 Admin Access

- **URL**: `/admin`
- **Username**: `CallmeJack`
- **Password**: `Jack@2026`

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

Crafted & engineered by **Mr. Jack** — Architect of the AI Tool Discovery Engine.

Built with ❤️ for the AI community.
