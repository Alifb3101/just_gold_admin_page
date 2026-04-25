// Contact Queries Management

let currentPage = 1;
let totalPages = 1;
let currentFilters = {};
let currentQueryId = null;

// DOM Elements
const queriesTableBody = document.getElementById('queriesTableBody');
const queryCount = document.getElementById('queryCount');
const paginationInfo = document.getElementById('paginationInfo');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const queryModal = document.getElementById('queryModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  loadQueries();
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
      loadQueries();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadQueries();
    }
  });

  // Modal
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('deleteQueryBtn').addEventListener('click', deleteCurrentQuery);
  queryModal.addEventListener('click', (e) => {
    if (e.target === queryModal) closeModal();
  });
}

async function loadQueries() {
  queriesTableBody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading queries...</td></tr>';

  const params = new URLSearchParams({
    page: currentPage,
    limit: 10,
    ...currentFilters
  });

  // Remove empty params
  for (const [key, value] of [...params.entries()]) {
    if (!value) params.delete(key);
  }

  try {
    const response = await fetchWithAuth(`/contact/admin/all?${params}`);

    if (!response) return; // fetchWithAuth handles 401 and redirects

    const result = await response.json();
    
    // Handle different response structures
    const queries = result.data || result.queries || result;
    const pagination = result.pagination || { page: 1, total_pages: 1, total: queries.length };
    
    renderQueries(queries);
    updatePagination(pagination);
    queryCount.textContent = `${pagination.total || queries.length} queries`;

  } catch (error) {
    console.error('Error loading queries:', error);
    queriesTableBody.innerHTML = '<tr><td colspan="6" class="loading-cell">Error loading queries</td></tr>';
  }
}

function renderQueries(queries) {
  if (!queries || queries.length === 0) {
    queriesTableBody.innerHTML = '<tr><td colspan="6" class="loading-cell">No queries found</td></tr>';
    return;
  }

  queriesTableBody.innerHTML = queries.map(query => {
    const id = query.id || query.query_id || '#';
    const name = query.name || query.full_name || 'Unknown';
    const email = query.email || '-';
    const subject = query.subject || 'No subject';
    const createdAt = query.created_at || query.createdAt || query.date;
    
    return `
    <tr>
      <td><strong>#${id}</strong></td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(email)}</td>
      <td>${escapeHtml(subject)}</td>
      <td>${formatDate(createdAt)}</td>
      <td>
        <button class="action-btn view-btn" onclick="viewQuery('${id}')">View</button>
      </td>
    </tr>
  `}).join('');
}

function updatePagination(pagination) {
  totalPages = pagination.total_pages || 1;
  currentPage = pagination.page || 1;

  paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function applyFilters() {
  currentFilters = {
    search: document.getElementById('searchInput').value,
    status: document.getElementById('statusFilter').value,
    date_from: document.getElementById('dateFrom').value,
    date_to: document.getElementById('dateTo').value
  };
  currentPage = 1;
  loadQueries();
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  currentFilters = {};
  currentPage = 1;
  loadQueries();
}

async function viewQuery(queryId) {
  currentQueryId = queryId;
  const content = document.getElementById('queryDetailContent');
  content.innerHTML = 'Loading...';
  queryModal.classList.add('active');

  try {
    const response = await fetchWithAuth(`/contact/admin/${queryId}`);

    if (!response) return; // fetchWithAuth handles 401 and redirects

    const payload = await response.json();
    const query = payload && payload.data ? payload.data : payload;
    renderQueryDetail(query);

  } catch (error) {
    console.error('Error loading query:', error);
    content.innerHTML = '<p>Error loading query details</p>';
  }
}

function renderQueryDetail(query) {
  if (!query || typeof query !== 'object') {
    document.getElementById('queryDetailContent').innerHTML = '<p>Error: Invalid query data</p>';
    return;
  }

  const id = query.id || query.query_id || currentQueryId;
  const name = query.name || query.full_name || 'Unknown';
  const email = query.email || 'N/A';
  const phone = query.phone || query.phone_number || 'N/A';
  const subject = query.subject || 'No subject';
  const message = query.message || query.content || 'No message';
  const createdAt = query.created_at || query.createdAt || query.date;

  document.getElementById('modalQueryTitle').textContent = `Query #${id}`;

  document.getElementById('queryDetailContent').innerHTML = `
    <div class="detail-section">
      <h3>Contact Information</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Name</span>
          <span class="detail-value">${escapeHtml(name)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Email</span>
          <span class="detail-value">${escapeHtml(email)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Phone</span>
          <span class="detail-value">${escapeHtml(phone)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formatDateTime(createdAt)}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Subject</h3>
      <p style="font-size: 1.1rem; font-weight: 500; color: var(--ink);">${escapeHtml(subject)}</p>
    </div>

    <div class="detail-section">
      <h3>Message</h3>
      <div style="background: #fffdf8; padding: 16px; border-radius: 12px; border: 1px solid var(--border); line-height: 1.6; white-space: pre-wrap;">
        ${escapeHtml(message)}
      </div>
    </div>
  `;
}

async function deleteCurrentQuery() {
  if (!currentQueryId) return;
  
  if (!confirm('Are you sure you want to delete this contact query? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetchWithAuth(`/contact/admin/${currentQueryId}`, {
      method: 'DELETE'
    });

    if (!response) return;

    alert('Query deleted successfully!');
    closeModal();
    loadQueries();

  } catch (error) {
    console.error('Error deleting query:', error);
    alert('Error deleting query');
  }
}

function closeModal() {
  queryModal.classList.remove('active');
  currentQueryId = null;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
