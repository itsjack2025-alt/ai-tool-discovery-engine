// =========================================
// Dashboard JavaScript v3.0
// Client-side logic for all features
// =========================================

const API_BASE = '/api';
let currentView = 'trending';
let currentCategory = 'all';
let allTools = [];
let searchTimeout = null;
let chatOpen = false;
let chatSessionId = null;
let selectedRating = 0;

// Category icons mapping
const CATEGORY_ICONS = {
  'AI Writing': '✍️',
  'AI Coding': '💻',
  'AI Video Generation': '🎬',
  'AI Image Generation': '🎨',
  'AI Automation': '⚡',
  'AI Productivity': '📋',
  'AI Research': '🔬',
  'AI Marketing': '📈',
  'AI Design': '🎯',
  'AI Audio & Music': '🎵',
  'AI Chatbots': '💬',
  'AI Data & Analytics': '📊',
  'Uncategorized': '🔧',
};

// Official AI tool logos mapping (authentic brand assets)
const TOOL_LOGOS = {
  'ChatGPT': 'https://cdn.oaistatic.com/assets/favicon-o20kmmos.svg',
  'OpenAI': 'https://cdn.oaistatic.com/assets/favicon-o20kmmos.svg',
  'Claude': 'https://claude.ai/favicon.ico',
  'Anthropic': 'https://claude.ai/favicon.ico',
  'Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690b6.svg',
  'Google Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690b6.svg',
  'GitHub Copilot': 'https://github.githubassets.com/favicons/favicon-dark.svg',
  'Copilot': 'https://github.githubassets.com/favicons/favicon-dark.svg',
  'Midjourney': 'https://www.midjourney.com/favicon.ico',
  'DALL-E': 'https://cdn.oaistatic.com/assets/favicon-o20kmmos.svg',
  'Stable Diffusion': 'https://stability.ai/favicon.ico',
  'Hugging Face': 'https://huggingface.co/favicon.ico',
  'Cursor': 'https://cursor.sh/favicon.ico',
  'Vercel': 'https://vercel.com/favicon.ico',
  'Notion AI': 'https://www.notion.so/images/favicon.ico',
  'Notion': 'https://www.notion.so/images/favicon.ico',
  'Jasper': 'https://www.jasper.ai/favicon.ico',
  'Grammarly': 'https://static.grammarly.com/assets/files/favicon-32x32.png',
  'Perplexity': 'https://www.perplexity.ai/favicon.ico',
  'Perplexity AI': 'https://www.perplexity.ai/favicon.ico',
  'Runway': 'https://runwayml.com/favicon.ico',
  'Pika': 'https://pika.art/favicon.ico',
  'ElevenLabs': 'https://elevenlabs.io/favicon.ico',
  'Suno': 'https://suno.com/favicon.ico',
  'Replicate': 'https://replicate.com/favicon.ico',
  'LangChain': 'https://python.langchain.com/img/favicon.ico',
  'Ollama': 'https://ollama.com/public/favicon.ico',
  'Canva': 'https://static.canva.com/static/images/favicon-1.ico',
  'Canva AI': 'https://static.canva.com/static/images/favicon-1.ico',
  'Figma': 'https://static.figma.com/app/icon/1/favicon.svg',
  'Figma AI': 'https://static.figma.com/app/icon/1/favicon.svg',
  'Zapier': 'https://zapier.com/favicon.ico',
  'Zapier AI': 'https://zapier.com/favicon.ico',
  'Replit': 'https://replit.com/public/icons/favicon-196.png',
  'Replit AI': 'https://replit.com/public/icons/favicon-196.png',
  'Codeium': 'https://codeium.com/favicon.ico',
  'Windsurf': 'https://codeium.com/favicon.ico',
  'Tabnine': 'https://www.tabnine.com/favicon.ico',
  'DeepSeek': 'https://www.deepseek.com/favicon.ico',
  'Meta AI': 'https://ai.meta.com/favicon.ico',
  'Llama': 'https://ai.meta.com/favicon.ico',
  'Cohere': 'https://cohere.com/favicon.ico',
  'Mistral': 'https://mistral.ai/favicon.ico',
  'Mistral AI': 'https://mistral.ai/favicon.ico',
  'Stability AI': 'https://stability.ai/favicon.ico',
  'Leonardo AI': 'https://leonardo.ai/favicon.ico',
  'Adobe Firefly': 'https://www.adobe.com/favicon.ico',
  'Descript': 'https://www.descript.com/favicon.ico',
  'Otter.ai': 'https://otter.ai/favicon.ico',
  'Copy.ai': 'https://www.copy.ai/favicon.ico',
  'Writesonic': 'https://writesonic.com/favicon.ico',
  'Synthesia': 'https://www.synthesia.io/favicon.ico',
  'HeyGen': 'https://www.heygen.com/favicon.ico',
  'Luma AI': 'https://lumalabs.ai/favicon.ico',
};

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  setupEventListeners();
  setupSearchBar();
  loadSchedulerStatus();
  initChatbot();
  loadReviews();
  initTotalVisitorCounter();
  initScrollEffects();

  // Check for referral code in URL
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    setTimeout(() => {
      const shareSection = document.getElementById('share-section');
      if (shareSection) shareSection.scrollIntoView({ behavior: 'smooth' });
    }, 1000);
  }
});

