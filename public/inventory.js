// Inventory Management JavaScript
// API_BASE is already defined in auth-config.js

let currentPage = 1;
let totalPages = 1;
let allProducts = [];
let filteredProducts = [];
let editingId = null;
let editingType = null; // 'product' or 'variant'
let showLowStockOnly = false;
let lowStockThreshold = 10;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadInventory();
  setupEventListeners();
});

function setupEventListeners() {
  // Search type selector
  const searchTypeSelect = document.getElementById('searchType');
  const searchInput = document.getElementById('searchInput');
  
  if (searchTypeSelect && searchInput) {
    searchTypeSelect.addEventListener('change', (e) => {
      const type = e.target.value;
      searchInput.placeholder = type === 'model_no' 
        ? 'Search products by model number...' 
        : 'Search products by name...';
      if (searchInput.value) {
        handleSearch();
      }
    });
  }

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }

  // Refresh
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadInventory();
    });
  }

  // Low stock filter
  const lowStockFilterBtn = document.getElementById('lowStockFilterBtn');
  if (lowStockFilterBtn) {
    lowStockFilterBtn.addEventListener('click', () => {
      showLowStockOnly = !showLowStockOnly;
      lowStockFilterBtn.style.background = showLowStockOnly ? '#ffebee' : '';
      lowStockFilterBtn.style.color = showLowStockOnly ? '#d32f2f' : '';
      filterAndRender();
    });
  }

  // Threshold select
  const thresholdSelect = document.getElementById('thresholdSelect');
  if (thresholdSelect) {
    thresholdSelect.addEventListener('change', (e) => {
      lowStockThreshold = parseInt(e.target.value);
      loadInventory();
    });
  }

  // Pagination
  const prevPage = document.getElementById('prevPage');
  const nextPage = document.getElementById('nextPage');
  if (prevPage) {
    prevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadInventory();
      }
    });
  }
  if (nextPage) {
    nextPage.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadInventory();
      }
    });
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function loadInventory() {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const searchInput = document.getElementById('searchInput');
  const searchTypeSelect = document.getElementById('searchType');
  const search = searchInput ? searchInput.value : '';
  const searchType = searchTypeSelect ? searchTypeSelect.value : 'name';

  // Build query parameters
  const params = new URLSearchParams({
    page: currentPage,
    limit: 20
  });

  if (search) {
    if (searchType === 'model_no') {
      params.append('model_no', search);
    } else {
      params.append('search', search);
    }
  }

  try {
    const tbody = document.getElementById('inventoryTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading inventory...</td></tr>';
    }

    const response = await fetch(
      `${API_BASE}/inventory/admin/products?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      allProducts = result.data || [];
      
      // Store pagination info
      if (result.pagination) {
        currentPage = result.pagination.page;
        totalPages = result.pagination.total_pages;
      }

      // Load low stock items
      await loadLowStockItems();

      // Update stats
      updateStats(result);
      
      // Filter and render
      filterAndRender();
    } else {
      showError('Failed to load inventory data');
    }
  } catch (error) {
    console.error('Load inventory error:', error);
    showError('Error loading inventory. Please try again.');
  }
}

async function loadLowStockItems() {
  const token = localStorage.getItem('adminToken');
  if (!token) return;

  try {
    const response = await fetch(
      `${API_BASE}/inventory/admin/low-stock?threshold=${lowStockThreshold}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        // Mark products as low stock
        const lowStockIds = new Set(result.data.map(p => p.product_id));
        allProducts.forEach(product => {
          product.isLowStock = lowStockIds.has(product.product_id);
          if (product.variants) {
            product.variants.forEach(variant => {
              variant.isLowStock = variant.stock <= lowStockThreshold;
            });
          }
        });

        // Update low stock UI
        updateLowStockUI(result.data.length);
      }
    }
  } catch (error) {
    console.error('Load low stock error:', error);
  }
}

