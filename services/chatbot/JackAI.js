// =========================================
// Jack AI Chatbot Engine
// Intelligent assistant for AI tool discovery
// Step-by-step guidance, self-learning, contextual responses
// =========================================
const logger = require('../../utils/logger');

class JackAI {
  constructor() {
    this.name = 'Jack';
    this.personality = {
      greeting: "Hey there! 👋 I'm Jack, your AI tools guide. I can help you discover, compare, and understand any AI tool. What are you looking for today?",
      farewell: "Great chatting with you! Remember, I'm always here to help you explore AI tools. See you soon! 🚀",
    };

    // Knowledge base for common intents
    this.intents = {
      greeting: {
        patterns: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'sup', 'what\'s up', 'greetings', 'howdy'],
        responses: [
          "Hey! 👋 I'm Jack, your AI tools expert. How can I help you today?",
          "Hello there! Ready to explore some amazing AI tools? Ask me anything!",
          "Hi! 🤖 Looking for the perfect AI tool? I'm here to guide you step by step.",
        ],
      },
      trending: {
        patterns: ['trending', 'popular', 'top', 'best', 'hot', 'what\'s new', 'latest', 'most used', 'recommended'],
        responses: [
          "🔥 **Here's how to find trending tools:**\n\n**Step 1:** Check our **Trending** section on the homepage — it shows the top-ranked AI tools updated daily.\n\n**Step 2:** Use the category filters to narrow down by type (Writing, Coding, Design, etc.)\n\n**Step 3:** Look at the trend score — higher scores mean more momentum!\n\nWant me to help you find tools for a specific use case?",
        ],
      },
      categories: {
        patterns: ['category', 'categories', 'types', 'kind', 'what type', 'classification', 'groups'],
        responses: [
          "📂 **We track AI tools across many categories:**\n\n• ✍️ **AI Writing** — Content generation, copywriting\n• 💻 **AI Coding** — Code assistants, debugging\n• 🎨 **AI Image** — Art generation, editing\n• 🎬 **AI Video** — Video creation, editing\n• 🎵 **AI Audio** — Music, voice, podcasts\n• ⚡ **AI Automation** — Workflow automation\n• 📊 **AI Analytics** — Data insights\n• 💬 **AI Chatbots** — Conversational AI\n\nWhich category interests you? I'll give you detailed recommendations!",
        ],
      },
      pricing: {
        patterns: ['free', 'price', 'pricing', 'cost', 'paid', 'open source', 'budget', 'affordable', 'cheap', 'expensive'],
        responses: [
          "💰 **Let me help you find the right pricing tier:**\n\n**Step 1:** Each tool card shows its pricing model — look for badges like 'Free', 'Freemium', or 'Open Source'.\n\n**Step 2:** Use the price filter buttons above the tools grid.\n\n**Step 3:** Tools marked with ✅ Free have a no-cost option.\n\n**Pro tip:** Many premium tools offer free trials! Check the tool's website for current offers.\n\nWant me to recommend free alternatives for a specific type of AI tool?",
        ],
      },
      compare: {
        patterns: ['compare', 'comparison', 'versus', 'vs', 'difference', 'better', 'which one', 'alternative'],
        responses: [
          "🔄 **How to compare AI tools:**\n\n**Step 1:** Find the tools you're interested in using our search.\n\n**Step 2:** Look at their trend scores — this combines GitHub stars, Product Hunt votes, and community mentions.\n\n**Step 3:** Check the features listed on each card.\n\n**Step 4:** Read user reviews for real-world insights.\n\nTell me which tools you'd like to compare, and I'll highlight the key differences!",
        ],
      },
      howto: {
        patterns: ['how to', 'how do i', 'how can i', 'tutorial', 'guide', 'help me', 'teach me', 'explain', 'show me'],
        responses: [
          "📖 **I'd love to help! Here's what I can guide you through:**\n\n1. 🔍 **Finding Tools** — Search or browse by category\n2. 📊 **Understanding Rankings** — What trend scores mean\n3. ⭐ **Tool Reviews** — How to read and leave reviews\n4. 🔗 **Sharing** — Share tools with friends and family\n5. 📧 **Daily Updates** — Subscribe for trending AI alerts\n\nWhich topic would you like me to walk you through?",
        ],
      },
      subscribe: {
        patterns: ['subscribe', 'newsletter', 'email', 'updates', 'daily', 'alerts', 'notify', 'notification'],
        responses: [
          "📬 **Stay updated with daily AI tool alerts!**\n\n**Step 1:** Scroll down to the **Share & Subscribe** section.\n\n**Step 2:** Enter your email address.\n\n**Step 3:** Click 'Subscribe' to get daily digests of trending tools.\n\n**Bonus:** Share your referral link with friends! When they join, you both get exclusive weekly insights.\n\nWould you like me to explain our referral program?",
        ],
      },
      writing: {
        patterns: ['writing', 'content', 'copywriting', 'blog', 'article', 'text', 'essay', 'copy'],
        responses: [
          "✍️ **Top AI Writing Tools to explore:**\n\nHere's my step-by-step recommendation:\n\n**Step 1:** Check tools tagged 'AI Writing' in our categories.\n\n**Step 2:** Look for features like: content generation, SEO optimization, grammar checking, and tone adjustment.\n\n**Step 3:** Compare based on your needs:\n• **For blogs/articles** → Look for long-form content generators\n• **For marketing copy** → Check for conversion-focused tools\n• **For code docs** → Try AI coding assistants with doc features\n\nShall I narrow it down further?",
        ],
      },
      coding: {
        patterns: ['coding', 'programming', 'developer', 'code', 'development', 'software', 'engineer', 'debug', 'ide'],
        responses: [
          "💻 **AI Coding Tools — My recommendations:**\n\n**Step 1:** Browse the 'AI Coding' category on our platform.\n\n**Step 2:** Consider what you need:\n• **Code completion** → AI-powered autocomplete\n• **Code review** → Automated bug detection\n• **Full generation** → Generate entire functions/apps\n• **Debugging** → AI-assisted error fixing\n\n**Step 3:** Check compatibility with your language/IDE.\n\n**Step 4:** Look at GitHub stars for community trust.\n\nWhat programming language do you primarily use?",
        ],
      },
      image: {
        patterns: ['image', 'picture', 'art', 'design', 'illustration', 'photo', 'graphic', 'visual', 'draw'],
        responses: [
          "🎨 **AI Image Generation — Here's your guide:**\n\n**Step 1:** Check the 'AI Image Generation' category.\n\n**Step 2:** Key features to look for:\n• **Text-to-image** → Create images from descriptions\n• **Image editing** → AI-powered photo enhancement\n• **Style transfer** → Apply artistic styles\n• **Upscaling** → Enhance image resolution\n\n**Step 3:** Most image tools have free tiers — try a few!\n\n**Step 4:** Compare output quality by checking user reviews.\n\nWhat kind of images are you looking to create?",
        ],
      },
      feedback: {
        patterns: ['feedback', 'review', 'rate', 'rating', 'opinion', 'experience', 'suggest', 'complaint'],
        responses: [
          "⭐ **We value your feedback!**\n\n**To leave a review:**\n1. Scroll to the 'Reviews & Feedback' section\n2. Fill in your name and rating (1-5 stars)\n3. Share your experience\n4. Submit — it helps the community!\n\n**To share general feedback:**\n1. Use the 'Business Inquiry' form at the bottom\n2. Select 'Feedback' as the subject\n3. Our team reviews every submission\n\nYour input helps us improve! Would you like to share something?",
        ],
      },
      thankyou: {
        patterns: ['thank', 'thanks', 'thank you', 'appreciate', 'helpful', 'great', 'awesome', 'perfect'],
        responses: [
          "You're welcome! 😊 Glad I could help. Feel free to ask anything else about AI tools!",
          "Happy to help! 🎉 Don't forget to share our platform with friends who might find it useful too!",
          "Anytime! 🤖 Remember, I'm always here learning and improving. Come back whenever you need guidance!",
        ],
      },
      about: {
        patterns: ['who are you', 'what are you', 'about you', 'your name', 'jack', 'tell me about yourself'],
        responses: [
          "🤖 **About me:** I'm **Jack**, an AI-powered assistant built into the AI Tool Discovery Engine!\n\n**What I do:**\n• Help you discover and understand AI tools\n• Provide step-by-step guidance\n• Compare tools and make recommendations\n• Answer questions about AI technologies\n\n**How I work:**\n• I analyze patterns in your questions\n• I learn from every interaction to improve\n• I have knowledge of thousands of AI tools\n\nI'm designed to make AI accessible for everyone. What can I help you with?",
        ],
      },
    };

