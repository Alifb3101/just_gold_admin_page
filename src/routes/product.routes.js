const router = require("express").Router();
const pool = require("../config/db");
const multer = require("multer");

// Initialize ImageKit

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { files: 20, fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid file type"));
  }
});

// Helper function to upload file to ImageKit
// Helper function to upload file to S3 (ImageKit will serve it)
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3"); // make sure you already created this

async function uploadToImageKit(file, type = "images") {
  try {
    console.log(`[S3] Uploading file: ${file.originalname}...`);

    // safer extension extraction
    const ext = file.mimetype.split("/")[1] || "jpg";

    // clean filename
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // FIXED folder structure
    const folderMap = {
      gallery: "just_gold/products/images",
      variants: "just_gold/products/variants"
    };

    const folder = folderMap[type] || "just_gold/products/images";

    const key = `${folder}/${fileName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    console.log(`[S3] ✅ Upload successful: ${key}`);

    return key;

  } catch (err) {
    console.error("[S3] ❌ Upload failed:", err.message);
    throw new Error(`Failed to upload file: ${err.message}`);
  }
}

/* ---------------- GET CATEGORIES ---------------- */

router.get("/categories", async (req, res) => {
  const result = await pool.query(`
    SELECT c1.id, c1.name,
    COALESCE(
      json_agg(
        json_build_object('id', c2.id, 'name', c2.name)
      ) FILTER (WHERE c2.id IS NOT NULL),
      '[]'
    ) AS subcategories
    FROM categories c1
    LEFT JOIN categories c2 ON c2.parent_id = c1.id
    WHERE c1.parent_id IS NULL
    GROUP BY c1.id
  `);

  res.json(result.rows);
});

/* ---------------- CREATE PRODUCT ---------------- */

router.post("/products", upload.any(), async (req, res) => {
  const client = await pool.connect();

  try {
    console.log("[Product Upload] 📝 Creating new product...");
    const files = Array.isArray(req.files) ? req.files : [];
    console.log(`[Product Upload] Files received: ${files.length}`);
    
    await client.query("BEGIN");

    const {
      name,
      description,
      how_to_apply,
      benefits,
      product_description,
      ingredients,
      product_model_no,
      subcategory_id,
      variants
    } = req.body;

    const product = await client.query(
      `INSERT INTO products
       (name, slug, description, how_to_apply, benefits, product_description, ingredients, product_model_no, category_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        name,
        name.toLowerCase().replace(/\s+/g, "-"),
        description,
        how_to_apply,
        benefits,
        product_description,
        ingredients,
        product_model_no,
        subcategory_id || null
      ]
    );

    const productId = product.rows[0].id;
    console.log(`[Product Upload] ✅ Product created with ID: ${productId}`);

    // Separate media files and variant main images
    const mediaFiles = [];
    const variantMainImages = {};

    for (let file of files) {
      if (file.fieldname === "media") {
        mediaFiles.push(file);
      } else if (file.fieldname.startsWith("variant_main_image_")) {
        const variantIndex = file.fieldname.replace("variant_main_image_", "");
        variantMainImages[variantIndex] = file;
      }
    }

    // Upload gallery and video images to ImageKit
    for (let file of mediaFiles) {
      try {
        const imageUrl = await uploadToImageKit(file, "gallery");
        await client.query(
          `INSERT INTO product_images (product_id, image_url)
           VALUES ($1, $2)`,
          [productId, imageUrl]
        );
      } catch (uploadErr) {
        throw uploadErr;
      }
    }

    const parsedVariants = variants ? JSON.parse(variants) : [];

    // Insert variants with their main images uploaded to ImageKit
    for (let i = 0; i < parsedVariants.length; i++) {
      const v = parsedVariants[i];
      let mainImage = null;
      
      if (variantMainImages[i]) {
        try {
          mainImage = await uploadToImageKit(variantMainImages[i], "variants");
        } catch (uploadErr) {
          throw uploadErr;
        }
      }

      await client.query(
        `INSERT INTO product_variants
         (product_id, shade, variant_model_no, price, stock, main_image)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [productId, v.color, v.variant_model_no, v.price, v.stock, mainImage]
      );
    }

    await client.query("COMMIT");
    console.log(`[Product Upload] ✅ Product saved successfully!`);
    res.json({ message: "Product Added" });

  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("[Product Upload] ❌ Rollback Error:", rollbackErr.message);
    }
    console.error("[Product Upload] ❌ Error:", err.message);
    res.status(500).json({ message: "Error creating product", details: err.message });
  } finally {
    client.release();
  }
});

/* ---------------- GET PRODUCTS (PAGINATED) ---------------- */

router.get("/products", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitQuery = parseInt(req.query.limit, 10);
    const limit = Math.min(limitQuery > 0 ? limitQuery : 12, 50);
    const offset = (page - 1) * limit;

    const totalResult = await pool.query("SELECT COUNT(*)::int AS count FROM products");
    const total = totalResult.rows[0].count;

    const result = await pool.query(`
      SELECT p.id, p.name, p.slug, p.description, p.base_price, p.created_at,
             c.name AS category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      page,
      limit,
      count: total,
      products: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

/* ---------------- DELETE ---------------- */

router.delete("/products/:id", async (req, res) => {
  await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
  res.json({ message: "Deleted" });
});

/* ---------------- GET SINGLE PRODUCT ---------------- */

router.get("/products/:id-:slug", async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const slugParam = req.params.slug;

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const productResult = await pool.query(`
      SELECT p.*, c.name as category_name, c.parent_id as parent_category_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [productId]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productResult.rows[0];
    const canonicalSlug = product.slug;
    const canonical = canonicalSlug === slugParam
      ? null
      : `/api/v1/products/${product.id}-${canonicalSlug}`;

    const variantsResult = await pool.query(`
      SELECT * FROM product_variants WHERE product_id = $1
    `, [product.id]);

    const mediaResult = await pool.query(`
      SELECT * FROM product_images WHERE product_id = $1
    `, [product.id]);

    res.json({
      canonical,
      ...product,
      variants: variantsResult.rows,
      media: mediaResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching product" });
  }
});

/* ---------------- UPDATE PRODUCT ---------------- */

router.put("/products/:id", upload.any(), async (req, res) => {
  const client = await pool.connect();

  try {
    console.log(`[Product Update] 🔄 Updating product ID: ${req.params.id}`);
    console.log(`[Product Update] Files received: ${req.files ? req.files.length : 0}`);
    
    await client.query("BEGIN");

    const productId = req.params.id;
    const {
      name,
      description,
      how_to_apply,
      benefits,
      product_description,
      ingredients,
      product_model_no,
      subcategory_id,
      base_price,
      variants,
      delete_media_ids,
      delete_variant_ids
    } = req.body;

    // Build dynamic update query for products table
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
      updates.push(`slug = $${paramIndex++}`);
      values.push(name.toLowerCase().replace(/\s+/g, "-"));
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (how_to_apply !== undefined) {
      updates.push(`how_to_apply = $${paramIndex++}`);
      values.push(how_to_apply);
    }
    if (benefits !== undefined) {
      updates.push(`benefits = $${paramIndex++}`);
      values.push(benefits);
    }
    if (product_description !== undefined) {
      updates.push(`product_description = $${paramIndex++}`);
      values.push(product_description);
    }
    if (ingredients !== undefined) {
      updates.push(`ingredients = $${paramIndex++}`);
      values.push(ingredients);
    }
    if (product_model_no !== undefined) {
      updates.push(`product_model_no = $${paramIndex++}`);
      values.push(product_model_no);
    }
    if (subcategory_id !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      values.push(subcategory_id || null);
    }
    if (base_price !== undefined) {
      updates.push(`base_price = $${paramIndex++}`);
      values.push(base_price);
    }

    // Update product if there are fields to update
    if (updates.length > 0) {
      values.push(productId);
      await client.query(
        `UPDATE products SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
        values
      );
    }

    // Handle file uploads
    const newGalleryFiles = [];
    const variantMainImages = {};
    const variantSecondaryImages = {};

    for (let file of req.files || []) {
      if (file.fieldname === "gallery" || file.fieldname === "media") {
        newGalleryFiles.push(file);
      } else if (file.fieldname.startsWith("color_secondary_")) {
        const variantIndex = file.fieldname.replace("color_secondary_", "");
        variantSecondaryImages[variantIndex] = file;
      } else if (file.fieldname.startsWith("color_")) {
        const variantIndex = file.fieldname.replace("color_", "");
        variantMainImages[variantIndex] = file;
      }
    }

    // Add new gallery images to ImageKit
    for (let file of newGalleryFiles) {
      try {
        const imageUrl = await uploadToImageKit(file, "gallery");
        await client.query(
          `INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)`,
          [productId, imageUrl]
        );
      } catch (uploadErr) {
        throw uploadErr;
      }
    }

    // Delete media by IDs
    if (delete_media_ids) {
      const mediaIds = JSON.parse(delete_media_ids);
      if (mediaIds.length > 0) {
        await client.query(
          `DELETE FROM product_images WHERE id = ANY($1) AND product_id = $2`,
          [mediaIds, productId]
        );
      }
    }

    // Delete variants by IDs
    if (delete_variant_ids) {
      const variantIds = JSON.parse(delete_variant_ids);
      if (variantIds.length > 0) {
        await client.query(
          `DELETE FROM product_variants WHERE id = ANY($1) AND product_id = $2`,
          [variantIds, productId]
        );
      }
    }

    // Handle variants (update existing / add new)
    if (variants) {
      const parsedVariants = JSON.parse(variants);

      for (let i = 0; i < parsedVariants.length; i++) {
        const v = parsedVariants[i];
        let mainImage = null;
        let secondaryImage = null;

        // Upload variant images to ImageKit if provided
        if (variantMainImages[i]) {
          try {
            mainImage = await uploadToImageKit(variantMainImages[i], "variants");
          } catch (uploadErr) {
            throw uploadErr;
          }
        }

        if (variantSecondaryImages[i]) {
          try {
            secondaryImage = await uploadToImageKit(variantSecondaryImages[i], "variants");
          } catch (uploadErr) {
            throw uploadErr;
          }
        }

        if (v.id) {
          // Update existing variant
          const variantUpdates = [];
          const variantValues = [];
          let vParamIndex = 1;

          if (v.color !== undefined) {
            variantUpdates.push(`shade = $${vParamIndex++}`);
            variantValues.push(v.color);
          }
          if (v.variant_model_no !== undefined) {
            variantUpdates.push(`variant_model_no = $${vParamIndex++}`);
            variantValues.push(v.variant_model_no);
          }
          if (v.price !== undefined) {
            variantUpdates.push(`price = $${vParamIndex++}`);
            variantValues.push(v.price);
          }
          if (v.discount_price !== undefined) {
            variantUpdates.push(`discount_price = $${vParamIndex++}`);
            variantValues.push(v.discount_price);
          }
          if (v.stock !== undefined) {
            variantUpdates.push(`stock = $${vParamIndex++}`);
            variantValues.push(v.stock);
          }
          if (v.color_type !== undefined) {
            variantUpdates.push(`color_type = $${vParamIndex++}`);
            variantValues.push(v.color_type);
          }
          if (mainImage) {
            variantUpdates.push(`main_image = $${vParamIndex++}`);
            variantValues.push(mainImage);
          }
          if (secondaryImage) {
            variantUpdates.push(`secondary_image = $${vParamIndex++}`);
            variantValues.push(secondaryImage);
          }

          if (variantUpdates.length > 0) {
            variantValues.push(v.id);
            variantValues.push(productId);
            await client.query(
              `UPDATE product_variants SET ${variantUpdates.join(", ")} WHERE id = $${vParamIndex} AND product_id = $${vParamIndex + 1}`,
              variantValues
            );
          }
        } else {
          // Insert new variant
          await client.query(
            `INSERT INTO product_variants 
             (product_id, shade, variant_model_no, price, discount_price, stock, color_type, main_image, secondary_image)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              productId,
              v.color,
              v.variant_model_no || null,
              v.price || null,
              v.discount_price || null,
              v.stock || 0,
              v.color_type || null,
              mainImage,
              secondaryImage
            ]
          );
        }
      }
    }

    await client.query("COMMIT");

    // Fetch updated product to return
    const updatedProduct = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [productId]);

    const updatedVariants = await pool.query(`
      SELECT * FROM product_variants WHERE product_id = $1
    `, [productId]);

    const updatedMedia = await pool.query(`
      SELECT * FROM product_images WHERE product_id = $1
    `, [productId]);

    res.json({
      message: "Product updated successfully",
      product: {
        ...updatedProduct.rows[0],
        variants: updatedVariants.rows,
        media: updatedMedia.rows
      }
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Error updating product", details: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
