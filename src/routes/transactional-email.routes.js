/**
 * Newsletter & Transactional Email Routes
 * Handles newsletter subscriber management (Admin only) and public subscriptions
 */

const router = require("express").Router();
const {
  getSubscribers,
  getSubscriberById,
  updateSubscriber,
  deleteSubscriber,
  publicSubscribe,
} = require("../controllers/transactional-email.controller");
const { authenticateToken, requireRole } = require("../middleware/rbac");

// ============================================================
// PUBLIC ENDPOINTS
// ============================================================

/**
 * POST /api/newsletter/subscribe
 * Public endpoint - anyone can subscribe to newsletter
 * Body: { email: string, name?: string }
 */
router.post("/newsletter/subscribe", publicSubscribe);

/**
 * POST /api/v1/newsletter/subscribe
 * Public endpoint - anyone can subscribe to newsletter (v1 version)
 */
router.post("/v1/newsletter/subscribe", publicSubscribe);

// ============================================================
// ADMIN ONLY ENDPOINTS (Require authentication and admin role)
// ============================================================

/**
 * GET /api/newsletter/subscribers
 * List all newsletter subscribers with pagination and filtering
 * Query: { page?: number, limit?: number, search?: string, is_active?: boolean }
 * Admin only
 */
router.get(
  "/newsletter/subscribers",
  authenticateToken,
  requireRole("admin"),
  getSubscribers
);

/**
 * GET /api/v1/newsletter/subscribers
 * List all newsletter subscribers with pagination and filtering (v1 version)
 * Admin only
 */
router.get(
  "/v1/newsletter/subscribers",
  authenticateToken,
  requireRole("admin"),
  getSubscribers
);

/**
 * GET /api/newsletter/subscribers/:id
 * Get a specific newsletter subscriber by ID
 * Admin only
 */
router.get(
  "/newsletter/subscribers/:id",
  authenticateToken,
  requireRole("admin"),
  getSubscriberById
);

/**
 * GET /api/v1/newsletter/subscribers/:id
 * Get a specific newsletter subscriber by ID (v1 version)
 * Admin only
 */
router.get(
  "/v1/newsletter/subscribers/:id",
  authenticateToken,
  requireRole("admin"),
  getSubscriberById
);

/**
 * PATCH /api/newsletter/subscribers/:id
 * Update a newsletter subscriber
 * Body: { name?: string, email?: string, is_active?: boolean }
 * Admin only
 */
router.patch(
  "/newsletter/subscribers/:id",
  authenticateToken,
  requireRole("admin"),
  updateSubscriber
);

/**
 * PATCH /api/v1/newsletter/subscribers/:id
 * Update a newsletter subscriber (v1 version)
 * Admin only
 */
router.patch(
  "/v1/newsletter/subscribers/:id",
  authenticateToken,
  requireRole("admin"),
  updateSubscriber
);

/**
 * DELETE /api/newsletter/subscribers/:id
 * Delete (soft delete - mark as inactive) a newsletter subscriber
 * Admin only
 */
router.delete(
  "/newsletter/subscribers/:id",
  authenticateToken,
  requireRole("admin"),
  deleteSubscriber
);

/**
 * DELETE /api/v1/newsletter/subscribers/:id
 * Delete (soft delete - mark as inactive) a newsletter subscriber (v1 version)
 * Admin only
 */
router.delete(
  "/v1/newsletter/subscribers/:id",
  authenticateToken,
  requireRole("admin"),
  deleteSubscriber
);

module.exports = router;