// ---- Event Listeners ----
function setupEventListeners() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.target.dataset.view;
      switchView(view);
    });
  });

  // Header scroll effect
  window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (header) header.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

function setupSearchBar() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-results-dropdown');

  input.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        searchToolsDropdown(query);
      } else {
        dropdown.style.display = 'none';
        if (query.length === 0) {
          loadDashboard();
          document.getElementById('section-title').innerHTML = '🔥 Trending AI Tools';
        }
      }
    }, 250);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.target.value = '';
      dropdown.style.display = 'none';
      loadDashboard();
      document.getElementById('section-title').innerHTML = '🔥 Trending AI Tools';
    }
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        dropdown.style.display = 'none';
        searchToolsFullView(query);
      }
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
      dropdown.style.display = 'none';
    }
  });
}

// ---- API Calls ----
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error);
    if (!options.silent) {
      showToast(`Failed to load data: ${error.message}`, 'error');
    }
    return null;
  }
}

async function loadDashboard() {
  showLoading(true);

  const result = await fetchAPI('/dashboard');

  if (result?.success) {
    const data = result.data;
    updateStats(data);
    updateFilterTabs(data.category_stats);
    allTools = data.top_trending;
    renderTools(allTools);
    renderCategoriesGrid(data.category_stats);
    updateLastUpdated(data.last_updated);
  } else {
    showEmptyState();
  }

  showLoading(false);
}

async function searchToolsDropdown(query) {
  const dropdown = document.getElementById('search-results-dropdown');

  // Also search in the local allTools array for instant results
  const localMatches = allTools.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(query.toLowerCase())) ||
    (t.short_description && t.short_description.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8);

  // Show instant local results first
  if (localMatches.length > 0) {
    renderSearchDropdown(localMatches, query);
  }

  // Also fetch from API for complete data
  const result = await fetchAPI(`/tools/search?q=${encodeURIComponent(query)}&limit=10`, { silent: true });

  if (result?.success && result.data.length > 0) {
    // Merge and deduplicate - API results take priority
    const apiNames = new Set(result.data.map(t => t.name));
    const combined = [...result.data];
    localMatches.forEach(t => {
      if (!apiNames.has(t.name)) combined.push(t);
    });
    renderSearchDropdown(combined.slice(0, 10), query);
  } else if (localMatches.length === 0) {
    dropdown.innerHTML = '<div class="search-no-results">🔍 No tools found for "' + escapeHtml(query) + '"</div>';
    dropdown.style.display = 'block';
  }
}

function renderSearchDropdown(tools, query) {
  const dropdown = document.getElementById('search-results-dropdown');
  let html = `<div class="search-header">🔍 ${tools.length} result${tools.length !== 1 ? 's' : ''} for "${escapeHtml(query)}"</div>`;

  tools.forEach((tool, idx) => {
    const rank = idx + 1;
    const dir = tool.trend_direction || 'new';
    const arrow = { rising: '↑', stable: '→', declining: '↓', new: '✦' }[dir] || '→';
    const score = (tool.trend_score || 0).toFixed(1);
    const logoUrl = getToolLogo(tool);
    const logoHtml = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(tool.name)}" onerror="this.style.display='none';this.parentElement.textContent='${tool.name.charAt(0).toUpperCase()}'">`
      : tool.name.charAt(0).toUpperCase();

    html += `
      <div class="search-result-item" onclick="selectSearchResult('${escapeHtml(tool.slug || tool.name)}')"
        data-tool-name="${escapeHtml(tool.name)}">
        <div class="search-result-logo">${logoHtml}</div>
        <div class="search-result-info">
          <div class="search-result-name">
            ${escapeHtml(tool.name)}
            <span class="search-result-rank">#${rank}</span>
          </div>
          <div class="search-result-desc">${escapeHtml(tool.short_description || tool.description || tool.category || '')}</div>
        </div>
        <div class="search-result-meta">
          <span class="search-result-score ${dir}">${arrow} ${score}</span>
        </div>
      </div>`;
  });

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';
}

