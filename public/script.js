const API_BASE = "http://localhost:5000/api/v1";

const MAX_GALLERY = 6;
const selectedImages = [];

let categories = [];

/* =========================
   LOAD CATEGORIES
========================= */

async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    categories = await res.json();

    const categorySelect = document.getElementById("categorySelect");
    categorySelect.innerHTML = "";

    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      categorySelect.appendChild(option);
    });

    loadSubcategories();
  } catch (err) {
    console.error("Category Load Error:", err);
  }
}

function loadSubcategories() {
  const categoryId = document.getElementById("categorySelect").value;
  const subSelect = document.getElementById("subcategorySelect");
  subSelect.innerHTML = "";

  const selected = categories.find(c => c.id == categoryId);
  if (!selected) return;

  selected.subcategories.forEach(sub => {
    const option = document.createElement("option");
    option.value = sub.id;
    option.textContent = sub.name;
    subSelect.appendChild(option);
  });
}

document.getElementById("categorySelect")
  .addEventListener("change", loadSubcategories);

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

function addVariant() {
  const div = document.createElement("div");
  div.className = "variant";

  div.innerHTML = `
    <input type="text" placeholder="Color Name" class="color" required>
    <input type="number" placeholder="Stock" class="stock" required>
    <input type="number" placeholder="Variant Price (optional)" class="price">
    <input type="number" placeholder="Discount Price (optional)" class="discount">
    <button type="button" onclick="removeVariant(this)">Remove</button>
  `;

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

  for (const div of variantElements) {
    const color = div.querySelector(".color").value.trim();
    const stock = div.querySelector(".stock").value;
    const price = div.querySelector(".price").value;
    const discount = div.querySelector(".discount").value;

    if (!color || !stock) {
      alert("Color name and stock are required");
      return;
    }

    variants.push({
      color,
      stock: Number(stock),
      price: price ? Number(price) : null,
      discount_price: discount ? Number(discount) : null
    });
  }

  formData.append("variants", JSON.stringify(variants));

  formData.delete("gallery");
  formData.delete("video");

  selectedImages.forEach(item => {
    formData.append("media", item.file);
  });

  if (videoInput.files[0]) {
    formData.append("media", videoInput.files[0]);
  }

  /* ---- Submit to Backend ---- */

  try {
    const response = await fetch(`${API_BASE}/products`, {
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

    loadProducts();

  } catch (error) {
    console.error("Create Product Error:", error);
    alert("Server Error");
  }
});

/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    const products = await res.json();

    const container = document.getElementById("productList");
    container.innerHTML = "";

    products.forEach(p => {
      const div = document.createElement("div");
      div.className = "product-item";

      div.innerHTML = `
        <strong>${p.name}</strong>
        <p class="meta">${p.description || "No description"}</p>
        <button onclick="deleteProduct(${p.id})">Delete</button>
      `;

      container.appendChild(div);
    });
  } catch (err) {
    console.error("Load Products Error:", err);
  }
}

/* =========================
   DELETE PRODUCT
========================= */

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  try {
    await fetch(`${API_BASE}/products/${id}`, {
      method: "DELETE"
    });

    loadProducts();
  } catch (err) {
    console.error("Delete Error:", err);
  }
}

/* =========================
   INIT
========================= */

loadCategories();
loadProducts();
updateGalleryCounter();
