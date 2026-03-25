// Orders Management

let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

// DOM Elements
const ordersTableBody = document.getElementById('ordersTableBody');
const orderCount = document.getElementById('orderCount');
const paginationInfo = document.getElementById('paginationInfo');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const orderModal = document.getElementById('orderModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  loadOrders();
  setupEventListeners();
});

function setupEventListeners() {
  // Filters
  document.getElementById('applyFilters').addEventListener('click', applyFilters);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
  
  // Search on Enter
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyFilters();
  });

  // Pagination
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadOrders();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadOrders();
    }
  });

  // Modal
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  orderModal.addEventListener('click', (e) => {
    if (e.target === orderModal) closeModal();
  });
}

async function loadOrders() {
  ordersTableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading orders...</td></tr>';

  const params = new URLSearchParams({
    page: currentPage,
    limit: 20,
    _test_admin_id: 1,  // For testing - remove in production with real JWT
    ...currentFilters
  });

  // Remove empty params
  for (const [key, value] of [...params.entries()]) {
    if (!value) params.delete(key);
  }

  try {
    const response = await fetchWithAuth(`/orders/admin/all?${params}`);

    if (!response) return; // fetchWithAuth handles 401 and redirects

    const result = await response.json();
    renderOrders(result.data);
    updatePagination(result);
    orderCount.textContent = `${result.pagination.total} orders`;

  } catch (error) {
    console.error('Error loading orders:', error);
    ordersTableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">Error loading orders</td></tr>';
  }
}