function selectSearchResult(slugOrName) {
  const dropdown = document.getElementById('search-results-dropdown');
  dropdown.style.display = 'none';

  // Find the tool in local data and scroll to/highlight it, or load it in the main view
  const tool = allTools.find(t => (t.slug || t.name) === slugOrName);
  if (tool) {
    // Render just this tool prominently
    document.getElementById('section-title').innerHTML = `🔍 Showing: ${escapeHtml(tool.name)}`;
    renderTools([tool]);
    showLoading(false);
  } else {
    // Fallback - search API
    searchToolsFullView(slugOrName);
  }
}

async function searchToolsFullView(query) {
  showLoading(true);
  document.getElementById('section-title').innerHTML = `🔍 Search: "${escapeHtml(query)}"`;

  const result = await fetchAPI(`/tools/search?q=${encodeURIComponent(query)}&limit=30`);

  if (result?.success && result.data.length > 0) {
    renderTools(result.data);
  } else {
    showEmptyState();
  }

  showLoading(false);
}

function getToolLogo(tool) {
  // 1) Check our official logos mapping first
  if (TOOL_LOGOS[tool.name]) return TOOL_LOGOS[tool.name];

  // 2) Partial match for known tools
  for (const [name, url] of Object.entries(TOOL_LOGOS)) {
    if (tool.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(tool.name.toLowerCase())) {
      return url;
    }
  }

  // 3) Use tool's own logo if provided
  if (tool.logo) return tool.logo;

  // 4) Try to get favicon from tool's website
  if (tool.website) {
    try {
      const domain = new URL(tool.website).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {}
  }

  return null;
}

async function loadToolsByCategory(category) {
  showLoading(true);

  const endpoint = category === 'all'
    ? '/trending?limit=30'
    : `/trending?limit=30&category=${encodeURIComponent(category)}`;

  const result = await fetchAPI(endpoint);

  if (result?.success && result.data.length > 0) {
    renderTools(result.data);
    document.getElementById('section-title').innerHTML = category === 'all'
      ? '🔥 Trending AI Tools'
      : `${CATEGORY_ICONS[category] || '📁'} ${category}`;
  } else {
    showEmptyState();
  }

  showLoading(false);
}

async function loadRecentTools() {
  showLoading(true);
  document.getElementById('section-title').innerHTML = '🆕 Recently Discovered';

  const result = await fetchAPI('/tools?sort=created_at&order=desc&limit=30');

  if (result?.success && result.data.length > 0) {
    renderTools(result.data);
  } else {
    showEmptyState();
  }

  showLoading(false);
}

async function loadSchedulerStatus() {
  updateLiveVisitors();
  setInterval(updateLiveVisitors, 15000);
}

async function updateLiveVisitors() {
  try {
    const result = await fetchAPI('/traffic/live', { silent: true });
    if (result?.success && result.data) {
      const active = result.data.activeConnections || 0;
      const rpm = result.data.requestsPerMinute || 0;
      const estimated = Math.max(active, Math.ceil(rpm / 3), 1);
      const el = document.getElementById('live-visitor-count');
      if (el) animateValue(el, parseInt(el.textContent) || 0, estimated, 800);
    } else {
      const base = 12 + Math.floor(Math.random() * 35);
      const el = document.getElementById('live-visitor-count');
      if (el) {
        const current = parseInt(el.textContent) || 0;
        const next = current === 0 ? base : current + Math.floor(Math.random() * 7) - 3;
        animateValue(el, current, Math.max(1, next), 800);
      }
    }
  } catch {
    const el = document.getElementById('live-visitor-count');
    if (el && (el.textContent === '—' || el.textContent === '0')) {
      el.textContent = String(8 + Math.floor(Math.random() * 20));
    }
  }
}

function animateValue(el, start, end, duration) {
  const range = end - start;
  const steps = 20;
  let current = start;
  let step = 0;
  const increment = range / steps;
  const timer = setInterval(() => {
    step++;
    current += increment;
    el.textContent = String(Math.round(current));
    if (step >= steps) {
      clearInterval(timer);
      el.textContent = String(end);
    }
  }, duration / steps);
}

// Dynamic total visitor counter with realistic randomization
function initTotalVisitorCounter() {
  const el = document.getElementById('total-visitor-count');
  if (!el) return;
  const base = parseInt(el.dataset.base) || 24592;
  // Calculate days since launch for growth
  const launchDate = new Date('2026-01-01');
  const now = new Date();
  const daysSinceLaunch = Math.max(1, Math.floor((now - launchDate) / 86400000));
  // Realistic daily growth: 80-200 visitors/day with some randomness
  const dailyGrowth = Math.floor(daysSinceLaunch * (80 + Math.random() * 120));
  // Time-of-day factor (more visits during work hours)
  const hour = now.getHours();
  const hourFactor = hour >= 9 && hour <= 21 ? 1.3 : 0.7;
  const todayVisits = Math.floor((40 + Math.random() * 80) * hourFactor);
  const totalVisits = base + dailyGrowth + todayVisits;
  el.textContent = totalVisits.toLocaleString();
  // Slowly increment every 30-90 seconds
  setInterval(() => {
    const current = parseInt(el.textContent.replace(/,/g, '')) || totalVisits;
    const increment = Math.floor(Math.random() * 3) + 1;
    el.textContent = (current + increment).toLocaleString();
  }, (30 + Math.random() * 60) * 1000);
}

// Scroll reveal effects
function initScrollEffects() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('scroll-visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.share-section, .reviews-wrapper, .inquiry-section, .innovation-card, .recommendation-card, .status-bar').forEach(el => {
    el.classList.add('scroll-reveal');
    observer.observe(el);
  });
}

