const router = require("express").Router();
const pool = require("../config/db");

/* ============================================================
   MIDDLEWARE - Authentication Placeholders
   Replace these with your actual JWT verification logic
   ============================================================ */

// Customer authentication middleware
const authenticateUser = (req, res, next) => {
  // TODO: Replace with actual JWT verification
  // For now, extract user_id from Authorization header or query param for testing
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized - No token provided" });
  }

  // Placeholder: In production, decode JWT and set req.user
  // For testing, you can pass user_id as a query param
  const userId = req.query._test_user_id; // Remove in production
  if (userId) {
    req.user = { id: parseInt(userId, 10) };
  } else {
    // Placeholder user for development
    req.user = { id: null }; // Will need real JWT implementation
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }

  next();
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  // TODO: Replace with actual JWT verification + role check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized - No token provided" });
  }

  // Placeholder: In production, decode JWT and verify admin role
  // For development/testing, use _test_admin_id query param
  const testAdminId = req.query._test_admin_id;
  if (testAdminId) {
    req.admin = { id: parseInt(testAdminId, 10), role: "admin" };
    return next();
  }

  // Production: Implement proper JWT verification
  // For now, reject requests without explicit test admin ID (secure by default)
  return res.status(401).json({ message: "Unauthorized - Admin role required. Use ?_test_admin_id=1 for testing" });
};

/* ============================================================
   CUSTOMER ENDPOINTS
   ============================================================ */

/**
 * GET /api/v1/orders
 * Returns all orders for the authenticated user
 */
