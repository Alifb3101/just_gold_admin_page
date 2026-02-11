const API_BASE = "http://localhost:5000/api/v1";

const MAX_GALLERY = 6;
const selectedImages = [];
const PRODUCTS_LIMIT = 12;
let currentPage = 1;

let categories = [];

const categorySelectEl = document.getElementById("categorySelect");
const subcategorySelectEl = document.getElementById("subcategorySelect");
const categoryStatusEl = document.getElementById("categoryStatus");
const productListStatusEl = document.getElementById("productListStatus");

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

async function loadProducts(page = 1) {
  if (productListStatusEl) {
    productListStatusEl.textContent = "Loading products…";
  }

  try {
    const params = new URLSearchParams({
      page,
      limit: PRODUCTS_LIMIT
    });

    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const products = Array.isArray(data.products) ? data.products : [];
    currentPage = data.page || page;

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
          <button class="delete-btn" onclick="deleteProduct(${p.id})">Delete</button>
        </div>
      `;

      container.appendChild(div);
    });

    if (productListStatusEl) {
      productListStatusEl.textContent = `Showing ${products.length} of ${data.count || products.length} products`;
    }
  } catch (err) {
    console.error("Load Products Error:", err);
    if (productListStatusEl) {
      productListStatusEl.textContent = "Failed to load products";
    }
  }
}

/* =========================
   GALLERY HANDLING
========================= */

const galleryInput = document.getElementById("galleryInput");
const galleryPreview = document.getElementById("galleryPreview");
const galleryCounter = document.getElementById("galleryCounter");
const videoInput = document.getElementById("videoInput");
const videoMeta = document.getElementById("videoMeta");

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

  document.getElementById("variants").appendChild(div);
}

function removeVariant(button) {
  button.parentElement.remove();
}

/* =========================
   CREATE PRODUCT
========================= */

document.getElementById("productForm")
  .addEventListener("submit", async (e) => {

  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  /* ---- Gallery Validation ---- */

  if (selectedImages.length > MAX_GALLERY) {
    alert(`Maximum ${MAX_GALLERY} gallery images allowed`);
    return;
  }

  /* ---- Variant Validation ---- */

  const variantElements = document.querySelectorAll(".variant");

  if (variantElements.length === 0) {
    alert("Add at least one color variant");
    return;
  }

  const variants = [];

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
    document.getElementById("editKeyFeatures").value = product.key_features || "";
    document.getElementById("editIngredients").value = product.ingredients || "";
    document.getElementById("editModelNo").value = product.product_model_no || "";
    document.getElementById("editBasePrice").value = product.base_price || "";

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
    
    // Add basic fields
    formData.append("name", document.getElementById("editName").value);
    formData.append("description", document.getElementById("editDescription").value);
    formData.append("how_to_apply", document.getElementById("editHowToApply").value);
    formData.append("benefits", document.getElementById("editBenefits").value);
    formData.append("key_features", document.getElementById("editKeyFeatures").value);
    formData.append("ingredients", document.getElementById("editIngredients").value);
    formData.append("product_model_no", document.getElementById("editModelNo").value);
    formData.append("base_price", document.getElementById("editBasePrice").value);
    formData.append("subcategory_id", document.getElementById("editSubcategorySelect").value);

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
        return;
      }

      alert("Product Updated Successfully");
      closeEditModal();
      loadProducts(currentPage);

    } catch (error) {
      console.error("Update Product Error:", error);
      alert("Server Error");
    }
  });

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

loadCategories();
loadProducts();
updateGalleryCounter();

// Add first variant block by default
addVariant();