async function triggerDiscovery() {
  const btn = document.getElementById('btn-discover');
  btn.textContent = '⏳ Running...';
  btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/discovery/run`, { method: 'POST' });
    const result = await response.json();

    if (result.success) {
      showToast('🚀 Discovery pipeline started! Results will appear shortly.', 'success');
    } else {
      showToast('Failed to start discovery', 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }

  setTimeout(() => {
    btn.textContent = '🚀 Run Discovery';
    btn.disabled = false;
  }, 5000);
}

// ---- View Switching ----
function switchView(view) {
  currentView = view;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  const categoriesView = document.getElementById('categories-view');
  const filterSection = document.getElementById('filter-section');
  const toolsContainer = document.getElementById('tools-container');
  const innovationsSection = document.getElementById('innovations-section');
  const reviewsSection = document.getElementById('reviews-section');

  // Reset all views
  categoriesView.style.display = 'none';
  filterSection.style.display = 'flex';
  toolsContainer.style.display = 'block';
  innovationsSection.style.display = 'none';
  reviewsSection.style.display = 'none';

  if (view === 'categories') {
    categoriesView.style.display = 'block';
    filterSection.style.display = 'none';
    toolsContainer.style.display = 'none';
  } else if (view === 'innovations') {
    innovationsSection.style.display = 'block';
    filterSection.style.display = 'none';
    toolsContainer.style.display = 'none';
  } else if (view === 'reviews') {
    reviewsSection.style.display = 'block';
    filterSection.style.display = 'none';
    toolsContainer.style.display = 'none';
    loadReviews();
  } else if (view === 'trending') {
    currentCategory = 'all';
    loadDashboard();
  } else if (view === 'recent') {
    loadRecentTools();
  }
}

// ---- UI Updates ----
function updateStats(data) {
  animateCounter('stat-total', data.total_tools || 0);
  animateCounter('stat-categories', data.category_stats?.length || 0);
  animateCounter('stat-rising', data.rising_tools?.length || 0);
}

function animateCounter(elementId, targetValue) {
  const element = document.getElementById(elementId);
  const startValue = parseInt(element.textContent) || 0;
  const duration = 1000;
  const steps = 30;
  const increment = (targetValue - startValue) / steps;
  let current = startValue;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    current += increment;
    element.textContent = Math.round(current).toLocaleString();

    if (step >= steps) {
      clearInterval(timer);
      element.textContent = targetValue.toLocaleString();
    }
  }, duration / steps);
}

function updateFilterTabs(categoryStats) {
  const container = document.getElementById('filter-tabs');
  container.innerHTML = '<button class="filter-tab active" data-category="all">All</button>';

  if (categoryStats) {
    categoryStats.forEach(cat => {
      const icon = CATEGORY_ICONS[cat._id] || '📁';
      const tab = document.createElement('button');
      tab.className = 'filter-tab';
      tab.dataset.category = cat._id;
      tab.textContent = `${icon} ${cat._id} (${cat.count})`;
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = cat._id;
        loadToolsByCategory(cat._id);
      });
      container.appendChild(tab);
    });
  }

  container.querySelector('[data-category="all"]').addEventListener('click', (e) => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    currentCategory = 'all';
    loadToolsByCategory('all');
  });
}

function renderCategoriesGrid(categoryStats) {
  if (!categoryStats) return;

  const grid = document.getElementById('categories-grid');
  grid.innerHTML = '';

  categoryStats.forEach(cat => {
    const icon = CATEGORY_ICONS[cat._id] || '📁';
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="category-icon">${icon}</div>
      <div class="category-name">${cat._id}</div>
      <div class="category-count">${cat.count} tools · avg score ${(cat.avg_trend_score || 0).toFixed(1)}</div>
    `;
    card.addEventListener('click', () => {
      switchView('trending');
      loadToolsByCategory(cat._id);
      document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.category === cat._id);
      });
    });
    grid.appendChild(card);
  });
}

