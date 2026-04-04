const router = require("express").Router();
const pool = require("../config/db");

function requireAdminBearer(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Unauthorized - Bearer token required" });
	}
	return next();
}

router.get("/admin/products/:id/image-urls", requireAdminBearer, async (req, res) => {
	try {
		const productId = Number.parseInt(req.params.id, 10);
		if (Number.isNaN(productId)) {
			return res.status(400).json({ message: "Invalid product id" });
		}

		const productResult = await pool.query(
			`SELECT id, media_provider, thumbnail, afterimage FROM products WHERE id = $1`,
			[productId]
		);

		if (!productResult.rows.length) {
			return res.status(404).json({ message: "Product not found" });
		}

		const product = productResult.rows[0];

		const galleryResult = await pool.query(
			`SELECT id, image_url FROM product_images WHERE product_id = $1 ORDER BY id ASC`,
			[productId]
		);

		const variantsResult = await pool.query(
			`SELECT id, main_image, secondary_image FROM product_variants WHERE product_id = $1 ORDER BY id ASC`,
			[productId]
		);

		const imageUrls = [];
		const seen = new Set();

		const pushUrl = (url, type, source, referenceId = null) => {
			if (!url || seen.has(url)) {
				return;
			}
			seen.add(url);
			imageUrls.push({ url, type, source, reference_id: referenceId });
		};

		galleryResult.rows.forEach((row) => pushUrl(row.image_url, "gallery", "product_images", row.id));
		variantsResult.rows.forEach((row) => {
			pushUrl(row.main_image, "variant_main", "product_variants", row.id);
			pushUrl(row.secondary_image, "variant_secondary", "product_variants", row.id);
		});
		pushUrl(product.thumbnail, "thumbnail", "products", product.id);
		pushUrl(product.afterimage, "afterimage", "products", product.id);

		return res.json({
			product_id: productId,
			media_provider: product.media_provider || null,
			current: {
				thumbnail: product.thumbnail || null,
				afterimage: product.afterimage || null
			},
			image_urls: imageUrls
		});
	} catch (err) {
		console.error("[ADMIN IMAGE URLS] Error:", err);
		return res.status(500).json({ message: "Error fetching image URLs", details: err.message });
	}
});

router.post("/admin/products/:id/thumbnail-afterimage", requireAdminBearer, async (req, res) => {
	try {
		const productId = Number.parseInt(req.params.id, 10);
		if (Number.isNaN(productId)) {
			return res.status(400).json({ message: "Invalid product id" });
		}

		const thumbnail = typeof req.body.thumbnail === "string" ? req.body.thumbnail.trim() : "";
		const afterimage = typeof req.body.afterimage === "string" ? req.body.afterimage.trim() : "";

		if (!thumbnail && !afterimage) {
			return res.status(400).json({ message: "Send thumbnail, afterimage, or both" });
		}

		const productResult = await pool.query(
			`SELECT id, media_provider FROM products WHERE id = $1`,
			[productId]
		);

		if (!productResult.rows.length) {
			return res.status(404).json({ message: "Product not found" });
		}

		const updates = [];
		const values = [];
		let index = 1;

		if (thumbnail) {
			updates.push(`thumbnail = $${index++}`);
			values.push(thumbnail);
		}
		if (afterimage) {
			updates.push(`afterimage = $${index++}`);
			values.push(afterimage);
		}

		values.push(productId);

		const updateResult = await pool.query(
			`UPDATE products SET ${updates.join(", ")} WHERE id = $${index} RETURNING id, media_provider, thumbnail, afterimage`,
			values
		);

		return res.json({
			message: "Thumbnail/afterimage updated",
			product: updateResult.rows[0]
		});
	} catch (err) {
		console.error("[ADMIN THUMBNAIL AFTERIMAGE] Error:", err);
		return res.status(500).json({ message: "Error updating thumbnail/afterimage", details: err.message });
	}
});

module.exports = router;