router.get("/orders", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.total_amount,
        o.subtotal,
        o.shipping_fee,
        o.tax,
        o.discount,
        o.currency,
        o.created_at,
        o.updated_at,
        (
          SELECT json_agg(json_build_object(
            'id', oi.id,
            'product_name', oi.product_name_snapshot,
            'price', oi.price_snapshot,
            'quantity', oi.quantity,
            'total_price', oi.total_price,
            'variant_id', oi.variant_id,
            'variant_image', pv.main_image
          ))
          FROM order_items oi
          LEFT JOIN product_variants pv ON oi.variant_id = pv.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [userId]);

    res.json({
      count: result.rows.length,
      orders: result.rows
    });
  } catch (err) {
    console.error("Error fetching user orders:", err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

/**
 * GET /api/v1/orders/my/:orderId
 * Returns single order details for the authenticated user
 */
router.get("/orders/my/:orderId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const result = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.total_amount,
        o.subtotal,
        o.shipping_fee,
        o.tax,
        o.discount,
        o.currency,
        o.shipping_address_json,
        o.created_at,
        o.updated_at,
        (
          SELECT json_agg(json_build_object(
            'id', oi.id,
            'product_name', oi.product_name_snapshot,
            'price', oi.price_snapshot,
            'quantity', oi.quantity,
            'total_price', oi.total_price,
            'variant_id', oi.variant_id,
            'variant_image', pv.main_image,
            'shade', pv.shade
          ))
          FROM order_items oi
          LEFT JOIN product_variants pv ON oi.variant_id = pv.id
          WHERE oi.order_id = o.id
        ) AS items,
        (
          SELECT json_agg(json_build_object(
            'old_status', osh.old_order_status,
            'new_status', osh.new_order_status,
            'changed_at', osh.changed_at
          ) ORDER BY osh.changed_at DESC)
          FROM order_status_history osh
          WHERE osh.order_id = o.id
        ) AS status_history
      FROM orders o
      WHERE o.id = $1 AND o.user_id = $2
    `, [orderId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "Error fetching order" });
  }
});

/* ============================================================
   ADMIN ENDPOINTS
   ============================================================ */

/**
 * GET /api/v1/orders/admin/all
 * Returns all orders with filtering and pagination (Admin only)
 * 
 * Query Params:
 * - page, limit: Pagination
 * - order_status: pending, confirmed, processing, shipped, delivered, cancelled
 * - payment_status: pending, paid, failed, refunded
 * - payment_method: stripe, cod
 * - search: Search by order number, customer name/email
 * - date_from, date_to: Date range filter
 */
router.get("/orders/admin/all", authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitQuery = parseInt(req.query.limit, 10);
    const limit = Math.min(limitQuery > 0 ? limitQuery : 20, 100);
    const offset = (page - 1) * limit;

    const {
      order_status,
      payment_status,
      payment_method,
      search,
      date_from,
      date_to
    } = req.query;

    // Build dynamic WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (order_status) {
      conditions.push(`o.order_status = $${paramIndex}`);
      params.push(order_status);
      paramIndex++;
    }

    if (payment_status) {
      conditions.push(`o.payment_status = $${paramIndex}`);
      params.push(payment_status);
      paramIndex++;
    }

    if (payment_method) {
      conditions.push(`o.payment_method = $${paramIndex}`);
      params.push(payment_method);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(
        o.order_number ILIKE $${paramIndex} OR
        (o.is_guest_order AND (o.guest_full_name ILIKE $${paramIndex} OR o.guest_email ILIKE $${paramIndex})) OR
        (NOT o.is_guest_order AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex}))
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (date_from) {
      conditions.push(`o.created_at >= $${paramIndex}`);
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      conditions.push(`o.created_at <= $${paramIndex}`);
      params.push(date_to);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0].count;

    // Main query with pagination
    const mainQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.total_amount,
        o.subtotal,
        o.shipping_fee,
        o.tax,
        o.discount,
        o.currency,
        o.is_guest_order,
        o.created_at,
        o.updated_at,
        CASE 
          WHEN o.is_guest_order THEN o.guest_full_name
          ELSE u.name
        END AS customer_name,
        CASE 
          WHEN o.is_guest_order THEN o.guest_email
          ELSE u.email
        END AS customer_email,
        CASE 
          WHEN o.is_guest_order THEN o.guest_phone
          ELSE u.phone
        END AS customer_phone,
        (
          SELECT COUNT(*)::int
          FROM order_items oi
          WHERE oi.order_id = o.id
        ) AS items_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(mainQuery, params);

    // Format orders to match the expected response structure
    const formattedOrders = result.rows.map(order => ({
      id: order.id,
      order_number: order.order_number,
      order_status: order.order_status,
      is_guest_order: order.is_guest_order,
      customer: {
        id: order.user_id,
        name: order.customer_name || 'Guest',
        email: order.customer_email,
        phone: order.customer_phone
      },
      payment: {
        method: order.payment_method,
        status: order.payment_status
      },
      pricing: {
        subtotal: order.subtotal,
        tax: order.tax,
        shipping_fee: order.shipping_fee,
        discount: order.discount,
        total: order.total_amount,
        currency: order.currency
      },
      items_count: order.items_count,
      created_at: order.created_at,
      updated_at: order.updated_at
    }));

    res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error fetching admin orders:", err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

/**
 * GET /api/v1/orders/admin/:orderId
 * Returns single order with full details (Admin only)
 */
router.get("/orders/admin/:orderId", authenticateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.financial_status,
        o.total_amount,
        o.subtotal,
        o.shipping_fee,
        o.tax,
        o.discount,
        o.currency,
        o.shipping_address_json,
        o.is_guest_order,
        o.guest_full_name,
        o.guest_email,
        o.guest_phone,
        o.created_at,
        o.updated_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        (
          SELECT COUNT(*)::int
          FROM order_items oi
          WHERE oi.order_id = o.id
        ) AS items_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = result.rows[0];

    // Get order items
    const itemsResult = await pool.query(`
      SELECT 
        oi.id,
        oi.product_name_snapshot,
        oi.price_snapshot,
        oi.quantity,
        oi.total_price,
        oi.variant_id,
        pv.shade,
        pv.main_image AS variant_image,
        p.id AS product_id,
        p.name AS product_name
      FROM order_items oi
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);

    // Parse shipping address
    let shippingAddress = {};
    try {
      if (order.shipping_address_json) {
        shippingAddress = typeof order.shipping_address_json === 'string' 
          ? JSON.parse(order.shipping_address_json) 
          : order.shipping_address_json;
      }
    } catch (parseErr) {
      console.warn('Failed to parse shipping_address_json:', parseErr);
    }

    // Format response to match the API structure exactly
    const formattedResponse = {
      id: order.id,
      order_number: order.order_number,
      is_guest_order: order.is_guest_order,
      customer: {
        id: order.user_id,
        name: order.is_guest_order ? order.guest_full_name : (order.user_name || 'Guest'),
        email: order.is_guest_order ? order.guest_email : order.user_email,
        phone: order.is_guest_order ? order.guest_phone : order.user_phone
      },
      payment: {
        method: order.payment_method || 'cod',
        status: order.payment_status || 'pending',
        financial_status: order.financial_status || 'unpaid',
        transaction_id: null
      },
      pricing: {
        subtotal: parseFloat(order.subtotal) || 0,
        tax: parseFloat(order.tax) || 0,
        shipping_fee: parseFloat(order.shipping_fee) || 0,
        discount: parseFloat(order.discount) || 0,
        total: parseFloat(order.total_amount) || 0,
        currency: order.currency || 'AED'
      },
      order_status: order.order_status || 'pending',
      items_count: order.items_count || 0,
      shipping_address: shippingAddress,
      items: (itemsResult.rows || []).map(item => ({
        id: item.id,
        product_name_snapshot: item.product_name_snapshot,
        price_snapshot: parseFloat(item.price_snapshot) || 0,
        quantity: item.quantity,
        total_price: parseFloat(item.total_price) || 0,
        variant_id: item.variant_id,
        shade: item.shade,
        variant_image: item.variant_image,
        product_id: item.product_id,
        product_name: item.product_name
      })),
      created_at: order.created_at,
      updated_at: order.updated_at
    };

    res.json(formattedResponse);
  } catch (err) {
    console.error("Error fetching admin order:", err);
    res.status(500).json({ message: "Error fetching order" });
  }
});