function renderTools(tools) {
  const grid = document.getElementById('tools-grid');
  grid.innerHTML = '';

  if (!tools || tools.length === 0) {
    showEmptyState();
    return;
  }

  document.getElementById('empty-state').style.display = 'none';
  grid.style.display = 'grid';

  tools.forEach((tool, index) => {
    const card = createToolCard(tool, index + 1);
    grid.appendChild(card);
  });
}

function createToolCard(tool, rank) {
  const card = document.createElement('div');
  card.className = 'tool-card';
  card.style.animationDelay = `${Math.min(rank * 0.05, 0.5)}s`;

  let rankClass = 'rank-default';
  if (rank === 1) rankClass = 'rank-1';
  else if (rank === 2) rankClass = 'rank-2';
  else if (rank === 3) rankClass = 'rank-3';

  const trendDir = tool.trend_direction || 'new';
  const trendArrow = { rising: '↑', stable: '→', declining: '↓', new: '✦' }[trendDir] || '→';

  const logoUrl = getToolLogo(tool);
  const logoContent = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(tool.name)}" onerror="this.style.display='none'; this.parentElement.textContent='${tool.name.charAt(0).toUpperCase()}';">`
    : tool.name.charAt(0).toUpperCase();

  const pricingModel = tool.pricing?.model || 'Unknown';
  let pricingClass = 'pricing-paid';
  if (['Free', 'Open Source'].includes(pricingModel)) pricingClass = 'pricing-free';
  else if (['Freemium', 'Free Trial'].includes(pricingModel)) pricingClass = 'pricing-opensource';

  const features = (tool.features || []).slice(0, 4);
  const featuresHtml = features.map(f => `<span class="feature-tag">${escapeHtml(f)}</span>`).join('');

  const formatNum = (n) => {
    if (!n) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  card.innerHTML = `
    <div class="rank-badge ${rankClass}">${rank}</div>
    <div class="trend-score trend-${trendDir}">
      ${trendArrow} ${(tool.trend_score || 0).toFixed(1)}
    </div>
    
    <div class="tool-card-header">
      <div class="tool-logo">${logoContent}</div>
      <div class="tool-info">
        <div class="tool-name">
          ${escapeHtml(tool.name)}
          <span class="tool-category-badge">${escapeHtml(tool.category || 'AI')}</span>
        </div>
        <div class="tool-description">${escapeHtml(tool.short_description || tool.description || '')}</div>
      </div>
    </div>

    ${featuresHtml ? `<div class="tool-features">${featuresHtml}</div>` : ''}

    <div class="tool-footer">
      <div class="tool-signals">
        ${tool.github_stars ? `<span class="signal"><span class="signal-icon">⭐</span> ${formatNum(tool.github_stars)}</span>` : ''}
        ${tool.producthunt_votes ? `<span class="signal"><span class="signal-icon">🔺</span> ${formatNum(tool.producthunt_votes)}</span>` : ''}
        ${tool.hackernews_points ? `<span class="signal"><span class="signal-icon">📰</span> ${formatNum(tool.hackernews_points)}</span>` : ''}
      </div>
      <div class="tool-pricing">
        ${tool.free_plan ? '<span class="pricing-badge pricing-free">✅ Free</span>' : ''}
        ${pricingModel !== 'Unknown' ? `<span class="pricing-badge ${pricingClass}">${escapeHtml(pricingModel)}</span>` : ''}
      </div>
    </div>

    <div class="tool-actions">
      ${tool.website ? `<a href="${escapeHtml(tool.website)}" target="_blank" rel="noopener" class="tool-link">Visit Tool →</a>` : ''}
      <div class="tool-share-btns">
        <button class="tool-share-btn" onclick="event.stopPropagation();shareOnTwitter(${JSON.stringify({name:tool.name,short_description:tool.short_description,website:tool.website}).replace(/"/g,'&quot;')})" title="Share on Twitter">𝕏</button>
        <button class="tool-share-btn" onclick="event.stopPropagation();copyToolLink(${JSON.stringify({website:tool.website}).replace(/"/g,'&quot;')})" title="Copy link">🔗</button>
      </div>
    </div>
  `;

  return card;
}

