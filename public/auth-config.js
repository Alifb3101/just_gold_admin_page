/**
 * Authentication Configuration & Utilities (with RBAC)
 * Handles JWT token management, role-based access control, and authenticated API calls
 */

// Dynamically resolve the API base URL:
// - On localhost (dev), point to the local backend on port 5000
// - On any other host (staging / production), use the deployed backend URL
const API_BASE = (() => {
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api/v1';
  }
  return 'https://api.justgoldcosmetics.com/api/v1';
})();

// Role definitions with their permissions (must match backend)
const ROLES = {
  admin: {
    name: 'admin',
    label: 'Administrator',
    permissions: ['*'],
    description: 'Full system access',
    color: '#e74c3c'
  },
  staff: {
    name: 'staff',
    label: 'Staff',
    permissions: [
      'inventory:view',
      'inventory:manage'
    ],
    description: 'Can manage inventory only',
    color: '#f39c12'
  },
  inventory_manager: {
    name: 'inventory_manager',
    label: 'Inventory Manager',
    permissions: [
      'inventory:view',
      'inventory:manage'
    ],
    description: 'Can manage inventory only',
    color: '#f39c12'
  },
  order_manager: {
    name: 'order_manager',
    label: 'Order Manager',
    permissions: [
      'orders:view',
      'orders:manage'
    ],
    description: 'Can manage orders only',
    color: '#3498db'
  },
  viewer: {
    name: 'viewer',
    label: 'Viewer',
    permissions: [],
    description: 'Read-only access',
    color: '#95a5a6'
  },
  user: {
    name: 'user',
    label: 'User',
    permissions: [],
    description: 'Regular user - no admin access',
    color: '#95a5a6'
  },
  customer: {
    name: 'customer',
    label: 'Customer',
    permissions: [],
    description: 'Customer - no admin access',
    color: '#95a5a6'
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

// Menu items configuration with required roles
const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/index.html', roles: ['admin'] },
  { id: 'products', label: 'Products', icon: '📦', path: '/index.html', roles: ['admin'] },
  { id: 'inventory', label: 'Inventory', icon: '📋', path: '/inventory.html', roles: ['admin', 'staff'] },
  { id: 'orders', label: 'Orders', icon: '🛒', path: '/orders.html', roles: ['admin'] },
  { id: 'contact_queries', label: 'Contact Queries', icon: '✉️', path: '/contact-queries.html', roles: ['admin'] },
  { id: 'users', label: 'User Management', icon: '👥', path: '/users.html', roles: ['admin'] },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings.html', roles: ['admin'] }
];

// ============================================================
// AUTHENTICATION FUNCTIONS
// ============================================================

// Get auth headers with token
function getAuthHeaders() {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Get auth headers for FormData (no Content-Type for multipart)
function getAuthHeadersFormData() {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`
  };
}

// Authenticated fetch wrapper
async function fetchWithAuth(endpoint, options = {}) {
  try {
    const isFormData = options.body instanceof FormData;
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...(isFormData ? getAuthHeadersFormData() : getAuthHeaders()),
        ...options.headers
      }
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('Token expired or invalid, redirecting to login');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login.html';
      return null;
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      const data = await response.json();
      console.warn('Access denied:', data.message);
      // Redirect to unauthorized page
      window.location.href = '/unauthorized.html';
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Check if admin is authenticated
function isAuthenticated() {
  return !!localStorage.getItem('adminToken');
}

// Get current admin user
function getAdminUser() {
  const user = localStorage.getItem('adminUser');
  return user ? JSON.parse(user) : null;
}

// Get current user role
function getUserRole() {
  const user = getAdminUser();
  return user?.role || null;
}

// Logout
async function logout() {
  try {
    // Call logout endpoint
    await fetchWithAuth('/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout API error:', error);
  } finally {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/login.html';
  }
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// ============================================================
// RBAC FUNCTIONS
// ============================================================

/**
 * Check if current user has a specific role
 * @param {...string} allowedRoles - Roles to check against
 * @returns {boolean}
 */
function hasRole(...allowedRoles) {
  const userRole = getUserRole();
  return userRole && allowedRoles.includes(userRole);
}

/**
 * Check if current user has a specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
function hasPermission(permission) {
  const userRole = getUserRole();
  if (!userRole || !ROLES[userRole]) return false;
  
  const roleData = ROLES[userRole];
  
  // Admin has all permissions
  if (roleData.permissions.includes('*')) return true;
  
  return roleData.permissions.includes(permission);
}

/**
 * Check if current user can access a module
 * @param {string} module - Module name (dashboard, products, orders, etc.)
 * @returns {boolean}
 */
function canAccessModule(module) {
  const userRole = getUserRole();
  if (!userRole || !ROLES[userRole]) return false;
  
  const roleData = ROLES[userRole];
  
  // Admin has access to all modules
  if (roleData.permissions.includes('*')) return true;
  
  const requiredPermissions = MODULE_PERMISSIONS[module];
  if (!requiredPermissions) return false;
  
  return requiredPermissions.some(perm => roleData.permissions.includes(perm));
}

/**
 * Protect a route by role - redirects if not authorized
 * @param {...string} allowedRoles - Allowed roles for this page
 */
function protectRoute(...allowedRoles) {
  if (!requireAuth()) return false;
  
  if (!hasRole(...allowedRoles)) {
    window.location.href = '/unauthorized.html';
    return false;
  }
  return true;
}

/**
 * Get menu items for current user based on role
 * @returns {Array} Filtered menu items
 */
function getMenuItems() {
  const userRole = getUserRole();
  if (!userRole) return [];
  
  return MENU_ITEMS.filter(item => item.roles.includes(userRole));
}

/**
 * Get role display info
 * @param {string} roleName - Role name
 * @returns {Object} Role display info
 */
function getRoleInfo(roleName) {
  return ROLES[roleName] || {
    name: roleName,
    label: roleName,
    description: 'Unknown role',
    color: '#95a5a6'
  };
}

/**
 * Check if current user can perform a specific action on a module
 * @param {string} module - Module name
 * @param {string} action - Action (create, update, delete, view)
 * @returns {boolean}
 */
function canPerformAction(module, action) {
  const permissionMap = {
    'create': `${module}:create`,
    'update': `${module}:update`,
    'delete': `${module}:delete`,
    'view': `${module}:view`,
    'manage': `${module}:manage`,
    'update_inventory': `${module}:update_inventory`,
    'update_status': `${module}:update_status`
  };
  
  const permission = permissionMap[action];
  if (!permission) return false;
  
  return hasPermission(permission);
}

// ============================================================
// UI HELPER FUNCTIONS
// ============================================================

/**
 * Hide/show elements based on role
 * @param {string} selector - CSS selector
 * @param {boolean} show - Whether to show or hide
 */
function toggleElementByRole(selector, show) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.style.display = show ? '' : 'none';
  });
}

/**
 * Render role-based menu
 * @param {string} containerId - ID of container element
 */
function renderMenu(containerId = 'menuContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const menuItems = getMenuItems();
  const currentPath = window.location.pathname;
  
  container.innerHTML = menuItems.map(item => {
    const isActive = currentPath === item.path || currentPath.includes(item.id);
    return `
      <a href="${item.path}" class="menu-item ${isActive ? 'active' : ''}" data-module="${item.id}">
        <span class="menu-icon">${item.icon}</span>
        <span class="menu-label">${item.label}</span>
      </a>
    `;
  }).join('');
}

/**
 * Initialize RBAC on page load
 * Hides elements based on user's role
 */
function initRBAC() {
  const userRole = getUserRole();
  if (!userRole) return;
  
  // Hide/show elements with data-role attribute
  document.querySelectorAll('[data-role]').forEach(el => {
    const allowedRoles = el.dataset.role.split(',').map(r => r.trim());
    const hasAccess = allowedRoles.includes(userRole);
    el.style.display = hasAccess ? '' : 'none';
  });
  
  // Hide/show elements with data-permission attribute
  document.querySelectorAll('[data-permission]').forEach(el => {
    const permission = el.dataset.permission;
    const hasAccess = hasPermission(permission);
    el.style.display = hasAccess ? '' : 'none';
  });
  
  // Disable elements with data-require-role if user doesn't have role
  document.querySelectorAll('[data-require-role]').forEach(el => {
    const requiredRoles = el.dataset.requireRole.split(',').map(r => r.trim());
    const hasAccess = requiredRoles.includes(userRole);
    if (!hasAccess) {
      el.disabled = true;
      el.title = 'Insufficient permissions';
      el.classList.add('disabled');
    }
  });
}

// ============================================================
// EXPORT FOR MODULE SYSTEMS
// ============================================================

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    API_BASE,
    ROLES,
    MODULE_PERMISSIONS,
    MENU_ITEMS,
    getAuthHeaders,
    getAuthHeadersFormData,
    fetchWithAuth,
    isAuthenticated,
    getAdminUser,
    getUserRole,
    logout,
    requireAuth,
    hasRole,
    hasPermission,
    canAccessModule,
    protectRoute,
    getMenuItems,
    getRoleInfo,
    canPerformAction,
    toggleElementByRole,
    renderMenu,
    initRBAC
  };
}
