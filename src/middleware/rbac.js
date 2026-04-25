/**
 * RBAC (Role-Based Access Control) Middleware
 * Handles role verification and permission checking
 */

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Role definitions with their permissions
const ROLES = {
  admin: {
    name: 'admin',
    permissions: ['*'], // Full access to everything
    description: 'Full system access'
  },
  inventory_manager: {
    name: 'inventory_manager',
    permissions: [
      'dashboard:view',
      'products:view',
      'products:update_inventory', // Can update price, salePrice, stockQty, stockStatus
      'inventory:view',
      'inventory:manage'
    ],
    description: 'Can manage inventory and product stock'
  },
  order_manager: {
    name: 'order_manager',
    permissions: [
      'dashboard:view',
      'orders:view',
      'orders:manage',
      'orders:update_status'
    ],
    description: 'Can manage customer orders'
  },
  viewer: {
    name: 'viewer',
    permissions: [
      'dashboard:view',
      'products:view',
      'orders:view',
      'inventory:view'
    ],
    description: 'Read-only access to view data'
  }
};

// Module to permission mapping
const MODULE_PERMISSIONS = {
  dashboard: ['dashboard:view'],
  products: ['products:view', 'products:create', 'products:update', 'products:delete', 'products:update_inventory'],
  orders: ['orders:view', 'orders:manage', 'orders:update_status'],
  inventory: ['inventory:view', 'inventory:manage'],
  users: ['users:view', 'users:create', 'users:update', 'users:delete'],
  settings: ['settings:view', 'settings:manage'],
  contact_queries: ['contact_queries:view', 'contact_queries:manage']
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  if (!role || !ROLES[role]) return false;
  const roleData = ROLES[role];
  
  // Admin has all permissions
  if (roleData.permissions.includes('*')) return true;
  
  return roleData.permissions.includes(permission);
}

/**
 * Check if a role can access a module
 * @param {string} role - User role
 * @param {string} module - Module name
 * @returns {boolean}
 */
function canAccessModule(role, module) {
  if (!role || !ROLES[role]) return false;
  const roleData = ROLES[role];
  
  // Admin has access to all modules
  if (roleData.permissions.includes('*')) return true;
  
  const requiredPermissions = MODULE_PERMISSIONS[module];
  if (!requiredPermissions) return false;
  
  // Check if user has at least one permission for the module
  return requiredPermissions.some(perm => roleData.permissions.includes(perm));
}

/**
 * Middleware: Verify JWT token and attach user to request
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized - Bearer token required' 
      });
    }

    const token = authHeader.substring(7);
    
    // For development, allow test tokens
    if (process.env.NODE_ENV === 'development' && token === 'test_admin_token') {
      req.user = { 
        id: 1, 
        email: 'admin@gmail.com', 
        role: 'admin',
        name: 'Admin User'
      };
      return next();
    }

    // Verify JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user data from database
    const userResult = await pool.query(
      'SELECT id, email, role, name, is_active FROM admin_users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized - User not found' 
      });
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden - Account is disabled' 
      });
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized - Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized - Token expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}

/**
 * Middleware: Check if user has specific role(s)
 * @param {...string} allowedRoles - Roles that are allowed
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized - Authentication required' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden - Insufficient permissions' 
      });
    }
    
    next();
  };
}

/**
 * Middleware: Check if user has specific permission
 * @param {string} permission - Required permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized - Authentication required' 
      });
    }
    
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden - Permission denied' 
      });
    }
    
    next();
  };
}

/**
 * Middleware: Check if user can access a module
 * @param {string} module - Module name
 */
function requireModuleAccess(module) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized - Authentication required' 
      });
    }
    
    if (!canAccessModule(req.user.role, module)) {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden - Module access denied' 
      });
    }
    
    next();
  };
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Log audit trail
 * @param {Object} data - Audit log data
 */
async function logAudit(data) {
  try {
    const { userId, email, role, action, module, details, ipAddress } = data;
    
    await pool.query(
      `INSERT INTO audit_logs (user_id, email, role, action, module, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, email, role, action, module, JSON.stringify(details || {}), ipAddress || null]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break the application
  }
}

/**
 * Middleware to automatically log audit for specific actions
 * @param {string} action - Action name
 * @param {string} module - Module name
 */
function auditLog(action, module) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to capture response
    res.json = async (data) => {
      // Only log if user is authenticated
      if (req.user) {
        try {
          await logAudit({
            userId: req.user.id,
            email: req.user.email,
            role: req.user.role,
            action: action,
            module: module,
            details: {
              method: req.method,
              path: req.path,
              params: req.params,
              body: req.body ? { ...req.body, password: undefined } : undefined, // Exclude password
              responseStatus: res.statusCode,
              success: data.success !== false
            },
            ipAddress: req.ip || req.connection.remoteAddress
          });
        } catch (error) {
          console.error('Audit middleware error:', error);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

module.exports = {
  ROLES,
  MODULE_PERMISSIONS,
  hasPermission,
  canAccessModule,
  authenticateToken,
  requireRole,
  requirePermission,
  requireModuleAccess,
  generateToken,
  logAudit,
  auditLog
};
