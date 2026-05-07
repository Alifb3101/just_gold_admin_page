// Recovery Management API Service
// Handles all API communication with recovery endpoints

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

/**
 * Get JWT token from localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
};

/**
 * Create common headers with JWT authorization
 */
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * Handle API response and errors
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API Error: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
};

// ============================================================================
// CREATE RECOVERY CASE
// ============================================================================

/**
 * Create a new recovery case
 * @param {Object} payload - { orderId, customerId }
 * @returns {Promise<{recoveryId, token, expiryInfo}>}
 */
export const createRecoveryCase = async (payload) => {
  try {
    const response = await fetch(`${BASE_URL}/recovery/admin/create`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(payload),
    });

    const data = await handleResponse(response);
    return {
      success: true,
      data,
      recoveryId: data.recoveryId,
      token: data.token,
      expiryInfo: data.expiryInfo || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// ============================================================================
// ADD RECOVERY OPTIONS
// ============================================================================

/**
 * Add recovery options to a recovery case
 * @param {string} recoveryId - Recovery case ID
 * @param {Array} options - Array of {productId, type, price_override}
 * @returns {Promise<{success, data, error}>}
 */
export const addRecoveryOptions = async (recoveryId, options) => {
  try {
    if (!recoveryId) {
      throw new Error('Recovery ID is required');
    }

    if (!Array.isArray(options) || options.length === 0) {
      throw new Error('At least one option is required');
    }

    const response = await fetch(
      `${BASE_URL}/recovery/${recoveryId}/options`,
      {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ options }),
      }
    );

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// ============================================================================
// GENERATE PROMO CODE
// ============================================================================

/**
 * Generate promo code for recovery case
 * @param {string} recoveryId - Recovery case ID
 * @param {number} discountPercent - Discount percentage (1-100)
 * @returns {Promise<{success, data, error}>}
 */
export const generatePromoCode = async (recoveryId, discountPercent) => {
  try {
    if (!recoveryId) {
      throw new Error('Recovery ID is required');
    }

    if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
      throw new Error('Discount must be between 1 and 100%');
    }

    const response = await fetch(
      `${BASE_URL}/recovery/${recoveryId}/promo`,
      {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ discount_percent: discountPercent }),
      }
    );

    const data = await handleResponse(response);
    return {
      success: true,
      data,
      promoCode: data.promo_code || data.promoCode,
      usageLimit: data.usage_limit || data.usageLimit || 1,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// ============================================================================
// VIEW RECOVERY CASE (TOKEN-BASED PREVIEW)
// ============================================================================

/**
 * Get recovery case details using token (for preview only)
 * This is a fallback since there's no admin GET endpoint
 * @param {string} token - Recovery token
 * @returns {Promise<{success, data, error}>}
 */
export const getRecoveryCaseByToken = async (token) => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }

    const response = await fetch(
      `${BASE_URL}/recovery/${token}`,
      {
        method: 'GET',
        headers: getHeaders(false), // No auth needed for token-based
      }
    );

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const validateRecoveryInput = (orderId, customerId) => {
  const errors = {};

  if (!orderId || orderId.trim() === '') {
    errors.orderId = 'Order ID is required';
  }

  if (!customerId || customerId.trim() === '') {
    errors.customerId = 'Customer ID is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateOption = (option) => {
  const errors = {};

  if (!option.productId || option.productId.trim() === '') {
    errors.productId = 'Product ID is required';
  }

  if (!option.type || !['replacement', 'upgrade'].includes(option.type)) {
    errors.type = 'Type must be "replacement" or "upgrade"';
  }

  if (option.price_override !== undefined && option.price_override !== null) {
    const price = parseFloat(option.price_override);
    if (isNaN(price) || price < 0) {
      errors.price_override = 'Price override must be a valid positive number';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validatePromoInput = (discountPercent) => {
  const errors = {};

  const discount = parseFloat(discountPercent);
  if (isNaN(discount) || discount < 1 || discount > 100) {
    errors.discountPercent = 'Discount must be between 1 and 100%';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
