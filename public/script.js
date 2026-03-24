const API_BASE = "/api/v1";

const MAX_GALLERY = 6;
const selectedImages = [];
const PRODUCTS_LIMIT = 50;
let currentPage = 1;
let totalProductPages = 1;
let isLoadingProducts = false;
let categories = [];
const BEST_SELLER_SUBCATEGORY_ID = "3";
const TAG_CODE_REGEX = /^[A-Z0-9_-]{1,24}$/;

const categorySelectEl = document.getElementById("categorySelect");
const subcategorySelectEl = document.getElementById("subcategorySelect");
const categoryStatusEl = document.getElementById("categoryStatus");
const productListStatusEl = document.getElementById("productListStatus");
const productPaginationEl = document.getElementById("productPagination");
const productPaginationInfoEl = document.getElementById("productPaginationInfo");
const productFirstPageBtn = document.getElementById("productFirstPage");
const productPrevPageBtn = document.getElementById("productPrevPage");
const productNextPageBtn = document.getElementById("productNextPage");
const productLastPageBtn = document.getElementById("productLastPage");
const tagsInputEl = document.getElementById("tagsInput");
const bestSellerToggleEl = document.getElementById("bestSellerToggle");
const editTagsInputEl = document.getElementById("editTagsInput");
const editBestSellerToggleEl = document.getElementById("editBestSellerToggle");

function updateProductPagination(totalCount = 0) {
  currentPage = 1;
  totalProductPages = 1;

  if (productPaginationInfoEl) {
    productPaginationInfoEl.textContent = "All products";
  }

  if (productPaginationEl) {
    productPaginationEl.hidden = true;
  }

  if (productFirstPageBtn) {
    productFirstPageBtn.disabled = true;
  }
  if (productPrevPageBtn) {
    productPrevPageBtn.disabled = true;
  }
  if (productNextPageBtn) {
    productNextPageBtn.disabled = true;
  }
  if (productLastPageBtn) {
    productLastPageBtn.disabled = true;
  }
}

function getProductRangeText(loadedCount) {
  if (!loadedCount) {
    return "No products in the catalog";
  }

  return `Showing all ${loadedCount} products`;
}

function goToProductPage(page) {
  loadProducts();
}

function formatCurrency(value) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return `$${parsed.toFixed(2)}`;
}

function findParentCategoryId(childId) {
  if (!childId) return null;
  for (const cat of categories) {
    if (Array.isArray(cat.subcategories)) {
      const match = cat.subcategories.find(sub => String(sub.id) === String(childId));
      if (match) {
        return cat.id;
      }
    }
  }
  return null;
}

function buildTagsPayload(rawValue) {
  if (rawValue && typeof rawValue !== "string") {
    return { ok: false, message: "Tags value must be a JSON string" };
  }

  let parsed = [];
  if (rawValue && rawValue.trim()) {
    try {
      parsed = JSON.parse(rawValue.trim());
    } catch (err) {
      return { ok: false, message: "Tags must be valid JSON (array of tag objects)" };
    }

    if (!Array.isArray(parsed)) {
      return { ok: false, message: "Tags JSON must be an array" };
    }
  }

  const tags = [];
  const seen = new Set();

  for (const tag of parsed) {
    if (!tag || typeof tag !== "object") {
      return { ok: false, message: "Each tag must be an object" };
    }

    const type = tag.type;
    const code = typeof tag.code === "string" ? tag.code.toUpperCase() : "";

    if (type !== "country" && type !== "badge") {
      return { ok: false, message: "Tag type must be 'country' or 'badge'" };
    }
    if (!TAG_CODE_REGEX.test(code)) {
      return { ok: false, message: "Tag code must be 1-24 chars (A-Z, 0-9, _ or -)" };
    }

    const key = `${type}:${code}`;
    if (!seen.has(key)) {
      tags.push({ type, code });
      seen.add(key);
    }
  }

  if (tags.length > 20) {
    return { ok: false, message: "Maximum 20 tags allowed" };
  }

  return { ok: true, tags };
}

/* =========================
   LOAD CATEGORIES
========================= */

async function loadCategories() {
  if (!categorySelectEl || !subcategorySelectEl) return;
  if (categoryStatusEl) {
    categoryStatusEl.textContent = "Loading categories…";
  }

  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    categories = await res.json();
    categorySelectEl.innerHTML = "";
    subcategorySelectEl.innerHTML = "";

    if (!categories.length) {
      categorySelectEl.innerHTML = '<option value="">No categories found</option>';
      subcategorySelectEl.innerHTML = '<option value="">No subcategories</option>';
      if (categoryStatusEl) {
        categoryStatusEl.textContent = "No categories available";
      }
      return;
    }

    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      categorySelectEl.appendChild(option);
    });

    categorySelectEl.value = categories[0].id;
    const firstSubId = categories[0].subcategories?.[0]?.id;
    loadSubcategories(firstSubId);

    if (categoryStatusEl) {
      categoryStatusEl.textContent = `${categories.length} categories loaded`;
    }
  } catch (err) {
    console.error("Category Load Error:", err);
    categorySelectEl.innerHTML = '<option value="">Unavailable</option>';
    subcategorySelectEl.innerHTML = '<option value="">Unavailable</option>';
    if (categoryStatusEl) {
      categoryStatusEl.textContent = "Failed to load categories";
    }
  }
}