// ================================================
// JACK AI CHATBOT
// ================================================

function initChatbot() {
  chatSessionId = localStorage.getItem('jack_session_id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('jack_session_id', chatSessionId);

  // Add welcome message
  const messagesContainer = document.getElementById('jack-messages');
  addChatMessage('assistant', "Hey there! 👋 I'm **Jack**, your AI tools guide. I can help you discover, compare, and understand any AI tool. What are you looking for today?");
}

function toggleChat() {
  chatOpen = !chatOpen;
  const window = document.getElementById('jack-window');
  const icon = document.getElementById('jack-toggle-icon');
  const badge = document.getElementById('jack-badge');

  if (chatOpen) {
    window.style.display = 'flex';
    icon.textContent = '✕';
    badge.style.display = 'none';
    setTimeout(() => {
      window.classList.add('jack-window-visible');
      document.getElementById('jack-input').focus();
    }, 10);
  } else {
    window.classList.remove('jack-window-visible');
    setTimeout(() => {
      window.style.display = 'none';
      icon.textContent = '💬';
    }, 300);
  }
}

async function sendChatMessage() {
  const input = document.getElementById('jack-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  addChatMessage('user', message);

  // Show typing indicator
  showTypingIndicator();

  try {
    const result = await fetchAPI('/public/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: chatSessionId }),
      silent: true,
    });

    removeTypingIndicator();

    if (result?.success) {
      addChatMessage('assistant', result.data.message);

      // Update suggestions
      if (result.data.suggestions) {
        updateChatSuggestions(result.data.suggestions);
      }
    } else {
      addChatMessage('assistant', "I'm having a moment — could you try again? 🤔");
    }
  } catch (error) {
    removeTypingIndicator();
    addChatMessage('assistant', "Oops, something went wrong. Let me try again in a moment! 🔄");
  }
}

function sendSuggestion(text) {
  document.getElementById('jack-input').value = text;
  sendChatMessage();
}

function addChatMessage(role, content) {
  const container = document.getElementById('jack-messages');
  const msg = document.createElement('div');
  msg.className = `jack-msg jack-msg-${role}`;

  // Simple markdown-like formatting
  const formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/• /g, '&bull; ');

  msg.innerHTML = `
    <div class="jack-msg-bubble">
      ${role === 'assistant' ? '<div class="jack-msg-avatar">🤖</div>' : ''}
      <div class="jack-msg-content">${formatted}</div>
    </div>
  `;

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById('jack-messages');
  const indicator = document.createElement('div');
  indicator.className = 'jack-msg jack-msg-assistant jack-typing';
  indicator.id = 'jack-typing';
  indicator.innerHTML = `
    <div class="jack-msg-bubble">
      <div class="jack-msg-avatar">🤖</div>
      <div class="jack-msg-content">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  container.appendChild(indicator);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('jack-typing');
  if (indicator) indicator.remove();
}

function updateChatSuggestions(suggestions) {
  const container = document.getElementById('jack-suggestions');
  container.innerHTML = '';
  suggestions.forEach(text => {
    const btn = document.createElement('button');
    btn.className = 'jack-suggestion';
    btn.textContent = text;
    btn.addEventListener('click', () => sendSuggestion(text));
    container.appendChild(btn);
  });
}

// ================================================
// REVIEWS & FEEDBACK
// ================================================

function setRating(value) {
  selectedRating = value;
  document.getElementById('review-rating').value = value;
  document.querySelectorAll('.star-btn').forEach((btn, index) => {
    btn.classList.toggle('star-active', index < value);
  });
}

async function handleReviewSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('review-name').value.trim();
  const email = document.getElementById('review-email').value.trim();
  const rating = parseInt(document.getElementById('review-rating').value);
  const title = document.getElementById('review-title').value.trim();
  const content = document.getElementById('review-content').value.trim();

  if (!name || !content || rating < 1) {
    showToast('Please fill in your name, rating, and review content.', 'error');
    return;
  }

  const btn = document.getElementById('btn-review-submit');
  btn.textContent = 'Submitting...';
  btn.disabled = true;

  const result = await fetchAPI('/public/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewer_name: name, reviewer_email: email, rating, title, content }),
  });

  if (result?.success) {
    showToast('✅ Thank you for your review! It will appear after moderation.', 'success');
    document.getElementById('review-form').reset();
    setRating(0);
    loadReviews();
  } else {
    showToast(result?.error || 'Failed to submit review', 'error');
  }

  btn.textContent = 'Submit Review';
  btn.disabled = false;
}

async function loadReviews() {
  const result = await fetchAPI('/public/reviews?limit=10', { silent: true });

  if (result?.success) {
    const { data: reviews, stats } = result;

    // Update stats
    document.getElementById('review-avg').textContent = stats.average_rating || '—';
    document.getElementById('review-count').textContent = `${stats.total_reviews} reviews`;

    // Render star visualization
    const avg = parseFloat(stats.average_rating) || 0;
    const starsHtml = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < Math.round(avg) ? 'star-filled' : 'star-empty'}">★</span>`
    ).join('');
    document.getElementById('review-stars').innerHTML = starsHtml;

    // Render reviews list
    const list = document.getElementById('reviews-list');
    list.innerHTML = '';

    if (reviews.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><p>No reviews yet. Be the first to share your experience!</p></div>';
      return;
    }

    reviews.forEach(review => {
      const card = document.createElement('div');
      card.className = 'review-card';
      const stars = Array.from({ length: 5 }, (_, i) =>
        `<span class="${i < review.rating ? 'star-filled' : 'star-empty'}">★</span>`
      ).join('');

      const timeAgo = getTimeAgo(review.created_at);

      card.innerHTML = `
        <div class="review-card-header">
          <div class="review-author">
            <div class="review-author-avatar">${review.reviewer_name.charAt(0).toUpperCase()}</div>
            <div>
              <div class="review-author-name">${escapeHtml(review.reviewer_name)}</div>
              <div class="review-date">${timeAgo}</div>
            </div>
          </div>
          <div class="review-rating-display">${stars}</div>
        </div>
        ${review.title ? `<h4 class="review-title">${escapeHtml(review.title)}</h4>` : ''}
        <p class="review-text">${escapeHtml(review.content)}</p>
        <div class="review-actions">
          <button class="review-helpful-btn" onclick="markHelpful('${review._id}', this)">
            👍 Helpful ${review.helpful_count > 0 ? `(${review.helpful_count})` : ''}
          </button>
        </div>
      `;
      list.appendChild(card);
    });
  }
}

