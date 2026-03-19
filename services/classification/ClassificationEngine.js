// =========================================
// AI Classification Engine
// NLP-based automatic tool categorization
// =========================================
const natural = require('natural');
const { TOOL_CATEGORIES } = require('../../config/constants');
const logger = require('../../utils/logger');

class ClassificationEngine {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    this.isTrained = false;
    this.trainClassifier();
  }

  /**
   * Train the Bayes classifier with category keyword data
   */
  trainClassifier() {
    logger.info('[Classifier] Training NLP classifier...');

    for (const [category, config] of Object.entries(TOOL_CATEGORIES)) {
      // Train with category keywords
      for (const keyword of config.keywords) {
        this.classifier.addDocument(keyword, category);
        // Add variations
        this.classifier.addDocument(`${keyword} tool`, category);
        this.classifier.addDocument(`AI ${keyword}`, category);
        this.classifier.addDocument(`${keyword} platform`, category);
        this.classifier.addDocument(`${keyword} software`, category);
      }

      // Train with subcategories
      for (const sub of config.subcategories) {
        this.classifier.addDocument(sub.toLowerCase(), category);
        this.classifier.addDocument(`${sub.toLowerCase()} tool`, category);
      }

      // Train with full category descriptions
      this.classifier.addDocument(`${category} tools and applications`, category);
      this.classifier.addDocument(`best ${category.toLowerCase()} software`, category);
    }

    // Train more specific phrases for better accuracy
    const additionalTraining = {
      'AI Writing': [
        'generate blog posts', 'write articles automatically', 'content creation assistant',
        'copywriting generator', 'grammar checker AI', 'rewrite text', 'SEO content writer',
      ],
      'AI Coding': [
        'autocomplete code', 'generate code from prompts', 'fix bugs automatically',
        'pair programmer AI', 'generate tests', 'code documentation generator',
        'pull request review', 'refactor code',
      ],
      'AI Video Generation': [
        'create videos from text', 'animate images', 'video synthesis',
        'automatic video editing', 'deepfake generation', 'video enhancement',
      ],
      'AI Image Generation': [
        'create images from text prompts', 'generate art', 'photo editing AI',
        'remove background', 'upscale images', 'generate logos',
        'create illustrations', 'style transfer',
      ],
      'AI Automation': [
        'automate repetitive tasks', 'workflow builder', 'connect apps',
        'robotic process automation', 'trigger actions', 'no code automation',
      ],
      'AI Productivity': [
        'meeting notes transcription', 'email summarizer', 'task prioritization',
        'smart calendar', 'document organization', 'personal AI assistant',
      ],
      'AI Research': [
        'analyze research papers', 'literature review assistant', 'data exploration',
        'scientific writing', 'citation manager', 'knowledge graph',
      ],
      'AI Marketing': [
        'social media scheduling', 'ad copy generator', 'email campaigns',
        'conversion optimization', 'audience analytics', 'brand monitoring',
      ],
      'AI Design': [
        'generate UI mockups', 'design system generator', 'create presentations',
        'logo maker AI', 'color palette generator', 'layout suggestions',
      ],
      'AI Audio & Music': [
        'text to speech synthesis', 'music composition', 'voice cloning',
        'audio transcription', 'podcast editing', 'sound effects generation',
      ],
      'AI Chatbots': [
        'customer service chatbot', 'build conversational agents', 'FAQ bot',
        'sales chatbot', 'support automation chat',
      ],
      'AI Data & Analytics': [
        'data visualization dashboard', 'SQL query generator', 'data cleaning',
        'predictive modeling', 'business intelligence AI', 'chart generator',
      ],
    };

    for (const [category, phrases] of Object.entries(additionalTraining)) {
      for (const phrase of phrases) {
        this.classifier.addDocument(phrase, category);
      }
    }

    this.classifier.train();
    this.isTrained = true;
    logger.info(`[Classifier] ✅ Trained with ${Object.keys(TOOL_CATEGORIES).length} categories`);
  }

  /**
   * Classify a single tool
   */
  classify(tool) {
    const text = this.prepareText(tool);

    // Method 1: Keyword matching (highest accuracy)
    const keywordCategory = this.classifyByKeywords(text);

    // Method 2: NLP Bayes classification
    const nlpCategory = this.classifier.classify(text);

    // Method 3: TF-IDF similarity (if above methods disagree)
    const tfidfCategory = this.classifyByTfIdf(text);

    // Voting: prefer keyword match, then NLP, then TF-IDF
    const category = keywordCategory || nlpCategory || tfidfCategory || 'AI Productivity';

    // Get subcategory
    const subCategory = this.getSubCategory(text, category);

    // Get classification confidence
    const classifications = this.classifier.getClassifications(text);
    const topClassification = classifications[0];
    const confidence = topClassification
      ? Math.abs(topClassification.value) / (Math.abs(classifications[classifications.length - 1]?.value || 1))
      : 0.5;

    return {
      category,
      sub_category: subCategory,
      confidence: Math.min(confidence, 1),
      method: keywordCategory ? 'keyword' : nlpCategory ? 'nlp' : 'tfidf',
    };
  }

  /**
   * Classify a batch of tools
   */
  classifyBatch(tools) {
    logger.info(`[Classifier] Classifying ${tools.length} tools...`);
    let classified = 0;

    const results = tools.map(tool => {
      const classification = this.classify(tool);
      classified++;
      return {
        ...tool,
        category: classification.category,
        sub_category: classification.sub_category,
        classification_confidence: classification.confidence,
      };
    });

    // Log category distribution
    const distribution = {};
    results.forEach(r => {
      distribution[r.category] = (distribution[r.category] || 0) + 1;
    });

    logger.info(`[Classifier] ✅ Classified ${classified} tools:`, distribution);
    return results;
  }

  /**
   * Keyword-based classification (most reliable)
   */
  classifyByKeywords(text) {
    const lower = text.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const [category, config] of Object.entries(TOOL_CATEGORIES)) {
      let score = 0;
      for (const keyword of config.keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          score += keyword.length; // Longer matches are more specific
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
      }
    }

    return bestScore > 5 ? bestMatch : null; // Require minimum confidence
  }

  /**
   * TF-IDF based classification
   */
  classifyByTfIdf(text) {
    this.tfidf = new natural.TfIdf();

    // Add category documents
    const categories = Object.entries(TOOL_CATEGORIES);
    for (const [, config] of categories) {
      this.tfidf.addDocument(config.keywords.join(' '));
    }
    this.tfidf.addDocument(text);

    let bestScore = 0;
    let bestIdx = 0;

    // Compare input text against each category
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    for (const token of tokens) {
      this.tfidf.tfidfs(token, (i, measure) => {
        if (i < categories.length && measure > bestScore) {
          bestScore = measure;
          bestIdx = i;
        }
      });
    }

    return categories[bestIdx]?.[0] || null;
  }

  /**
   * Get subcategory within a category
   */
  getSubCategory(text, category) {
    const config = TOOL_CATEGORIES[category];
    if (!config) return null;

    const lower = text.toLowerCase();

    for (const sub of config.subcategories) {
      if (lower.includes(sub.toLowerCase())) {
        return sub;
      }
    }

    // Return first subcategory as default
    return config.subcategories[0] || null;
  }

  /**
   * Prepare text for classification
   */
  prepareText(tool) {
    const parts = [
      tool.name || '',
      tool.description || '',
      tool.short_description || '',
      ...(tool.features || []),
      ...(tool.tags || []),
    ];

    return parts.join(' ').toLowerCase().trim();
  }
}

module.exports = ClassificationEngine;
