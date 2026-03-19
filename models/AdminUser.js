// =========================================
// Admin User Model
// =========================================
const mongoose = require('mongoose');
const crypto = require('crypto');

const adminUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password_hash: {
    type: String,
    required: true,
  },
  salt: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'editor'],
    default: 'admin',
  },
  permissions: {
    manage_tools: { type: Boolean, default: true },
    manage_ads: { type: Boolean, default: true },
    manage_settings: { type: Boolean, default: true },
    run_discovery: { type: Boolean, default: true },
    manage_users: { type: Boolean, default: false },
  },
  last_login: Date,
  login_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Hash password
adminUserSchema.statics.hashPassword = function (password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
};

// Verify password
adminUserSchema.methods.verifyPassword = function (password) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 100000, 64, 'sha512').toString('hex');
  return this.password_hash === hash;
};

// Generate session token
adminUserSchema.methods.generateToken = function () {
  const payload = {
    id: this._id.toString(),
    username: this.username,
    role: this.role,
    permissions: this.permissions,
    iat: Date.now(),
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24h
  };
  // Simple base64 token (in production, use JWT)
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

// Verify token
adminUserSchema.statics.verifyToken = function (token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

// Create default admin if none exists
adminUserSchema.statics.ensureDefaultAdmin = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    const { hash, salt } = this.hashPassword(process.env.ADMIN_PASSWORD || 'Jack@2026');
    await this.create({
      username: process.env.ADMIN_USERNAME || 'CallmeJack',
      email: process.env.ADMIN_EMAIL || 'admin@aitool.discovery',
      password_hash: hash,
      salt,
      role: 'superadmin',
      permissions: {
        manage_tools: true,
        manage_ads: true,
        manage_settings: true,
        run_discovery: true,
        manage_users: true,
      },
    });
    console.log('✅ Default admin created (username: CallmeJack, password: Jack@2026)');
  }
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