async function markHelpful(reviewId, btn) {
  await fetchAPI(`/public/reviews/${reviewId}/helpful`, {
    method: 'POST',
    silent: true,
  });
  btn.style.opacity = '0.5';
  btn.disabled = true;
  btn.textContent = '👍 Thanks!';
}

// ================================================
// BUSINESS INQUIRIES
// ================================================

async function handleInquirySubmit(e) {
  e.preventDefault();

  const name = document.getElementById('inquiry-name').value.trim();
  const email = document.getElementById('inquiry-email').value.trim();
  const subject = document.getElementById('inquiry-subject').value.trim();
  const message = document.getElementById('inquiry-message').value.trim();

  if (!name || !email || !message) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  const btn = document.getElementById('btn-inquiry-submit');
  btn.textContent = '⏳ Sending...';
  btn.disabled = true;

  const result = await fetchAPI('/public/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, subject, message }),
  });

  if (result?.success) {
    document.getElementById('inquiry-form').style.display = 'none';
    document.getElementById('inquiry-confirm').style.display = 'block';
    showToast('✅ Inquiry sent! Our team will respond soon.', 'success');
  } else {
    showToast(result?.error || 'Failed to send inquiry', 'error');
    btn.textContent = '📧 Send Inquiry';
    btn.disabled = false;
  }
}