function updateStats(result) {
  const totalProducts = result.pagination ? result.pagination.total : allProducts.length;
  let totalVariants = 0;
  let stockValue = 0;
  let lowStockCount = 0;

  allProducts.forEach(product => {
    if (product.variants) {
      totalVariants += product.variants.length;
      product.variants.forEach(v => {
        stockValue += (v.price * v.stock);
        if (v.stock <= lowStockThreshold) lowStockCount++;
      });
    }
    stockValue += (product.base_price * product.base_stock);
    if (product.base_stock <= lowStockThreshold) lowStockCount++;
  });

  document.getElementById('totalProducts').textContent = totalProducts;
  document.getElementById('totalVariants').textContent = totalVariants;
  document.getElementById('stockValue').textContent = 'AED ' + stockValue.toLocaleString('en-US', { maximumFractionDigits: 0 });
  
  const lowStockCard = document.getElementById('lowStockCard');
  const lowStockCountEl = document.getElementById('lowStockCount');
  if (lowStockCount > 0) {
    lowStockCard.style.display = 'block';
    lowStockCountEl.textContent = lowStockCount;
  } else {
    lowStockCard.style.display = 'none';
  }
}

function updateLowStockUI(count) {
  const banner = document.getElementById('lowStockBanner');
  const text = document.getElementById('lowStockText');
  
  if (count > 0) {
    banner.style.display = 'flex';
    text.textContent = `${count} items have stock at or below ${lowStockThreshold} units.`;
  } else {
    banner.style.display = 'none';
  }
}

function handleSearch() {
  currentPage = 1;
  loadInventory();
}

function filterAndRender() {
  if (showLowStockOnly) {
    filteredProducts = allProducts.filter(p => p.isLowStock || (p.variants && p.variants.some(v => v.isLowStock)));
  } else {
    filteredProducts = allProducts;
  }
  renderTable();
  updatePagination();
}