function renderOrders(orders) {
  if (!orders || orders.length === 0) {
    ordersTableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">No orders found</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.order_number}</strong></td>
      <td>
        <div class="customer-info">
          <span class="customer-name">${order.customer.name || 'Guest'}</span>
          <span class="customer-email">${order.customer.email || '-'}</span>
        </div>
      </td>
      <td>${formatDate(order.created_at)}</td>
      <td><span class="status-badge status-${order.order_status}">${order.order_status}</span></td>
      <td>
        <span class="status-badge payment-${order.payment.status}">${order.payment.status}</span>
        <br><small>${order.payment.method.toUpperCase()}</small>
      </td>
      <td><strong>${order.pricing.currency} ${parseFloat(order.pricing.total).toFixed(2)}</strong></td>
      <td>
        <button class="action-btn view-btn" onclick="viewOrder('${order.id}')">View</button>
      </td>
    </tr>
  `).join('');
}

function updatePagination(result) {
  totalPages = result.pagination.total_pages || 1;
  currentPage = result.pagination.page;

  paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function applyFilters() {
  currentFilters = {
    search: document.getElementById('searchInput').value,
    order_status: document.getElementById('orderStatusFilter').value,
    payment_status: document.getElementById('paymentStatusFilter').value,
    payment_method: document.getElementById('paymentMethodFilter').value,
    date_from: document.getElementById('dateFrom').value,
    date_to: document.getElementById('dateTo').value
  };
  currentPage = 1;
  loadOrders();
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('orderStatusFilter').value = '';
  document.getElementById('paymentStatusFilter').value = '';
  document.getElementById('paymentMethodFilter').value = '';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  currentFilters = {};
  currentPage = 1;
  loadOrders();
}

async function viewOrder(orderId) {
  const content = document.getElementById('orderDetailContent');
  content.innerHTML = 'Loading...';
  orderModal.classList.add('active');

  try {
    const response = await fetchWithAuth(`/orders/admin/${orderId}?_test_admin_id=1`);

    if (!response) return; // fetchWithAuth handles 401 and redirects

    const order = await response.json();
    renderOrderDetail(order);

  } catch (error) {
    console.error('Error loading order:', error);
    content.innerHTML = '<p>Error loading order details</p>';
  }
}

function renderOrderDetail(order) {
  // Validate and normalize order data
  if (!order || typeof order !== 'object') {
    document.getElementById('orderDetailContent').innerHTML = '<p>Error: Invalid order data</p>';
    return;
  }

  // Set safe defaults for nested objects
  const payment = order.payment || { method: 'N/A', status: 'N/A', financial_status: 'N/A' };
  const pricing = order.pricing || { subtotal: 0, tax: 0, shipping_fee: 0, discount: 0, total: 0, currency: 'AED' };
  const customer = order.customer || { name: 'Guest', email: 'N/A', phone: 'N/A' };
  const address = order.shipping_address || {};
  
  document.getElementById('modalOrderNumber').textContent = order.order_number || 'N/A';
  
  document.getElementById('orderDetailContent').innerHTML = `
    <div class="detail-section">
      <h3>Order Information</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Order Number</span>
          <span class="detail-value">${order.order_number || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formatDateTime(order.created_at) || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Order Status</span>
          <span class="detail-value">
            <span class="status-badge status-${order.order_status || 'pending'}">${order.order_status || 'N/A'}</span>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Payment</span>
          <span class="detail-value">
            <span class="status-badge payment-${payment.status || 'pending'}">${payment.status || 'N/A'}</span>
            (${(payment.method || 'N/A').toUpperCase()})
          </span>
        </div>
      </div>
      
      <div class="status-update">
        <select id="newStatus">
          <option value="">Update Status...</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button class="btn btn-primary" onclick="updateOrderStatus('${order.id}')">Update</button>
      </div>
    </div>

    <div class="detail-section">
      <h3>Customer</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Name</span>
          <span class="detail-value">${customer.name || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Email</span>
          <span class="detail-value">${customer.email || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Phone</span>
          <span class="detail-value">${customer.phone || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Type</span>
          <span class="detail-value">${order.is_guest_order ? 'Guest' : 'Registered'}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Shipping Address</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Full Name</span>
          <span class="detail-value">${address.full_name || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Phone</span>
          <span class="detail-value">${address.phone || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Address</span>
          <span class="detail-value">${address.line1 || ''} ${address.line2 || ''}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">City / Emirate</span>
          <span class="detail-value">${address.city || ''}, ${address.emirate || ''}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Items (${(order.items || []).length})</h3>
      <div class="order-items-list">
        ${(order.items || []).map(item => `
          <div class="order-item">
            <img class="order-item-image" src="${item.variant_image || '/placeholder.jpg'}" alt="${item.product_name_snapshot || 'Product'}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f3ede1%22 width=%22100%22 height=%22100%22/></svg>'">
            <div class="order-item-details">
              <span class="order-item-name">${item.product_name_snapshot || 'N/A'}</span>
              <span class="order-item-variant">${item.shade ? `Shade: ${item.shade}` : ''} × ${item.quantity || 1}</span>
            </div>
            <div class="order-item-price">
              ${pricing.currency} ${parseFloat(item.total_price || 0).toFixed(2)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="detail-section">
      <h3>Order Summary</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Subtotal</span>
          <span class="detail-value">${pricing.currency} ${parseFloat(pricing.subtotal).toFixed(2)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Shipping</span>
          <span class="detail-value">${pricing.currency} ${parseFloat(pricing.shipping_fee).toFixed(2)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Tax</span>
          <span class="detail-value">${pricing.currency} ${parseFloat(pricing.tax).toFixed(2)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Discount</span>
          <span class="detail-value">- ${pricing.currency} ${parseFloat(pricing.discount).toFixed(2)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label"><strong>Total</strong></span>
          <span class="detail-value"><strong>${pricing.currency} ${parseFloat(pricing.total).toFixed(2)}</strong></span>
        </div>
      </div>
    </div>
  `;
}

async function updateOrderStatus(orderId) {
  const newStatus = document.getElementById('newStatus').value;
  if (!newStatus) {
    alert('Please select a status');
    return;
  }

  try {
    const response = await fetchWithAuth(`/orders/admin/${orderId}/status?_test_admin_id=1`, {
      method: 'PATCH',
      body: JSON.stringify({ order_status: newStatus })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'Failed to update status');
      return;
    }

    alert('Status updated successfully!');
    closeModal();
    loadOrders();

  } catch (error) {
    console.error('Error updating status:', error);
    alert('Error updating order status');
  }
}

function closeModal() {
  orderModal.classList.remove('active');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