    // Learning data: track unknown queries for improvement
    this.unknownQueries = [];
    this.interactionCount = 0;
    this.satisfactionScore = 0;
  }

  // Process user message and generate response
  async processMessage(message, sessionId, context = {}) {
    this.interactionCount++;
    const cleanMessage = message.toLowerCase().trim();

    // Detect intent
    const intent = this._detectIntent(cleanMessage);

    let response;
    let metadata = {
      intent: intent?.name || 'unknown',
      confidence: intent?.confidence || 0,
      tools_mentioned: [],
    };

    if (intent && intent.confidence > 0.3) {
      // Get response for detected intent
      const responses = intent.data.responses;
      response = responses[Math.floor(Math.random() * responses.length)];

      // Try to personalize with context
      if (context.toolName) {
        response = this._personalizeResponse(response, context);
      }
    } else {
      // Try to give a helpful generic response
      response = this._generateGenericResponse(cleanMessage);
      metadata.intent = 'generic';

      // Store for self-learning
      this.unknownQueries.push({
        query: message,
        timestamp: new Date(),
        sessionId,
      });
    }

    // Add follow-up suggestions
    const followUp = this._getSuggestedFollowUps(intent?.name);

    return {
      role: 'assistant',
      content: response,
      metadata,
      suggestions: followUp,
      timestamp: new Date(),
    };
  }

  // Detect intent from user message
  _detectIntent(message) {
    let bestMatch = null;
    let highestConfidence = 0;

    for (const [name, data] of Object.entries(this.intents)) {
      for (const pattern of data.patterns) {
        if (message.includes(pattern)) {
          // Calculate confidence based on pattern match quality
          const confidence = pattern.length / message.length;
          const adjustedConfidence = Math.min(confidence * 1.5, 1);

          if (adjustedConfidence > highestConfidence) {
            highestConfidence = adjustedConfidence;
            bestMatch = { name, data, confidence: adjustedConfidence };
          }
        }
      }
    }

    return bestMatch;
  }

  // Generate generic response for unrecognized queries
  _generateGenericResponse(message) {
    if (message.length < 3) {
      return "Could you tell me a bit more? I'm here to help you find and understand AI tools! 🤖";
    }

    const genericResponses = [
      `Interesting question! While I'm still learning about "${message.substring(0, 50)}", here's what I can help with:\n\n• 🔍 **Search** for specific AI tools\n• 📊 **Compare** tools side by side\n• 📂 **Browse** categories\n• ⭐ **Read reviews** from other users\n• 📬 **Subscribe** for daily updates\n\nTry asking me about a specific category like "AI writing tools" or "free AI image generators"!`,
      `Great question! Let me guide you:\n\n**Step 1:** Try searching for that topic in our search bar above.\n\n**Step 2:** Check the trending section for related tools.\n\n**Step 3:** Or ask me about a specific category — I know a lot about AI Writing, Coding, Image, and Video tools!\n\nWhat specific type of AI tool are you looking for?`,
    ];

    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
  }

  // Personalize response with context
  _personalizeResponse(response, context) {
    if (context.toolName) {
      response += `\n\n💡 *I see you're interested in **${context.toolName}**. Would you like more details about it?*`;
    }
    return response;
  }

  // Suggest follow-up questions
  _getSuggestedFollowUps(intentName) {
    const suggestions = {
      greeting: ['Show me trending tools', 'What categories are available?', 'Help me find free AI tools'],
      trending: ['Show me AI writing tools', 'What about free options?', 'How are tools ranked?'],
      categories: ['Show me AI coding tools', 'What about image generation?', 'Find writing assistants'],
      pricing: ['Show me free alternatives', 'Best value AI tools', 'Open source options'],
      compare: ['Trending tools', 'Best AI for beginners', 'Enterprise AI solutions'],
      howto: ['How to subscribe', 'How rankings work', 'Leave a review'],
      subscribe: ['What tools are trending?', 'Browse categories', 'Share with friends'],
      thankyou: ['Show me more tools', 'Browse categories', 'Subscribe for updates'],
      about: ['Show me trending tools', 'Help me find a tool', 'What categories exist?'],
      default: ['Show trending AI tools', 'Browse categories', 'How can Jack help?'],
    };

    return suggestions[intentName] || suggestions.default;
  }

  // Self-learning: analyze unknown queries and improve
  getLearningSummary() {
    return {
      totalInteractions: this.interactionCount,
      unknownQueries: this.unknownQueries.length,
      topUnknown: this._getTopUnknownPatterns(),
      intentsConfigured: Object.keys(this.intents).length,
    };
  }

  _getTopUnknownPatterns() {
    const wordFreq = {};
    this.unknownQueries.forEach(q => {
      const words = q.query.toLowerCase().split(/\s+/);
      words.forEach(w => {
        if (w.length > 3) wordFreq[w] = (wordFreq[w] || 0) + 1;
      });
    });
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }
}

module.exports = JackAI;