/**
 * PATCH /api/v1/orders/admin/:orderId/status
 * Update order status (Admin only)
 * 
 * Body: { "order_status": "shipped" }
 * Valid statuses: pending, confirmed, processing, shipped, delivered, cancelled
 */
router.patch("/orders/admin/:orderId/status", authenticateAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderId } = req.params;
    const { order_status } = req.body;

    // Validate status
    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!order_status || !validStatuses.includes(order_status)) {
      return res.status(400).json({
        message: "Invalid order status",
        valid_statuses: validStatuses
      });
    }

    await client.query("BEGIN");

    // Get current order status
    const currentOrder = await client.query(
      "SELECT id, order_status, financial_status FROM orders WHERE id = $1",
      [orderId]
    );

    if (currentOrder.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    const oldStatus = currentOrder.rows[0].order_status;
    const oldFinancialStatus = currentOrder.rows[0].financial_status;

    // Don't update if status is the same
    if (oldStatus === order_status) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Order already has this status" });
    }

    // Update order status
    await client.query(
      "UPDATE orders SET order_status = $1, updated_at = NOW() WHERE id = $2",
      [order_status, orderId]
    );

    // Record status change in history
    await client.query(`
      INSERT INTO order_status_history 
        (order_id, old_order_status, new_order_status, old_financial_status, new_financial_status, changed_at)
      VALUES ($1, $2, $3, $4, $4, NOW())
    `, [orderId, oldStatus, order_status, oldFinancialStatus]);

    await client.query("COMMIT");

    res.json({
      message: "Order status updated successfully",
      order_id: orderId,
      old_status: oldStatus,
      new_status: order_status
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Error updating order status" });
  } finally {
    client.release();
  }
});

/**
 * GET /api/v1/orders/admin/stats
 * Get order statistics (Admin only)
 */
router.get("/orders/admin/stats", authenticateAdmin, async (req, res) => {
  try {
    // Overall stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE order_status = 'pending')::int AS pending_orders,
        COUNT(*) FILTER (WHERE order_status = 'confirmed')::int AS confirmed_orders,
        COUNT(*) FILTER (WHERE order_status = 'processing')::int AS processing_orders,
        COUNT(*) FILTER (WHERE order_status = 'shipped')::int AS shipped_orders,
        COUNT(*) FILTER (WHERE order_status = 'delivered')::int AS delivered_orders,
        COUNT(*) FILTER (WHERE order_status = 'cancelled')::int AS cancelled_orders,
        COALESCE(SUM(total_amount), 0)::decimal AS total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::decimal AS paid_revenue
      FROM orders
    `);

    // Today's stats
    const todayResult = await pool.query(`
      SELECT 
        COUNT(*)::int AS orders_today,
        COALESCE(SUM(total_amount), 0)::decimal AS revenue_today
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    // This month's stats
    const monthResult = await pool.query(`
      SELECT 
        COUNT(*)::int AS orders_this_month,
        COALESCE(SUM(total_amount), 0)::decimal AS revenue_this_month
      FROM orders
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    res.json({
      overall: statsResult.rows[0],
      today: todayResult.rows[0],
      this_month: monthResult.rows[0]
    });
  } catch (err) {
    console.error("Error fetching order stats:", err);
    res.status(500).json({ message: "Error fetching order statistics" });
  }
});

module.exports = router;