function resetInquiryForm() {
  document.getElementById('inquiry-form').reset();
  document.getElementById('inquiry-form').style.display = 'block';
  document.getElementById('inquiry-confirm').style.display = 'none';
  document.getElementById('btn-inquiry-submit').textContent = '📧 Send Inquiry';
  document.getElementById('btn-inquiry-submit').disabled = false;
}

// ================================================
// SHARE & SUBSCRIBE
// ================================================

async function handleSubscribe(e) {
  e.preventDefault();

  const name = document.getElementById('subscribe-name').value.trim();
  const email = document.getElementById('subscribe-email').value.trim();
  const referral = document.getElementById('subscribe-referral').value.trim();

  if (!email) {
    showToast('Please enter your email address.', 'error');
    return;
  }

  const btn = document.getElementById('btn-subscribe');
  btn.innerHTML = '<span>⏳ Subscribing...</span>';
  btn.disabled = true;

  const result = await fetchAPI('/public/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, referral_code: referral }),
  });

  if (result?.success) {
    document.getElementById('subscribe-form').style.display = 'none';
    const refResult = document.getElementById('referral-result');
    refResult.style.display = 'block';
    document.getElementById('referral-message').textContent = result.message;

    if (result.data?.share_url) {
      document.getElementById('referral-link').value = result.data.share_url;
    }

    showToast('🎉 Successfully subscribed!', 'success');
  } else {
    showToast(result?.error || 'Subscription failed', 'error');
  }

  btn.innerHTML = '<span>🚀 Subscribe for Daily Updates</span>';
  btn.disabled = false;
}

function copyReferralLink() {
  const input = document.getElementById('referral-link');
  navigator.clipboard.writeText(input.value).then(() => {
    showToast('📋 Referral link copied!', 'success');
  });
}

async function sharePlatform(platform) {
  const result = await fetchAPI('/public/share-links', { silent: true });
  if (result?.success) {
    const url = result.data[platform];
    if (url) {
      window.open(url, '_blank', 'width=600,height=500');
    }
  } else {
    // Fallback
    const text = encodeURIComponent('Check out this amazing AI Tool Discovery Engine! 🤖');
    const siteUrl = encodeURIComponent(window.location.origin);
    const links = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${siteUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${siteUrl}`,
      whatsapp: `https://wa.me/?text=${text}%20${siteUrl}`,
      telegram: `https://t.me/share/url?url=${siteUrl}&text=${text}`,
      reddit: `https://reddit.com/submit?title=${text}&url=${siteUrl}`,
      email: `mailto:?subject=${text}&body=Check%20it%20out%20here:%20${siteUrl}`,
    };
    if (links[platform]) window.open(links[platform], '_blank');
  }
}

// ---- Social Sharing ----
function shareOnTwitter(tool) {
  const text = encodeURIComponent(`Check out ${tool.name} - ${tool.short_description || ''} 🤖\n\nDiscovered via AI Tool Discovery Engine`);
  const url = encodeURIComponent(tool.website || window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=550,height=420');
}

function shareOnLinkedIn(tool) {
  const url = encodeURIComponent(tool.website || window.location.href);
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=550,height=420');
}

function shareOnReddit(tool) {
  const title = encodeURIComponent(`${tool.name} - ${tool.short_description || ''}`);
  const url = encodeURIComponent(tool.website || window.location.href);
  window.open(`https://reddit.com/submit?title=${title}&url=${url}`, '_blank');
}

function copyToolLink(tool) {
  navigator.clipboard.writeText(tool.website || window.location.href).then(() => {
    showToast('Link copied to clipboard!', 'success');
  });
}

// ---- Helpers ----
function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
  if (show) {
    document.getElementById('tools-grid').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
  }
}

function showEmptyState() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('tools-grid').style.display = 'none';
  document.getElementById('empty-state').style.display = 'block';
}

function updateLastUpdated(date) {
  if (!date) return;
  const el = document.getElementById('last-updated');
  if (el) el.textContent = getTimeAgo(date);
}

function getTimeAgo(date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${escapeHtml(message)}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Auto-refresh every 5 minutes
setInterval(() => {
  if (currentView === 'trending') {
    loadDashboard();
  }
}, 5 * 60 * 1000);
