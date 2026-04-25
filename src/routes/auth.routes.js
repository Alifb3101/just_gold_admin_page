/**
 * Authentication & User Management Routes
 * Handles login, logout, and user CRUD for admin panel
 */

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { 
  authenticateToken, 
  requireRole, 
  generateToken, 
  logAudit,
  ROLES 
} = require('../middleware/rbac');

const SALT_ROUNDS = 10;

// ============================================================
// AUTHENTICATION ENDPOINTS
// ============================================================

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, password_hash, name, role, is_active FROM admin_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled. Please contact administrator.'
      });
    }
    
    // For development - allow simple password matching
    // In production, use bcrypt.compare
    let passwordValid = false;
    
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_PASSWORD_HASH === 'true') {
      // Development mode: plain text password check
      const plainTextPasswords = {
        'admin@gmail.com': 'admin123',
        'inventory@gmail.com': 'inventory123',
        'orders@gmail.com': 'orders123',
        'viewer@gmail.com': 'viewer123',
        'Justgoldcosmetic@gmail.com': 'justgold123'
      };
      passwordValid = plainTextPasswords[email.toLowerCase().trim()] === password;
    } else {
      // Production mode: bcrypt hash comparison
      passwordValid = await bcrypt.compare(password, user.password_hash);
    }
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Log audit
    await logAudit({
      userId: user.id,
      email: user.email,
      role: user.role,
      action: 'LOGIN',
      module: 'auth',
      details: { method: 'password' },
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Log audit
    await logAudit({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: 'LOGOUT',
      module: 'auth',
      details: {},
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, name, role, is_active, last_login, created_at FROM admin_users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        permissions: ROLES[user.role]?.permissions || []
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/auth/change-password
 * Change user password
 */
router.post('/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }
    
    // Get user with password
    const userResult = await pool.query(
      'SELECT password_hash FROM admin_users WHERE id = $1',
      [req.user.id]
    );
    
    const user = userResult.rows[0];
    
    // Verify current password
    let passwordValid = false;
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_PASSWORD_HASH === 'true') {
      // Skip password verification in dev for simplicity
      passwordValid = true;
    } else {
      passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
    }
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update password
    await pool.query(
      'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );
    
    // Log audit
    await logAudit({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: 'CHANGE_PASSWORD',
      module: 'auth',
      details: {},
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================================
// USER MANAGEMENT (Admin only)
// ============================================================

/**
 * GET /api/v1/auth/users
 * Get all users (Admin only)
 */
router.get('/auth/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const usersResult = await pool.query(
      `SELECT id, email, name, role, is_active, last_login, created_at, updated_at 
       FROM admin_users 
       ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      users: usersResult.rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/auth/users/:id
 * Get user by ID (Admin only)
 */
router.get('/auth/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const userResult = await pool.query(
      `SELECT id, email, name, role, is_active, last_login, created_at, updated_at 
       FROM admin_users 
       WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: userResult.rows[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/auth/users
 * Create new user (Admin only)
 */
router.post('/auth/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Validate input
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, name, and role are required'
      });
    }
    
    // Validate role
    if (!ROLES[role]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM admin_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const newUserResult = await pool.query(
      `INSERT INTO admin_users (email, password_hash, name, role, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role, is_active, created_at`,
      [email.toLowerCase().trim(), passwordHash, name, role, true, req.user.id]
    );
    
    const newUser = newUserResult.rows[0];
    
    // Log audit
    await logAudit({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: 'CREATE_USER',
      module: 'users',
      details: { createdUserId: newUser.id, createdUserEmail: newUser.email, role },
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/v1/auth/users/:id
 * Update user (Admin only)
 */
router.patch('/auth/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, role, isActive } = req.body;
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email FROM admin_users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent self-demotion from admin
    if (userId === req.user.id && role && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot change your own admin role'
      });
    }
    
    // Validate role if provided
    if (role && !ROLES[role]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    values.push(userId);
    
    const updateResult = await pool.query(
      `UPDATE admin_users 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, email, name, role, is_active, updated_at`,
      values
    );
    
    const updatedUser = updateResult.rows[0];
    
    // Log audit
    await logAudit({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: 'UPDATE_USER',
      module: 'users',
      details: { updatedUserId: userId, changes: req.body },
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/v1/auth/users/:id
 * Delete user (Admin only)
 */
router.delete('/auth/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email FROM admin_users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete user (soft delete alternative: set is_active = false)
    await pool.query('DELETE FROM admin_users WHERE id = $1', [userId]);
    
    // Log audit
    await logAudit({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: 'DELETE_USER',
      module: 'users',
      details: { deletedUserId: userId, deletedUserEmail: userResult.rows[0].email },
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================================
// ROLES & PERMISSIONS
// ============================================================

/**
 * GET /api/v1/auth/roles
 * Get all available roles
 */
router.get('/auth/roles', authenticateToken, async (req, res) => {
  try {
    const rolesWithPermissions = Object.entries(ROLES).map(([key, value]) => ({
      name: key,
      description: value.description,
      permissions: value.permissions
    }));
    
    res.json({
      success: true,
      roles: rolesWithPermissions
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================================
// AUDIT LOGS (Admin only)
// ============================================================

/**
 * GET /api/v1/auth/audit-logs
 * Get audit logs (Admin only)
 */
router.get('/auth/audit-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, module } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query with filters
    let whereClause = '';
    const params = [];
    let paramIndex = 1;
    
    if (userId) {
      whereClause += `${whereClause ? ' AND' : 'WHERE'} user_id = $${paramIndex++}`;
      params.push(parseInt(userId));
    }
    
    if (action) {
      whereClause += `${whereClause ? ' AND' : 'WHERE'} action = $${paramIndex++}`;
      params.push(action);
    }
    
    if (module) {
      whereClause += `${whereClause ? ' AND' : 'WHERE'} module = $${paramIndex++}`;
      params.push(module);
    }
    
    params.push(parseInt(limit));
    params.push(offset);
    
    const logsResult = await pool.query(
      `SELECT al.*, au.name as user_name
       FROM audit_logs al
       LEFT JOIN admin_users au ON al.user_id = au.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params.slice(0, -2) // Exclude limit and offset
    );
    
    res.json({
      success: true,
      logs: logsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