function renderTable() {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  if (filteredProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = filteredProducts.map(product => renderProductRow(product)).join('');
}

function renderProductRow(product) {
  const variantCount = product.variants ? product.variants.length : 0;
  const hasLowStock = product.isLowStock || (product.variants && product.variants.some(v => v.isLowStock));
  
  let statusBadge = '<span class="badge badge-success">In Stock</span>';
  if (product.base_stock === 0) {
    statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
  } else if (hasLowStock) {
    statusBadge = '<span class="badge badge-warning">Low Stock</span>';
  }

  const isEditing = editingId === product.product_id && editingType === 'product';

  return `
    <tr class="product-row ${hasLowStock ? 'low-stock' : ''}" data-product-id="${product.product_id}">
      <td>
        <button class="expand-btn" onclick="toggleVariants(${product.product_id})" id="expand-${product.product_id}">
          ▶
        </button>
      </td>
      <td>
        <div class="product-info">
          <img src="${product.thumbnail || ''}" alt="" class="product-thumb" onerror="this.style.background='#f5f5f5';this.src=''">
          <div class="product-details">
            <h4>${escapeHtml(product.product_name)}</h4>
            <span class="category">${escapeHtml(product.category_name || 'Uncategorized')}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="model-no">${escapeHtml(product.product_model_no || '-')}</span>
      </td>
      <td class="price-cell" data-product-id="${product.product_id}">
        <div class="price-display">
          <span class="current-price">AED ${parseFloat(product.base_price).toFixed(2)}</span>
          <input type="number" class="price-input edit-input" id="price-${product.product_id}" value="${product.base_price}" step="0.01" placeholder="Price" style="display: none;">
        </div>
      </td>
      <td class="stock-cell" data-product-id="${product.product_id}">
        <span class="stock-badge ${product.base_stock <= lowStockThreshold ? 'badge-danger' : 'badge-success'}">${product.base_stock}</span>
        <input type="number" class="stock-input edit-input ${product.base_stock <= lowStockThreshold ? 'low' : ''}" id="stock-${product.product_id}" value="${product.base_stock}" placeholder="Stock" style="display: none;">
      </td>
      <td>
        <span class="variant-badge">${variantCount}</span>
      </td>
      <td>${statusBadge}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="editProduct(${product.product_id})" title="Edit">✎</button>
          <button class="btn-icon save edit-save-btn" onclick="saveProduct(${product.product_id})" title="Save">✓</button>
          <button class="btn-icon cancel edit-cancel-btn" onclick="cancelEdit()" title="Cancel">✕</button>
        </div>
      </td>
    </tr>
    <tr class="variants-row" id="variants-${product.product_id}" style="display: none;">
      <td colspan="8">
        <div class="variants-container">
          ${renderVariants(product.variants, product.product_id)}
        </div>
      </td>
    </tr>
  `;
}

function renderVariants(variants, productId) {
  if (!variants || variants.length === 0) {
    return '<p style="color: var(--muted); text-align: center; padding: 20px;">No variants available</p>';
  }

  return variants.map(variant => {
    const isEditing = editingId === variant.id && editingType === 'variant';
    
    return `
      <div class="variant-item ${variant.isLowStock ? 'low-stock' : ''}" data-variant-id="${variant.id}">
        <img src="${variant.image || ''}" alt="" class="variant-thumb" onerror="this.style.background='#f5f5f5';this.src=''">
        <div class="variant-info">
          <h5>${escapeHtml(variant.shade || 'Variant')}</h5>
          <span class="model">${escapeHtml(variant.variant_model_no || '')}</span>
        </div>
        <div class="variant-actions">
          <label>Price:</label>
          <div class="price-wrapper">
            <span class="current-price">AED ${parseFloat(variant.price).toFixed(2)}</span>
            ${variant.discount_price ? `<span class="discount-price">AED ${parseFloat(variant.discount_price).toFixed(2)}</span>` : ''}
          </div>
          <input type="number" class="price-input edit-input" id="variant-price-${variant.id}" value="${variant.price}" step="0.01" placeholder="Price" style="display: none;">
        </div>
        <div class="variant-actions">
          <label>Discount:</label>
          ${variant.discount_price ? `<span class="discount-badge">-AED ${(variant.price - variant.discount_price).toFixed(2)}</span>` : '<span class="no-discount">-</span>'}
          <input type="number" class="price-input edit-input" id="variant-discount-${variant.id}" value="${variant.discount_price || ''}" step="0.01" placeholder="Discount" style="display: none;">
        </div>
        <div class="variant-actions">
          <label>Stock:</label>
          <span class="${variant.stock <= lowStockThreshold ? 'badge badge-danger' : 'badge badge-success'}">${variant.stock}</span>
          <select class="operation-select edit-input" id="variant-op-${variant.id}" style="display: none;">
            <option value="set">Set to</option>
            <option value="add">Add</option>
            <option value="subtract">Subtract</option>
          </select>
          <input type="number" class="stock-input edit-input ${variant.stock <= lowStockThreshold ? 'low' : ''}" id="variant-stock-${variant.id}" value="${variant.stock}" style="width: 70px; display: none;">
        </div>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="editVariant(${variant.id})" title="Edit">✎</button>
          <button class="btn-icon save edit-save-btn" onclick="saveVariant(${variant.id})" title="Save">✓</button>
          <button class="btn-icon cancel edit-cancel-btn" onclick="cancelEdit()" title="Cancel">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleVariants(productId) {
  const variantsRow = document.getElementById(`variants-${productId}`);
  const expandBtn = document.getElementById(`expand-${productId}`);
  
  if (variantsRow && expandBtn) {
    const isVisible = variantsRow.style.display !== 'none';
    variantsRow.style.display = isVisible ? 'none' : 'table-row';
    expandBtn.classList.toggle('expanded', !isVisible);
  }
}

function editProduct(productId) {
  // Close any open variant rows first
  document.querySelectorAll('.variants-row').forEach(row => {
    row.style.display = 'none';
  });
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.classList.remove('expanded');
  });
  
  // Close any other edit mode
  cancelEdit();
  
  editingId = productId;
  editingType = 'product';
  
  // Get product data to check for variants
  const product = allProducts.find(p => p.product_id === productId);
  const hasVariants = product && product.variants && product.variants.length > 0;
  
  // Toggle edit mode for this product row using DOM manipulation
  const row = document.querySelector(`tr[data-product-id="${productId}"]`);
  if (!row) return;
  
  // Toggle display elements
  const priceCell = row.querySelector('.price-cell');
  const stockCell = row.querySelector('.stock-cell');
  const actionBtns = row.querySelector('.action-btns');
  
  if (priceCell) {
    const displaySpan = priceCell.querySelector('.current-price');
    const input = priceCell.querySelector('.edit-input');
    if (displaySpan) displaySpan.style.display = 'none';
    if (input) input.style.display = 'block';
  }
  
  if (stockCell) {
    const displaySpan = stockCell.querySelector('.stock-badge');
    const input = stockCell.querySelector('.edit-input');
    if (displaySpan) displaySpan.style.display = 'none';
    
    // Only allow stock editing if no variants exist
    if (hasVariants) {
      if (input) {
        input.style.display = 'none';
        input.disabled = true;
      }
      // Show warning message
      const warning = document.createElement('span');
      warning.className = 'stock-warning';
      warning.textContent = 'Edit variant stocks instead';
      warning.style.cssText = 'color: #e74c3c; font-size: 0.8rem; font-style: italic;';
      stockCell.appendChild(warning);
    } else {
      if (input) input.style.display = 'block';
    }
  }
  
  if (actionBtns) {
    const editBtn = actionBtns.querySelector('.edit');
    const saveBtn = actionBtns.querySelector('.edit-save-btn');
    const cancelBtn = actionBtns.querySelector('.edit-cancel-btn');
    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  }
}

function editVariant(variantId) {
  // Close any other edit mode
  cancelEdit();
  
  editingId = variantId;
  editingType = 'variant';
  
  // Toggle edit mode for this variant using DOM manipulation
  const variantItem = document.querySelector(`.variant-item[data-variant-id="${variantId}"]`);
  if (!variantItem) return;
  
  // Toggle display elements
  const priceWrapper = variantItem.querySelector('.price-wrapper');
  const priceInput = variantItem.querySelector('.edit-input[id*="variant-price-"]');
  const discountSpan = variantItem.querySelector('.discount-badge, .no-discount');
  const discountInput = variantItem.querySelector('.edit-input[id*="variant-discount-"]');
  const stockSpan = variantItem.querySelector('.badge');
  const stockInput = variantItem.querySelector('.edit-input[id*="variant-stock-"]');
  const opSelect = variantItem.querySelector('.edit-input[id*="variant-op-"]');
  const actionBtns = variantItem.querySelector('.action-btns');
  
  if (priceWrapper) priceWrapper.style.display = 'none';
  if (priceInput) priceInput.style.display = 'block';
  if (discountSpan) discountSpan.style.display = 'none';
  if (discountInput) discountInput.style.display = 'block';
  if (stockSpan) stockSpan.style.display = 'none';
  if (stockInput) stockInput.style.display = 'block';
  if (opSelect) opSelect.style.display = 'block';
  
  if (actionBtns) {
    const editBtn = actionBtns.querySelector('.edit');
    const saveBtn = actionBtns.querySelector('.edit-save-btn');
    const cancelBtn = actionBtns.querySelector('.edit-cancel-btn');
    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  }
}

function cancelEdit() {
  if (!editingId) return;
  
  // Restore display for product
  if (editingType === 'product') {
    const row = document.querySelector(`tr[data-product-id="${editingId}"]`);
    if (row) {
      const priceCell = row.querySelector('.price-cell');
      const stockCell = row.querySelector('.stock-cell');
      const actionBtns = row.querySelector('.action-btns');
      
      if (priceCell) {
        const displaySpan = priceCell.querySelector('.current-price');
        const input = priceCell.querySelector('.edit-input');
        if (displaySpan) displaySpan.style.display = '';
        if (input) input.style.display = 'none';
      }
      
      if (stockCell) {
        const displaySpan = stockCell.querySelector('.stock-badge');
        const input = stockCell.querySelector('.edit-input');
        const warning = stockCell.querySelector('.stock-warning');
        
        if (displaySpan) displaySpan.style.display = '';
        if (input) input.style.display = 'none';
        if (input) input.disabled = false;
        if (warning) warning.remove();
      }
      
      if (actionBtns) {
        const editBtn = actionBtns.querySelector('.edit');
        const saveBtn = actionBtns.querySelector('.edit-save-btn');
        const cancelBtn = actionBtns.querySelector('.edit-cancel-btn');
        if (editBtn) editBtn.style.display = 'inline-flex';
        if (saveBtn) saveBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
      }
    }
  }
  
  // Restore display for variant
  if (editingType === 'variant') {
    const variantItem = document.querySelector(`.variant-item[data-variant-id="${editingId}"]`);
    if (variantItem) {
      const priceWrapper = variantItem.querySelector('.price-wrapper');
      const priceInput = variantItem.querySelector('.edit-input[id*="variant-price-"]');
      const discountSpan = variantItem.querySelector('.discount-badge, .no-discount');
      const discountInput = variantItem.querySelector('.edit-input[id*="variant-discount-"]');
      const stockSpan = variantItem.querySelector('.badge');
      const stockInput = variantItem.querySelector('.edit-input[id*="variant-stock-"]');
      const opSelect = variantItem.querySelector('.edit-input[id*="variant-op-"]');
      const actionBtns = variantItem.querySelector('.action-btns');
      
      if (priceWrapper) priceWrapper.style.display = '';
      if (priceInput) priceInput.style.display = 'none';
      if (discountSpan) discountSpan.style.display = '';
      if (discountInput) discountInput.style.display = 'none';
      if (stockSpan) stockSpan.style.display = '';
      if (stockInput) stockInput.style.display = 'none';
      if (opSelect) opSelect.style.display = 'none';
      
      if (actionBtns) {
        const editBtn = actionBtns.querySelector('.edit');
        const saveBtn = actionBtns.querySelector('.edit-save-btn');
        const cancelBtn = actionBtns.querySelector('.edit-cancel-btn');
        if (editBtn) editBtn.style.display = 'inline-flex';
        if (saveBtn) saveBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
      }
    }
  }
  
  editingId = null;
  editingType = null;
}

async function saveProduct(productId) {
  const token = localStorage.getItem('adminToken');
  if (!token) return;

  const priceInput = document.getElementById(`price-${productId}`);
  const stockInput = document.getElementById(`stock-${productId}`);
  
  // Get product data
  const product = allProducts.find(p => p.product_id === productId);
  const hasVariants = product && product.variants && product.variants.length > 0;
  const oldBasePrice = product ? product.base_price : 0;

  let priceUpdated = false;
  let stockUpdated = false;
  let newBasePrice = oldBasePrice;

  // Show loader
  showSaveLoader('Updating price...');

  if (priceInput) {
    const price = parseFloat(priceInput.value);
    if (!isNaN(price) && price >= 0) {
      try {
        const response = await fetch(`${API_BASE}/inventory/admin/products/${productId}/base-price`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ base_price: price })
        });

        if (!response.ok) throw new Error('Failed to update price');
        priceUpdated = true;
        newBasePrice = price;
      } catch (error) {
        console.error('Update price error:', error);
        hideSaveLoader();
        showError('Failed to update price');
        return;
      }
    }
  }

  // Only update stock if no variants exist
  if (stockInput && !hasVariants) {
    updateSaveLoader('Updating stock...');
    const stock = parseInt(stockInput.value);
    if (!isNaN(stock) && stock >= 0) {
      try {
        const response = await fetch(`${API_BASE}/inventory/admin/products/${productId}/base-stock`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ base_stock: stock, operation: 'set' })
        });

        if (!response.ok) throw new Error('Failed to update stock');
        stockUpdated = true;
      } catch (error) {
        console.error('Update stock error:', error);
        hideSaveLoader();
        showError('Failed to update stock');
        return;
      }
    }
  }
  
  // If base price changed and product has variants, update all variant prices
  // Logic: preserve discount percentage, set variant discount_price = new base price, calculate original price from discount %
  if (priceUpdated && hasVariants && newBasePrice !== oldBasePrice) {
    updateSaveLoader('Updating variant prices...');
    
    for (const variant of product.variants) {
      let newVariantPrice;
      let newVariantDiscount = null;
      
      if (variant.discount_price && variant.price > 0) {
        // Variant has discount: preserve discount percentage
        // discount_ratio = discount_price / original_price (e.g. 30/60 = 0.5 means 50% discount)
        const discountRatio = variant.discount_price / variant.price;
        // New discount_price = new base price
        newVariantDiscount = newBasePrice;
        // New original_price = new_base_price / discount_ratio (e.g. 50/0.5 = 100)
        newVariantPrice = parseFloat((newBasePrice / discountRatio).toFixed(2));
      } else {
        // No discount: variant price = new base price
        newVariantPrice = newBasePrice;
      }
      
      try {
        // Update variant price
        await fetch(`${API_BASE}/inventory/admin/variants/${variant.id}/price`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ price: newVariantPrice })
        });
        
        // Update variant discount if exists
        if (newVariantDiscount) {
          await fetch(`${API_BASE}/inventory/admin/variants/${variant.id}/discount-price`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ discount_price: newVariantDiscount })
          });
        }
      } catch (error) {
        console.error('Failed to update variant price:', error);
      }
    }
    
    // Reload inventory to show updated variant prices
    updateSaveLoader('Refreshing inventory...');
    await loadInventory();
  }

  // Update display values directly without re-rendering
  if (priceUpdated && priceInput) {
    const row = document.querySelector(`tr[data-product-id="${productId}"]`);
    if (row) {
      const displaySpan = row.querySelector('.current-price');
      if (displaySpan) {
        displaySpan.textContent = `AED ${parseFloat(priceInput.value).toFixed(2)}`;
      }
    }
  }

  if (stockUpdated && stockInput) {
    const row = document.querySelector(`tr[data-product-id="${productId}"]`);
    if (row) {
      const displaySpan = row.querySelector('.stock-badge');
      if (displaySpan) {
        displaySpan.textContent = stockInput.value;
        // Update badge color based on new stock value
        const stockValue = parseInt(stockInput.value);
        displaySpan.className = `stock-badge ${stockValue <= lowStockThreshold ? 'badge-danger' : 'badge-success'}`;
      }
    }
  }

  // Exit edit mode without re-rendering
  cancelEdit();
  hideSaveLoader();
  showSuccess('Product updated successfully');
}

async function saveVariant(variantId) {
  const token = localStorage.getItem('adminToken');
  if (!token) return;

  const priceInput = document.getElementById(`variant-price-${variantId}`);
  const discountInput = document.getElementById(`variant-discount-${variantId}`);
  const stockInput = document.getElementById(`variant-stock-${variantId}`);
  const opSelect = document.getElementById(`variant-op-${variantId}`);

  let priceUpdated = false;
  let discountUpdated = false;
  let stockUpdated = false;

  // Show loader
  showSaveLoader('Updating variant price...');

  // Update price if changed
  if (priceInput) {
    const price = parseFloat(priceInput.value);
    if (!isNaN(price) && price >= 0) {
      try {
        const response = await fetch(`${API_BASE}/inventory/admin/variants/${variantId}/price`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ price: price })
        });

        if (!response.ok) throw new Error('Failed to update variant price');
        priceUpdated = true;
      } catch (error) {
        console.error('Update variant price error:', error);
        hideSaveLoader();
        showError('Failed to update variant price');
        return;
      }
    }
  }

  // Update discount price if changed
  if (discountInput) {
    updateSaveLoader('Updating discount...');
    const discountPrice = parseFloat(discountInput.value);
    if (!isNaN(discountPrice) && discountPrice >= 0) {
      try {
        const response = await fetch(`${API_BASE}/inventory/admin/variants/${variantId}/discount-price`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ discount_price: discountPrice })
        });

        if (!response.ok) throw new Error('Failed to update variant discount price');
        discountUpdated = true;
      } catch (error) {
        console.error('Update variant discount price error:', error);
        hideSaveLoader();
        showError('Failed to update variant discount price');
        return;
      }
    }
  }

  // Update stock
  if (stockInput && opSelect) {
    updateSaveLoader('Updating stock...');
    const stock = parseInt(stockInput.value);
    const operation = opSelect.value;
    
    if (!isNaN(stock) && stock >= 0) {
      try {
        const response = await fetch(`${API_BASE}/inventory/admin/variants/${variantId}/stock`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ stock: stock, operation: operation })
        });

        if (!response.ok) throw new Error('Failed to update variant stock');
        stockUpdated = true;
      } catch (error) {
        console.error('Update variant stock error:', error);
        hideSaveLoader();
        showError('Failed to update variant stock');
        return;
      }
    }
  }

  // Update display values directly without re-rendering
  const variantItem = document.querySelector(`.variant-item[data-variant-id="${variantId}"]`);
  if (!variantItem) {
    cancelEdit();
    showSuccess('Variant updated successfully');
    return;
  }

  if (priceUpdated && priceInput) {
    const displaySpan = variantItem.querySelector('.current-price');
    if (displaySpan) {
      displaySpan.textContent = `AED ${parseFloat(priceInput.value).toFixed(2)}`;
    }
  }

  if (discountUpdated && discountInput) {
    const discountBadge = variantItem.querySelector('.discount-badge');
    const noDiscountSpan = variantItem.querySelector('.no-discount');
    const discountPriceSpan = variantItem.querySelector('.discount-price');
    
    if (discountInput.value) {
      // Show discount badge and discount price
      if (discountBadge) {
        const priceValue = parseFloat(priceInput ? priceInput.value : 0);
        discountBadge.textContent = `-AED ${(priceValue - parseFloat(discountInput.value)).toFixed(2)}`;
        discountBadge.style.display = '';
      }
      if (noDiscountSpan) noDiscountSpan.style.display = 'none';
      if (discountPriceSpan) {
        discountPriceSpan.textContent = `AED ${parseFloat(discountInput.value).toFixed(2)}`;
        discountPriceSpan.style.display = '';
      }
    } else {
      // Hide discount
      if (discountBadge) discountBadge.style.display = 'none';
      if (noDiscountSpan) noDiscountSpan.style.display = '';
      if (discountPriceSpan) discountPriceSpan.style.display = 'none';
    }
  }

  if (stockUpdated && stockInput) {
    const displaySpan = variantItem.querySelector('.badge');
    if (displaySpan) {
      displaySpan.textContent = stockInput.value;
      // Update badge color based on new stock value
      const stockValue = parseInt(stockInput.value);
      displaySpan.className = `badge ${stockValue <= lowStockThreshold ? 'badge-danger' : 'badge-success'}`;
    }
  }

  // Exit edit mode without re-rendering
  cancelEdit();
  hideSaveLoader();
  showSuccess('Variant updated successfully');
}

function updatePagination() {
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function showError(message) {
  // Simple alert for now - could be replaced with a toast notification
  alert('Error: ' + message);
}

function showSuccess(message) {
  // Simple alert for now - could be replaced with a toast notification
  alert(message);
}

function showSaveLoader(text) {
  const loader = document.getElementById('saveLoader');
  const loaderText = document.getElementById('saveLoaderText');
  if (loader) {
    if (loaderText) loaderText.textContent = text || 'Saving changes...';
    loader.style.display = 'flex';
  }
}

function updateSaveLoader(text) {
  const loaderText = document.getElementById('saveLoaderText');
  if (loaderText) loaderText.textContent = text;
}

function hideSaveLoader() {
  const loader = document.getElementById('saveLoader');
  if (loader) loader.style.display = 'none';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Expose functions to window for onclick handlers
window.toggleVariants = toggleVariants;
window.editProduct = editProduct;
window.editVariant = editVariant;
window.cancelEdit = cancelEdit;
window.saveProduct = saveProduct;
window.saveVariant = saveVariant;