function loadSubcategories(selectedSubId) {
  if (!categorySelectEl || !subcategorySelectEl) return;
  const categoryId = categorySelectEl.value;

  subcategorySelectEl.innerHTML = "";

  if (!categoryId) {
    subcategorySelectEl.innerHTML = '<option value="">Select a category first</option>';
    return;
  }

  const selectedCategory = categories.find(c => String(c.id) === String(categoryId));

  if (!selectedCategory || !Array.isArray(selectedCategory.subcategories) || selectedCategory.subcategories.length === 0) {
    subcategorySelectEl.innerHTML = '<option value="">No subcategories</option>';
    return;
  }

  selectedCategory.subcategories.forEach(sub => {
    const option = document.createElement("option");
    option.value = sub.id;
    option.textContent = sub.name;
    if (selectedSubId && String(sub.id) === String(selectedSubId)) {
      option.selected = true;
    }
    subcategorySelectEl.appendChild(option);
  });

  if (!selectedSubId) {
    subcategorySelectEl.selectedIndex = 0;
  }
}

if (categorySelectEl) {
  categorySelectEl.addEventListener("change", () => loadSubcategories());
}

/* =========================
   LOAD PRODUCTS
========================= */

async function fetchProductsPage(page, limit) {
  const params = new URLSearchParams({ page, limit });
  const res = await fetch(`${API_BASE}/products?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchAllProducts() {
  const productsById = new Map();
  let page = 1;
  let guard = 0;
  const maxPages = 100;

  while (guard < maxPages) {
    const data = await fetchProductsPage(page, PRODUCTS_LIMIT);
    const products = Array.isArray(data.products) ? data.products : [];
    const reportedTotalPages = Number(data.total_pages) || 0;

    products.forEach((product) => {
      productsById.set(product.id, product);
    });

    const hasMoreFromTotal = reportedTotalPages > 0 ? page < reportedTotalPages : false;
    const hasMoreFromPage = products.length === PRODUCTS_LIMIT;

    if (!hasMoreFromTotal && !hasMoreFromPage) {
      break;
    }

    page += 1;
    guard += 1;
  }

  return Array.from(productsById.values());
}

async function loadProducts() {
  if (isLoadingProducts) {
    return;
  }

  isLoadingProducts = true;
  if (productListStatusEl) {
    productListStatusEl.textContent = "Loading products…";
  }

  try {
    const products = await fetchAllProducts();
    updateProductPagination(products.length);

    const container = document.getElementById("productList");
    if (!container) return;
    container.innerHTML = "";

    if (products.length === 0) {
      container.innerHTML = '<p class="meta">No products found.</p>';
      if (productListStatusEl) {
        productListStatusEl.textContent = "No products in the catalog";
      }
      return;
    }

    products.forEach(p => {
      const div = document.createElement("div");
      div.className = "product-item";

      div.innerHTML = `
        <strong>${p.name}</strong>
        <div class="product-meta-row">
          <span>${p.category || "Uncategorized"}</span>
          <span>${formatCurrency(p.base_price)}</span>
        </div>
        <p class="meta">${p.description || "No description"}</p>
        <div class="product-actions">
          <button class="edit-btn" onclick="editProduct('${p.slug}', ${p.id})">Edit</button>
          <button class="add-color-btn" data-product-id="${p.id}">+ Color</button>
          <button class="delete-btn" onclick="deleteProduct(${p.id})">Delete</button>
        </div>
      `;

      const quickBtn = div.querySelector(".add-color-btn");
      if (quickBtn) {
        quickBtn.addEventListener("click", () => openQuickVariant(p.id, p.name || "Product"));
      }

      container.appendChild(div);
    });

    if (productListStatusEl) {
      productListStatusEl.textContent = getProductRangeText(products.length);
    }
  } catch (err) {
    console.error("Load Products Error:", err);
    if (productListStatusEl) {
      productListStatusEl.textContent = "Failed to load products";
    }
  } finally {
    isLoadingProducts = false;
  }
}

if (productFirstPageBtn) {
  productFirstPageBtn.addEventListener("click", () => {
    goToProductPage(1);
  });
}

if (productPrevPageBtn) {
  productPrevPageBtn.addEventListener("click", () => {
    goToProductPage(currentPage - 1);
  });
}

if (productNextPageBtn) {
  productNextPageBtn.addEventListener("click", () => {
    goToProductPage(currentPage + 1);
  });
}

if (productLastPageBtn) {
  productLastPageBtn.addEventListener("click", () => {
    goToProductPage(totalProductPages);
  });
}

/* =========================
   GALLERY HANDLING
========================= */

const galleryInput = document.getElementById("galleryInput");
const galleryPreview = document.getElementById("galleryPreview");
const galleryCounter = document.getElementById("galleryCounter");
const videoInput = document.getElementById("videoInput");
const videoMeta = document.getElementById("videoMeta");

function setButtonLoading(button, isLoading, loadingText = "Loading…") {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    button.classList.add("is-loading");
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove("is-loading");
  }
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function updateGalleryCounter() {
  galleryCounter.textContent = `${selectedImages.length} / ${MAX_GALLERY} selected`;
}

function renderGallery() {
  galleryPreview.innerHTML = "";

  selectedImages.forEach((item, index) => {
    const tile = document.createElement("div");
    tile.className = "preview-tile";

    const img = document.createElement("img");
    const url = URL.createObjectURL(item.file);
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      selectedImages.splice(index, 1);
      renderGallery();
      updateGalleryCounter();
    });

    tile.appendChild(img);
    tile.appendChild(removeBtn);
    galleryPreview.appendChild(tile);
  });
}

galleryInput.addEventListener("change", () => {
  const files = Array.from(galleryInput.files || []);
  const existingKeys = new Set(selectedImages.map(item => item.key));

  files.forEach(file => {
    if (selectedImages.length >= MAX_GALLERY) {
      return;
    }
    const key = getFileKey(file);
    if (existingKeys.has(key)) {
      return;
    }
    selectedImages.push({ file, key });
    existingKeys.add(key);
  });

  galleryInput.value = "";
  renderGallery();
  updateGalleryCounter();
});

videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];
  if (!file) {
    videoMeta.textContent = "";
    return;
  }
  const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
  videoMeta.textContent = `${file.name} · ${sizeMb} MB`;
});

/* =========================
   VARIANT HANDLING
========================= */

function bindImagePreview(input, previewId) {
  input.addEventListener("change", function() {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    if (this.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="preview"><button type="button" class="remove-img" onclick="this.parentElement.innerHTML=''">✕</button>`;
      };
      reader.readAsDataURL(this.files[0]);
    } else {
      preview.innerHTML = "";
    }
  });
}

