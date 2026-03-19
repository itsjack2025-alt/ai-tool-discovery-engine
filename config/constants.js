// =========================================
// Application Constants
// =========================================

const AI_KEYWORDS = [
  'artificial intelligence', 'AI', 'machine learning', 'deep learning',
  'generative AI', 'GenAI', 'LLM', 'large language model',
  'GPT', 'ChatGPT', 'image generation', 'AI assistant',
  'automation AI', 'neural network', 'NLP', 'natural language processing',
  'computer vision', 'text-to-image', 'text-to-video', 'AI agent',
  'copilot', 'AI-powered', 'transformer', 'stable diffusion',
  'midjourney', 'AI chatbot', 'AI writing', 'AI coding',
  'prompt engineering', 'RAG', 'retrieval augmented', 'vector database',
  'embedding', 'fine-tuning', 'AI workflow', 'AI productivity',
  'AI marketing', 'AI design', 'AI research', 'AI analytics',
  'speech-to-text', 'text-to-speech', 'AI video', 'AI music',
  'AI art', 'diffusion model', 'foundation model', 'multimodal AI',
];

const TOOL_CATEGORIES = {
  'AI Writing': {
    keywords: ['writing', 'copywriting', 'content', 'blog', 'article', 'text generation', 'grammar', 'paraphrase', 'essay', 'summariz'],
    subcategories: ['Content Generation', 'Copywriting', 'Grammar & Style', 'Summarization', 'Translation', 'Blog Writing'],
  },
  'AI Coding': {
    keywords: ['coding', 'code', 'developer', 'programming', 'IDE', 'debug', 'code completion', 'code review', 'software development', 'github'],
    subcategories: ['Code Generation', 'Code Review', 'Debugging', 'Documentation', 'Testing', 'IDE Extensions'],
  },
  'AI Video Generation': {
    keywords: ['video', 'animation', 'video editing', 'video generation', 'text-to-video', 'video AI', 'motion', 'clip'],
    subcategories: ['Video Generation', 'Video Editing', 'Animation', 'Video Enhancement', 'Subtitles & Captions'],
  },
  'AI Image Generation': {
    keywords: ['image', 'photo', 'art', 'illustration', 'design', 'text-to-image', 'stable diffusion', 'midjourney', 'dall-e', 'visual'],
    subcategories: ['Image Generation', 'Photo Editing', 'Art Creation', 'Background Removal', 'Image Enhancement', 'Logo Design'],
  },
  'AI Automation': {
    keywords: ['automation', 'workflow', 'automate', 'no-code', 'low-code', 'integration', 'zapier', 'pipeline', 'RPA', 'bot'],
    subcategories: ['Workflow Automation', 'No-Code/Low-Code', 'RPA', 'Integration', 'Task Automation'],
  },
  'AI Productivity': {
    keywords: ['productivity', 'meeting', 'notes', 'schedule', 'task', 'project management', 'collaboration', 'assistant', 'organize', 'calendar'],
    subcategories: ['Meeting Assistant', 'Note Taking', 'Task Management', 'Email Assistant', 'Calendar', 'Personal Assistant'],
  },
  'AI Research': {
    keywords: ['research', 'academic', 'paper', 'citation', 'literature', 'knowledge', 'data analysis', 'scientific', 'journal', 'study'],
    subcategories: ['Literature Review', 'Data Analysis', 'Knowledge Management', 'Academic Writing', 'Citation Management'],
  },
  'AI Marketing': {
    keywords: ['marketing', 'SEO', 'social media', 'advertising', 'campaign', 'analytics', 'email marketing', 'brand', 'growth', 'conversion'],
    subcategories: ['SEO', 'Social Media', 'Email Marketing', 'Ad Generation', 'Analytics', 'Content Marketing'],
  },
  'AI Design': {
    keywords: ['design', 'UI', 'UX', 'graphic', 'layout', 'prototype', 'figma', 'mockup', 'brand', 'template'],
    subcategories: ['UI/UX Design', 'Graphic Design', 'Prototyping', 'Brand Design', 'Presentation Design'],
  },
  'AI Audio & Music': {
    keywords: ['audio', 'music', 'sound', 'voice', 'speech', 'podcast', 'text-to-speech', 'transcription', 'singing', 'song'],
    subcategories: ['Music Generation', 'Voice Synthesis', 'Transcription', 'Podcast Tools', 'Audio Editing'],
  },
  'AI Chatbots': {
    keywords: ['chatbot', 'chat', 'conversational', 'customer support', 'virtual assistant', 'dialogue', 'messaging', 'support bot'],
    subcategories: ['Customer Support', 'Sales Bot', 'Virtual Assistant', 'Knowledge Base Bot', 'Social Bot'],
  },
  'AI Data & Analytics': {
    keywords: ['data', 'analytics', 'dashboard', 'BI', 'business intelligence', 'visualization', 'insights', 'reporting', 'database', 'SQL'],
    subcategories: ['Data Visualization', 'Business Intelligence', 'Predictive Analytics', 'Data Cleaning', 'SQL Generation'],
  },
};

const PRICING_MODELS = [
  'Free',
  'Freemium',
  'Free Trial',
  'Paid',
  'Open Source',
  'Enterprise',
  'Contact for Pricing',
  'Usage-Based',
];

const TREND_WEIGHTS = {
  GITHUB_GROWTH: 0.30,
  PRODUCTHUNT_VOTES: 0.25,
  COMMUNITY_MENTIONS: 0.20,
  SEARCH_TREND: 0.15,
  FEATURE_INNOVATION: 0.10,
};

const CRAWLER_SOURCES = {
  GITHUB: 'github',
  PRODUCTHUNT: 'producthunt',
  HACKERNEWS: 'hackernews',
  DIRECTORY: 'directory',
  BLOG: 'blog',
  COMMUNITY: 'community',
};

const QUEUE_NAMES = {
  DISCOVERY: 'discovery-queue',
  NORMALIZATION: 'normalization-queue',
  CLASSIFICATION: 'classification-queue',
  TREND_ANALYSIS: 'trend-analysis-queue',
  RANKING: 'ranking-queue',
};

const JOB_TYPES = {
  CRAWL_GITHUB: 'crawl-github',
  CRAWL_PRODUCTHUNT: 'crawl-producthunt',
  CRAWL_HACKERNEWS: 'crawl-hackernews',
  CRAWL_DIRECTORIES: 'crawl-directories',
  NORMALIZE_DATA: 'normalize-data',
  CLASSIFY_TOOL: 'classify-tool',
  ANALYZE_TRENDS: 'analyze-trends',
  UPDATE_RANKINGS: 'update-rankings',
  FULL_PIPELINE: 'full-pipeline',
};

module.exports = {
  AI_KEYWORDS,
  TOOL_CATEGORIES,
  PRICING_MODELS,
  TREND_WEIGHTS,
  CRAWLER_SOURCES,
  QUEUE_NAMES,
  JOB_TYPES,
};
