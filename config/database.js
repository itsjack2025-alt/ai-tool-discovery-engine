// =========================================
// Database Configuration - MongoDB Connection
// =========================================
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return this.connection;

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_tool_discovery';

    try {
      mongoose.set('strictQuery', false);

      this.connection = await mongoose.connect(uri, {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      });

      this.isConnected = true;
      logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting reconnect...');
        this.isConnected = false;
      });

      return this.connection;
    } catch (error) {
      logger.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) return;
    await mongoose.disconnect();
    this.isConnected = false;
    logger.info('MongoDB disconnected');
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  }
}

module.exports = new Database();