function addVariant() {
  const div = document.createElement("div");
  div.className = "variant";
  const variantId = Date.now();

  div.innerHTML = `
    <input type="text" placeholder="Color Name" class="color" required>
    <input type="text" placeholder="Type (optional, e.g. warm/cool)" class="variant-type">
    ${colorPanelFieldsMarkup()}
    <input type="text" placeholder="Variant Model No" class="variant-model-no" required>
    <input type="number" placeholder="Stock" class="stock" required>
    <input type="number" placeholder="Variant Price (optional)" class="price">
    <input type="number" placeholder="Discount Price (optional)" class="discount">
    <label class="variant-image-label">
      <span>Main Image</span>
      <input type="file" class="main-image" accept="image/*" data-variant-id="${variantId}">
    </label>
    <div class="variant-image-preview" id="preview-${variantId}"></div>
    <label class="variant-image-label">
      <span>Secondary Image (optional)</span>
      <input type="file" class="secondary-image" accept="image/*" data-variant-id="${variantId}">
    </label>
    <div class="variant-image-preview" id="secondary-preview-${variantId}"></div>
    <button type="button" onclick="removeVariant(this)">Remove</button>
  `;

  const mainImageInput = div.querySelector(".main-image");
  const secondaryImageInput = div.querySelector(".secondary-image");
  bindImagePreview(mainImageInput, `preview-${variantId}`);
  bindImagePreview(secondaryImageInput, `secondary-preview-${variantId}`);
  setupColorPanelFields(div.querySelector("[data-color-panel]"));

  document.getElementById("variants").appendChild(div);
}

function removeVariant(button) {
  button.parentElement.remove();
}

function colorPanelFieldsMarkup() {
  return `
    <div class="color-panel-fields" data-color-panel>
      <label class="field">
        <span>Color Panel Type</span>
        <select class="color-panel-type">
          <option value="hex" selected>Hex</option>
          <option value="gradient">Gradient</option>
          <option value="image">Image</option>
        </select>
      </label>
      <div class="color-panel-input" data-panel="hex">
        <label class="field compact-field">
          <span>Hex Value</span>
          <input type="text" class="color-panel-value-hex" value="#000000" placeholder="#000000">
        </label>
      </div>
      <div class="color-panel-input" data-panel="gradient">
        <label class="field">
          <span>CSS Gradient</span>
          <input type="text" class="color-panel-value-gradient" placeholder="linear-gradient(...) or radial-gradient(...)" />
        </label>
      </div>
      <div class="color-panel-input" data-panel="image">
        <div class="color-panel-image-inputs">
          <label class="variant-image-label">
            <span>Upload Image</span>
            <input type="file" class="color-panel-image-file" accept="image/*">
          </label>
          <p class="meta color-panel-image-current" hidden></p>
        </div>
      </div>
    </div>
  `;
}

function normalizeHexValue(value) {
  if (typeof value !== "string") return "#000000";
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }
  return "#000000";
}

function setupColorPanelFields(container, initialType = "hex", initialValue = "") {
  if (!container) return;
  const select = container.querySelector(".color-panel-type");
  const hexInput = container.querySelector(".color-panel-value-hex");
  const gradientInput = container.querySelector(".color-panel-value-gradient");
  const imageCurrent = container.querySelector(".color-panel-image-current");

  const showPanel = (type) => {
    container.querySelectorAll(".color-panel-input").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.panel === type);
    });
  };

  const typeToSet = initialType || "hex";
  select.value = typeToSet;

  if (typeToSet === "hex" && hexInput) {
    hexInput.value = initialValue ? normalizeHexValue(initialValue) : hexInput.value;
  }
  if (typeToSet === "gradient" && gradientInput && initialValue) {
    gradientInput.value = initialValue;
  }
  if (typeToSet === "image" && imageCurrent && initialValue) {
    imageCurrent.textContent = `Current: ${initialValue}`;
    imageCurrent.hidden = false;
    container.dataset.initialPanelValue = initialValue;
  }

  select.addEventListener("change", () => showPanel(select.value));
  showPanel(select.value);
}

function collectColorPanelData(variantEl, formData, variantIndex) {
  const typeSelect = variantEl.querySelector(".color-panel-type");
  const hexInput = variantEl.querySelector(".color-panel-value-hex");
  const gradientInput = variantEl.querySelector(".color-panel-value-gradient");
  const imageFileInput = variantEl.querySelector(".color-panel-image-file");

  const type = typeSelect ? (typeSelect.value || "hex") : "hex";
  let value = null;

  if (type === "hex" && hexInput) {
    value = hexInput.value.trim() || null;
  } else if (type === "gradient" && gradientInput) {
    value = gradientInput.value.trim() || null;
  } else if (type === "image") {
    if (imageFileInput && imageFileInput.files[0]) {
      formData.append(`color_panel_image_${variantIndex}`, imageFileInput.files[0]);
      value = null;
    }
    if ((!value || value === "") && variantEl.dataset.initialPanelValue) {
      value = variantEl.dataset.initialPanelValue;
    }
  }

  return {
    color_panel_type: type || null,
    color_panel_value: value || null
  };
}

