const pool = require("../config/db");

/**
 * Newsletter Subscribers Controller
 * Handles all newsletter subscription management operations
 */

// Get all newsletter subscribers (Admin only)
exports.getSubscribers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const is_active = req.query.is_active;

    let query = "SELECT * FROM newsletter_subscribers WHERE 1=1";
    const params = [];

    // Search by email or name
    if (search) {
      query += ` AND (email ILIKE $${params.length + 1} OR name ILIKE $${
        params.length + 1
      })`;
      params.push(`%${search}%`);
    }

    // Filter by active status
    if (is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(is_active === "true" || is_active === true);
    }

    // Get total count
    const countResult = await pool.query(
      query.replace(
        /SELECT \* FROM/,
        "SELECT COUNT(*) as total FROM"
      ),
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    query += ` ORDER BY subscribed_at DESC LIMIT $${
      params.length + 1
    } OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get single subscriber (Admin only)
exports.getSubscriberById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM newsletter_subscribers WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscriber not found" });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching subscriber:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update subscriber (Admin only) - PATCH
exports.updateSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, is_active } = req.body;

    // Check if subscriber exists
    const existingResult = await pool.query(
      "SELECT * FROM newsletter_subscribers WHERE id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscriber not found" });
    }

    // Check if email is unique (if being updated)
    if (email) {
      const emailCheck = await pool.query(
        "SELECT id FROM newsletter_subscribers WHERE email = $1 AND id != $2",
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res
          .status(400)
          .json({ success: false, message: "Email already exists" });
      }
    }

    // Update subscriber
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      params.push(email);
      paramCount++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      params.push(is_active);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1) {
      // Only updated_at, so nothing to update
      return res.json({
        success: true,
        message: "No changes made",
        data: existingResult.rows[0],
      });
    }

    params.push(id);

    const query = `
      UPDATE newsletter_subscribers
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: "Subscriber updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating subscriber:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete subscriber (Admin only) - DELETE (soft delete by marking inactive)
exports.deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if subscriber exists
    const existingResult = await pool.query(
      "SELECT * FROM newsletter_subscribers WHERE id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscriber not found" });
    }

    // Support optional hard delete via query ?hard=true
    const hard = req.query && (req.query.hard === 'true' || req.query.hard === '1');

    if (hard) {
      // Safety: require explicit confirmation header to avoid accidental permanent deletes
      const confirmHeader = (req.headers['x-confirm-delete'] || '').toLowerCase();
      if (confirmHeader !== 'yes') {
        return res.status(400).json({
          success: false,
          message: 'Hard delete requires header X-Confirm-Delete: yes to proceed',
        });
      }

      // Perform permanent delete
      const result = await pool.query(
        'DELETE FROM newsletter_subscribers WHERE id = $1 RETURNING *',
        [id]
      );

      // Optional: try to write an audit log if table exists (best-effort)
      try {
        await pool.query(
          "INSERT INTO audit_logs (event_type, details, created_at, user_id) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)",
          [
            'newsletter_subscriber:hard_delete',
            JSON.stringify({ subscriber: result.rows[0], performed_by: req.user && req.user.id }),
            req.user && req.user.id,
          ]
        );
      } catch (auditErr) {
        // don't block on audit failures
        console.warn('Audit log failed:', auditErr.message || auditErr);
      }

      return res.json({
        success: true,
        message: 'Subscriber permanently deleted',
        data: result.rows[0],
      });
    }

    // Soft delete by marking as inactive
    const result = await pool.query(
      "UPDATE newsletter_subscribers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );

    res.json({
      success: true,
      message: "Subscriber removed successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Public subscribe endpoint - anyone can subscribe
exports.publicSubscribe = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    // Check if subscriber already exists
    const existingResult = await pool.query(
      "SELECT * FROM newsletter_subscribers WHERE email = $1",
      [email]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];

      // If already active, return message
      if (existing.is_active) {
        return res.status(200).json({
          success: true,
          message: "You are already subscribed to our newsletter",
          data: existing,
        });
      }

      // If inactive, reactivate subscription
      const result = await pool.query(
        "UPDATE newsletter_subscribers SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING *",
        [email]
      );

      return res.json({
        success: true,
        message: "Welcome back! You have been reactivated in our newsletter",
        data: result.rows[0],
      });
    }

    // Create new subscription
    const result = await pool.query(
      "INSERT INTO newsletter_subscribers (email, name, is_active, subscribed_at) VALUES ($1, $2, true, CURRENT_TIMESTAMP) RETURNING *",
      [email, name || null]
    );

    res.status(201).json({
      success: true,
      message: "Thank you for subscribing to our newsletter!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error subscribing:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
