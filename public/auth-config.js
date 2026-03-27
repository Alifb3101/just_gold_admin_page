/**
 * Authentication Configuration & Utilities
 * Handles JWT token management and authenticated API calls
 */

// Use backend API host (server runs on 5000)
const API_BASE = 'http://localhost:5000/api/v1';

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

    // Handle token expiration
    if (response.status === 401) {
      console.warn('Token expired or invalid, redirecting to login');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login.html';
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

// Logout
function logout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = '/login.html';
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    API_BASE,
    getAuthHeaders,
    getAuthHeadersFormData,
    fetchWithAuth,
    isAuthenticated,
    getAdminUser,
    logout,
    requireAuth
  };
}