/* =========================
   QUICK ADD VARIANT (PRODUCT LIST)
========================= */

let quickVariantProductId = null;
let quickVariantProductName = "";

function openQuickVariant(productId, productName = "Product") {
  quickVariantProductId = productId;
  quickVariantProductName = productName;

  const modal = document.getElementById("quickVariantModal");
  const title = document.getElementById("quickVariantTitle");
  if (title) {
    title.textContent = `Add Color · ${productName}`;
  }

  resetQuickVariantForm();

  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    const colorInput = modal.querySelector("#quickColor");
    if (colorInput) {
      colorInput.focus();
    }
  }
}

function closeQuickVariantModal() {
  const modal = document.getElementById("quickVariantModal");
  if (modal) {
    modal.classList.remove("active");
  }
  document.body.style.overflow = "";
  quickVariantProductId = null;
  quickVariantProductName = "";
}

function addQuickVariantBlock() {
  const list = document.getElementById("quickVariantsList");
  if (!list) return null;

  const uid = `qv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const variantId = uid;

  const div = document.createElement("div");
  div.className = "quick-variant variant";
  div.dataset.uid = uid;

  div.innerHTML = `
    <button type="button" class="remove-quick" aria-label="Remove" onclick="removeQuickVariant(this)">✕</button>
    <input type="text" placeholder="Color Name" class="color" required>
    <input type="text" placeholder="Type (optional)" class="variant-type">
    ${colorPanelFieldsMarkup()}
    <input type="text" placeholder="Variant Model No" class="variant-model-no" required>
    <input type="number" placeholder="Stock" class="stock" required>
    <input type="number" placeholder="Variant Price (optional)" class="price">
    <input type="number" placeholder="Discount Price (optional)" class="discount">
    <label class="variant-image-label">
      <span>Main Image</span>
      <input type="file" class="main-image" accept="image/*" data-variant-id="${variantId}">
    </label>
    <div class="variant-image-preview" id="preview-${variantId}"></div>
    <label class="variant-image-label">
      <span>Secondary Image (optional)</span>
      <input type="file" class="secondary-image" accept="image/*" data-variant-id="${variantId}">
    </label>
    <div class="variant-image-preview" id="secondary-preview-${variantId}"></div>
  `;

  const mainImageInput = div.querySelector(".main-image");
  const secondaryImageInput = div.querySelector(".secondary-image");
  bindImagePreview(mainImageInput, `preview-${variantId}`);
  bindImagePreview(secondaryImageInput, `secondary-preview-${variantId}`);
  setupColorPanelFields(div.querySelector("[data-color-panel]"));

  list.appendChild(div);
  return div;
}

function removeQuickVariant(button) {
  const block = button.closest(".quick-variant");
  if (!block) return;
  block.remove();

  const list = document.getElementById("quickVariantsList");
  if (list && list.querySelectorAll(".quick-variant").length === 0) {
    addQuickVariantBlock();
  }
}

function resetQuickVariantForm() {
  const form = document.getElementById("quickVariantForm");
  if (!form) return;
  form.reset();

  const list = document.getElementById("quickVariantsList");
  if (list) {
    list.innerHTML = "";
    addQuickVariantBlock();
  }
}

/* =========================
   CREATE PRODUCT
========================= */

document.getElementById("productForm")
  .addEventListener("submit", async (e) => {

  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  const wantsBestSeller = bestSellerToggleEl?.checked === true;
  const tagsResult = buildTagsPayload(tagsInputEl ? tagsInputEl.value : "");

  if (!tagsResult.ok) {
    alert(tagsResult.message);
    return;
  }

  if (tagsResult.tags.length) {
    formData.set("tags", JSON.stringify(tagsResult.tags));
  } else {
    formData.delete("tags");
  }

  if (wantsBestSeller) {
    formData.set("subcategory_id", BEST_SELLER_SUBCATEGORY_ID);
  } else {
    // If subcategory is not selected, remove it so category_id is used
    if (!formData.get("subcategory_id")) {
      formData.delete("subcategory_id");
    }
  }

  /* ---- Gallery Validation ---- */

  if (selectedImages.length > MAX_GALLERY) {
    alert(`Maximum ${MAX_GALLERY} gallery images allowed`);
    return;
  }

  /* ---- Variant Validation ---- */

  const variantElements = document.querySelectorAll(".variant");

  const variants = [];
  const submitBtn = form.querySelector(".submitBtn");

  for (let i = 0; i < variantElements.length; i++) {
    const div = variantElements[i];
    const color = div.querySelector(".color").value.trim();
    const variantType = div.querySelector(".variant-type").value.trim();
    const variantModelNo = div.querySelector(".variant-model-no").value.trim();
    const stock = div.querySelector(".stock").value;
    const price = div.querySelector(".price").value;
    const discount = div.querySelector(".discount").value;
    const mainImageInput = div.querySelector(".main-image");
    const secondaryImageInput = div.querySelector(".secondary-image");

    if (!color || !stock || !variantModelNo) {
      alert("Color name, variant model no, and stock are required");
      return;
    }

    const variantData = {
      color,
      variant_model_no: variantModelNo,
      stock: Number(stock),
      price: price ? Number(price) : null,
      discount_price: discount ? Number(discount) : null,
      variantIndex: i
    };

    if (variantType) {
      variantData.color_type = variantType;
    }

    const panelData = collectColorPanelData(div, formData, i);
    variantData.color_panel_type = panelData.color_panel_type;
    variantData.color_panel_value = panelData.color_panel_value;

    variants.push(variantData);

    // Add variant main image (color_0, color_1, ...)
    if (mainImageInput.files[0]) {
      formData.append(`color_${i}`, mainImageInput.files[0]);
    }

    // Add variant secondary image (color_secondary_0, color_secondary_1, ...)
    if (secondaryImageInput.files[0]) {
      formData.append(`color_secondary_${i}`, secondaryImageInput.files[0]);
    }
  }

  setButtonLoading(submitBtn, true, "Creating…");
  formData.append("variants", JSON.stringify(variants));

  formData.delete("gallery");
  formData.delete("video");

  selectedImages.forEach(item => {
    formData.append("gallery", item.file);
  });

  if (videoInput.files[0]) {
    formData.append("video", videoInput.files[0]);
  }

  /* ---- Submit to Backend ---- */

  try {
    const response = await fetch(`${API_BASE}/product`, {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message || "Error creating product");
      setButtonLoading(submitBtn, false);
      return;
    }

    alert("Product Created Successfully");

    form.reset();
    document.getElementById("variants").innerHTML = "";
    selectedImages.splice(0, selectedImages.length);
    renderGallery();
    updateGalleryCounter();
    videoMeta.textContent = "";

    loadProducts(1);

  } catch (error) {
    console.error("Create Product Error:", error);
    alert("Server Error");
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

/* =========================
   LOAD PRODUCTS
========================= */

/* =========================
   DELETE PRODUCT
========================= */

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  try {
    await fetch(`${API_BASE}/product/${id}`, {
      method: "DELETE"
    });

    loadProducts(currentPage);
  } catch (err) {
    console.error("Delete Error:", err);
  }
}

/* =========================
   EDIT PRODUCT
========================= */

let editingProductId = null;
let editSelectedImages = [];
let deleteMediaIds = [];
let deleteVariantIds = [];
let existingVariants = [];

function openEditModal() {
  document.getElementById("editModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
  document.body.style.overflow = "";
  resetEditForm();
}

function resetEditForm() {
  document.getElementById("editProductForm").reset();
  document.getElementById("editVariants").innerHTML = "";
  document.getElementById("editCurrentMedia").innerHTML = "";
  document.getElementById("editGalleryPreview").innerHTML = "";
  editingProductId = null;
  editSelectedImages = [];
  deleteMediaIds = [];
  deleteVariantIds = [];
  existingVariants = [];
  updateEditGalleryCounter();
}

async function editProduct(slug, productId) {
  if (!categories.length) {
    await loadCategories();
  }

  const editBtn = typeof event !== "undefined" ? event.target : null;
  const originalText = editBtn ? editBtn.textContent : "";
  if (editBtn) {
    editBtn.textContent = "Loading...";
    editBtn.disabled = true;
  }

  try {
    console.log("Fetching product by slug:", slug);
    const res = await fetch(`${API_BASE}/product/${productId}-${slug}`);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const responsePayload = await res.json();
    console.log("Product data:", responsePayload);
    const product = responsePayload.product || responsePayload;

    editingProductId = product.id || productId;
    existingVariants = product.variants || responsePayload.variants || [];
    const mediaItems = product.media || responsePayload.media || [];
    deleteMediaIds = [];
    deleteVariantIds = [];
    editSelectedImages = [];

    // Populate form fields
    document.getElementById("editProductId").value = editingProductId;
    document.getElementById("editName").value = product.name || "";
    document.getElementById("editDescription").value = product.description || "";
    document.getElementById("editHowToApply").value = product.how_to_apply || "";
    document.getElementById("editBenefits").value = product.benefits || "";
    document.getElementById("editKeyFeatures").value = product.product_description || "";
    document.getElementById("editIngredients").value = product.ingredients || "";
    document.getElementById("editModelNo").value = product.product_model_no || "";
    document.getElementById("editBasePrice").value = product.base_price || "";

    const rawTags = product.tags || responsePayload.tags;
    let normalizedTags = "";
    if (typeof rawTags === "string") {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          normalizedTags = JSON.stringify(parsed);
        }
      } catch (err) {
        normalizedTags = rawTags;
      }
    } else if (Array.isArray(rawTags)) {
      normalizedTags = JSON.stringify(rawTags);
    }

    if (editTagsInputEl) {
      editTagsInputEl.value = normalizedTags;
    }
    if (editBestSellerToggleEl) {
      editBestSellerToggleEl.checked = String(product.category_id) === BEST_SELLER_SUBCATEGORY_ID;
    }

    // Populate categories
    const editCategorySelect = document.getElementById("editCategorySelect");
    editCategorySelect.innerHTML = "";
    const resolvedParentCategoryId = product.parent_category_id || findParentCategoryId(product.category_id);
    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      if (resolvedParentCategoryId && String(cat.id) === String(resolvedParentCategoryId)) {
        option.selected = true;
      }
      editCategorySelect.appendChild(option);
    });

    loadEditSubcategories(product.category_id);
    const editSubSelect = document.getElementById("editSubcategorySelect");
    if (editSubSelect && product.category_id) {
      editSubSelect.value = product.category_id;
    }

    // Render existing media & variants
    renderEditCurrentMedia(mediaItems);
    renderEditExistingVariants(existingVariants);

    if (editBtn) {
      editBtn.textContent = originalText;
      editBtn.disabled = false;
    }

    openEditModal();
  } catch (err) {
    console.error("Edit Product Error:", err);
    alert("Error loading product details: " + err.message);
    if (editBtn) {
      editBtn.textContent = originalText;
      editBtn.disabled = false;
    }
  }
}

function loadEditSubcategories(selectedId) {
  const editCategorySelect = document.getElementById("editCategorySelect");
  const subSelect = document.getElementById("editSubcategorySelect");
  if (!editCategorySelect || !subSelect) return;

  const categoryId = editCategorySelect.value;
  subSelect.innerHTML = "";

  if (!categoryId) {
    subSelect.innerHTML = '<option value="">Select a category first</option>';
    return;
  }

  const selected = categories.find(c => String(c.id) === String(categoryId));
  if (!selected || !Array.isArray(selected.subcategories) || selected.subcategories.length === 0) {
    subSelect.innerHTML = '<option value="">No subcategories</option>';
    return;
  }

  selected.subcategories.forEach(sub => {
    const option = document.createElement("option");
    option.value = sub.id;
    option.textContent = sub.name;
    if (selectedId && String(sub.id) === String(selectedId)) {
      option.selected = true;
    }
    subSelect.appendChild(option);
  });

  if (!selectedId) {
    subSelect.selectedIndex = 0;
  }
}

const editCategorySelectEl = document.getElementById("editCategorySelect");
if (editCategorySelectEl) {
  editCategorySelectEl.addEventListener("change", () => loadEditSubcategories());
}

function renderEditCurrentMedia(media) {
  const container = document.getElementById("editCurrentMedia");
  container.innerHTML = "";

  if (media.length === 0) {
    container.innerHTML = '<p class="meta">No media uploaded yet</p>';
    return;
  }

  media.forEach(m => {
    const tile = document.createElement("div");
    tile.className = "media-tile";
    tile.dataset.id = m.id;

    tile.innerHTML = `
      <img src="${m.image_url}" alt="Product media">
      <button type="button" class="delete-media-btn" onclick="markMediaForDeletion(${m.id}, this)">
        <span>✕</span>
      </button>
    `;

    container.appendChild(tile);
  });
}

function markMediaForDeletion(mediaId, button) {
  const tile = button.closest(".media-tile");
  
  if (deleteMediaIds.includes(mediaId)) {
    deleteMediaIds = deleteMediaIds.filter(id => id !== mediaId);
    tile.classList.remove("marked-for-deletion");
    button.innerHTML = "<span>✕</span>";
  } else {
    deleteMediaIds.push(mediaId);
    tile.classList.add("marked-for-deletion");
    button.innerHTML = "<span>↩</span>";
  }
}

function renderEditExistingVariants(variants) {
  const container = document.getElementById("editVariants");
  container.innerHTML = "";

  variants.forEach((v, index) => {
    const div = document.createElement("div");
    div.className = "variant edit-variant";
    div.dataset.variantId = v.id;
    const variantUid = `edit-${v.id}`;

    div.innerHTML = `
      <input type="hidden" class="variant-db-id" value="${v.id}">
      <input type="text" placeholder="Color Name" class="color" value="${v.shade || ""}" required>
      <input type="text" placeholder="Type (warm/cool)" class="variant-type" value="${v.color_type || ""}">
      ${colorPanelFieldsMarkup()}
      <input type="text" placeholder="Variant Model No" class="variant-model-no" value="${v.variant_model_no || ""}">
      <input type="number" placeholder="Stock" class="stock" value="${v.stock || 0}" required>
      <input type="number" placeholder="Variant Price" class="price" value="${v.price || ""}">
      <input type="number" placeholder="Discount Price" class="discount" value="${v.discount_price || ""}">
      
      <div class="variant-current-images">
        ${v.main_image ? `<div class="current-img"><img src="${v.main_image}" alt="Main"><span>Current Main</span></div>` : ""}
        ${v.secondary_image ? `<div class="current-img"><img src="${v.secondary_image}" alt="Secondary"><span>Current Secondary</span></div>` : ""}
      </div>
      
      <label class="variant-image-label">
        <span>Replace Main Image</span>
        <input type="file" class="main-image" accept="image/*" data-variant-id="${variantUid}">
      </label>
      <div class="variant-image-preview" id="preview-${variantUid}"></div>
      
      <label class="variant-image-label">
        <span>Replace Secondary Image</span>
        <input type="file" class="secondary-image" accept="image/*" data-variant-id="${variantUid}">
      </label>
      <div class="variant-image-preview" id="secondary-preview-${variantUid}"></div>
      
      <button type="button" class="delete-variant-btn" onclick="markVariantForDeletion(${v.id}, this)">Delete Variant</button>
    `;

    const mainImageInput = div.querySelector(".main-image");
    const secondaryImageInput = div.querySelector(".secondary-image");
    bindImagePreview(mainImageInput, `preview-${variantUid}`);
    bindImagePreview(secondaryImageInput, `secondary-preview-${variantUid}`);
    setupColorPanelFields(div.querySelector("[data-color-panel]"), v.color_panel_type || "hex", v.color_panel_value || "");

    container.appendChild(div);
  });
}

function markVariantForDeletion(variantId, button) {
  const variantDiv = button.closest(".variant");
  
  if (deleteVariantIds.includes(variantId)) {
    deleteVariantIds = deleteVariantIds.filter(id => id !== variantId);
    variantDiv.classList.remove("marked-for-deletion");
    button.textContent = "Delete Variant";
  } else {
    deleteVariantIds.push(variantId);
    variantDiv.classList.add("marked-for-deletion");
    button.textContent = "Undo Delete";
  }
}

function addEditVariant() {
  const div = document.createElement("div");
  div.className = "variant new-variant";
  const variantId = `new-${Date.now()}`;

  div.innerHTML = `
    <span class="new-variant-badge">NEW</span>
    <input type="text" placeholder="Color Name" class="color" required>
    <input type="text" placeholder="Type (warm/cool)" class="variant-type">
    ${colorPanelFieldsMarkup()}
    <input type="text" placeholder="Variant Model No" class="variant-model-no">
    <input type="number" placeholder="Stock" class="stock" required>
    <input type="number" placeholder="Variant Price" class="price">
    <input type="number" placeholder="Discount Price" class="discount">
    <label class="variant-image-label">
      <span>Main Image</span>
      <input type="file" class="main-image" accept="image/*" data-variant-id="${variantId}">
    </label>
    <div class="variant-image-preview" id="preview-${variantId}"></div>
    <label class="variant-image-label">
      <span>Secondary Image</span>
      <input type="file" class="secondary-image" accept="image/*" data-variant-id="${variantId}">
    </label>
    <div class="variant-image-preview" id="secondary-preview-${variantId}"></div>
    <button type="button" onclick="this.parentElement.remove()">Remove</button>
  `;

  const mainImageInput = div.querySelector(".main-image");
  const secondaryImageInput = div.querySelector(".secondary-image");
  bindImagePreview(mainImageInput, `preview-${variantId}`);
  bindImagePreview(secondaryImageInput, `secondary-preview-${variantId}`);
  setupColorPanelFields(div.querySelector("[data-color-panel]"));

  document.getElementById("editVariants").appendChild(div);
}

// Edit gallery handling
const editGalleryInput = document.getElementById("editGalleryInput");
const editGalleryPreview = document.getElementById("editGalleryPreview");

function updateEditGalleryCounter() {
  const counter = document.getElementById("editGalleryCounter");
  if (counter) {
    counter.textContent = `${editSelectedImages.length} selected`;
  }
}

function renderEditGalleryPreview() {
  editGalleryPreview.innerHTML = "";

  editSelectedImages.forEach((item, index) => {
    const tile = document.createElement("div");
    tile.className = "preview-tile";

    const img = document.createElement("img");
    const url = URL.createObjectURL(item.file);
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      editSelectedImages.splice(index, 1);
      renderEditGalleryPreview();
      updateEditGalleryCounter();
    });

    tile.appendChild(img);
    tile.appendChild(removeBtn);
    editGalleryPreview.appendChild(tile);
  });
}

editGalleryInput.addEventListener("change", () => {
  const files = Array.from(editGalleryInput.files || []);
  const existingKeys = new Set(editSelectedImages.map(item => item.key));

  files.forEach(file => {
    const key = getFileKey(file);
    if (!existingKeys.has(key)) {
      editSelectedImages.push({ file, key });
      existingKeys.add(key);
    }
  });

  editGalleryInput.value = "";
  renderEditGalleryPreview();
  updateEditGalleryCounter();
});

// Edit form submission
document.getElementById("editProductForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    const saveBtn = document.querySelector("#editProductForm .btn-primary");
    setButtonLoading(saveBtn, true, "Saving…");
    
    // Add basic fields
    formData.append("name", document.getElementById("editName").value);
    formData.append("description", document.getElementById("editDescription").value);
    formData.append("how_to_apply", document.getElementById("editHowToApply").value);
    formData.append("benefits", document.getElementById("editBenefits").value);
    formData.append("product_description", document.getElementById("editKeyFeatures").value);
    formData.append("ingredients", document.getElementById("editIngredients").value);
    formData.append("product_model_no", document.getElementById("editModelNo").value);
    formData.append("base_price", document.getElementById("editBasePrice").value);
    formData.append("media_provider", document.getElementById("editMediaProvider").value);

    const wantsBestSellerEdit = editBestSellerToggleEl?.checked === true;
    const editTagsRaw = editTagsInputEl ? editTagsInputEl.value : "";
    const editTagsResult = buildTagsPayload(editTagsRaw);

    if (!editTagsResult.ok) {
      alert(editTagsResult.message);
      setButtonLoading(saveBtn, false);
      return;
    }

    const editSubcategoryId = wantsBestSellerEdit
      ? BEST_SELLER_SUBCATEGORY_ID
      : document.getElementById("editSubcategorySelect").value;

    if (editSubcategoryId) {
      formData.append("subcategory_id", editSubcategoryId);
    }

    if (editTagsResult.tags.length) {
      formData.append("tags", JSON.stringify(editTagsResult.tags));
    }

    // Add media deletion IDs
    if (deleteMediaIds.length > 0) {
      formData.append("delete_media_ids", JSON.stringify(deleteMediaIds));
    }

    // Add variant deletion IDs
    if (deleteVariantIds.length > 0) {
      formData.append("delete_variant_ids", JSON.stringify(deleteVariantIds));
    }

    // Add new gallery images
    editSelectedImages.forEach(item => {
      formData.append("gallery", item.file);
    });

    // Collect variants
    const variantElements = document.querySelectorAll("#editVariants .variant:not(.marked-for-deletion)");
    const variants = [];
    let variantIndex = 0;

    variantElements.forEach((div) => {
      const dbId = div.querySelector(".variant-db-id");
      const color = div.querySelector(".color").value.trim();
      const variantType = div.querySelector(".variant-type").value.trim();
      const variantModelNo = div.querySelector(".variant-model-no").value.trim();
      const stock = div.querySelector(".stock").value;
      const price = div.querySelector(".price").value;
      const discount = div.querySelector(".discount").value;
      const mainImageInput = div.querySelector(".main-image");
      const secondaryImageInput = div.querySelector(".secondary-image");

      if (!color) return;

      const variantData = {
        color,
        stock: Number(stock) || 0,
        variant_model_no: variantModelNo || null,
        price: price ? Number(price) : null,
        discount_price: discount ? Number(discount) : null,
        color_type: variantType || null
      };

      const panelData = collectColorPanelData(div, formData, variantIndex);
      variantData.color_panel_type = panelData.color_panel_type;
      variantData.color_panel_value = panelData.color_panel_value;

      // Include ID for existing variants
      if (dbId) {
        variantData.id = Number(dbId.value);
      }

      variants.push(variantData);

      // Add variant images
      if (mainImageInput && mainImageInput.files[0]) {
        formData.append(`color_${variantIndex}`, mainImageInput.files[0]);
      }
      if (secondaryImageInput && secondaryImageInput.files[0]) {
        formData.append(`color_secondary_${variantIndex}`, secondaryImageInput.files[0]);
      }

      variantIndex++;
    });

    formData.append("variants", JSON.stringify(variants));

    try {
      const response = await fetch(`${API_BASE}/product/${editingProductId}`, {
        method: "PUT",
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Error updating product");
        setButtonLoading(saveBtn, false);
        return;
      }

      alert("Product Updated Successfully");
      closeEditModal();
      loadProducts(currentPage);

    } catch (error) {
      console.error("Update Product Error:", error);
      alert("Server Error");
    } finally {
      setButtonLoading(saveBtn, false);
    }
  });

// Quick add variant form (from product list)
const quickVariantForm = document.getElementById("quickVariantForm");
if (quickVariantForm) {
  const addMoreBtn = document.getElementById("quickAddVariantBtn");
  if (addMoreBtn) {
    addMoreBtn.addEventListener("click", () => {
      const block = addQuickVariantBlock();
      if (block) {
        block.scrollIntoView({ behavior: "smooth", block: "center" });
        const colorInput = block.querySelector(".color");
        if (colorInput) colorInput.focus();
      }
    });
  }

  quickVariantForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!quickVariantProductId) {
      alert("Select a product to add a color");
      return;
    }

    const formData = new FormData();
    const blocks = quickVariantForm.querySelectorAll("#quickVariantsList .quick-variant");
    if (!blocks.length) {
      alert("Add at least one color variant");
      return;
    }

    const variantsPayload = [];
    let variantIndex = 0;

    for (const block of blocks) {
      const color = block.querySelector(".color")?.value.trim();
      const variantType = block.querySelector(".variant-type")?.value.trim();
      const variantModelNo = block.querySelector(".variant-model-no")?.value.trim();
      const stock = block.querySelector(".stock")?.value;
      const price = block.querySelector(".price")?.value;
      const discount = block.querySelector(".discount")?.value;
      const mainImageInput = block.querySelector(".main-image");
      const secondaryImageInput = block.querySelector(".secondary-image");

      if (!color || !variantModelNo || !stock) {
        alert("Color name, model no, and stock are required for each variant");
        return;
      }

      const variantData = {
        color,
        variant_model_no: variantModelNo,
        stock: Number(stock),
        price: price ? Number(price) : null,
        discount_price: discount ? Number(discount) : null,
        color_type: variantType || null
      };

      const panelData = collectColorPanelData(block, formData, variantIndex);
      variantData.color_panel_type = panelData.color_panel_type;
      variantData.color_panel_value = panelData.color_panel_value;

      if (mainImageInput && mainImageInput.files[0]) {
        formData.append(`color_${variantIndex}`, mainImageInput.files[0]);
      }
      if (secondaryImageInput && secondaryImageInput.files[0]) {
        formData.append(`color_secondary_${variantIndex}`, secondaryImageInput.files[0]);
      }

      variantsPayload.push(variantData);
      variantIndex += 1;
    }

    formData.append("variants", JSON.stringify(variantsPayload));

    const submitBtn = quickVariantForm.querySelector(".btn-primary");
    setButtonLoading(submitBtn, true, "Adding…");

    try {
      const response = await fetch(`${API_BASE}/product/${quickVariantProductId}`, {
        method: "PUT",
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Error adding color variant");
        setButtonLoading(submitBtn, false);
        return;
      }

      alert("Color variant added");
      closeQuickVariantModal();
      loadProducts(currentPage);

    } catch (error) {
      console.error("Quick Variant Error:", error);
      alert("Server Error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

/* =========================
   INIT
========================= */

// Expose functions globally for inline onclick handlers
window.addVariant = addVariant;
window.removeVariant = removeVariant;
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;
window.closeEditModal = closeEditModal;
window.addEditVariant = addEditVariant;
window.markMediaForDeletion = markMediaForDeletion;
window.markVariantForDeletion = markVariantForDeletion;
window.openQuickVariant = openQuickVariant;
window.closeQuickVariantModal = closeQuickVariantModal;
window.addQuickVariantBlock = addQuickVariantBlock;
window.removeQuickVariant = removeQuickVariant;

loadCategories();
loadProducts();
updateGalleryCounter();

// Add first variant block by default
addVariant();
