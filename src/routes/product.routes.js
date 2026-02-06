const router = require("express").Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { files: 8 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid file type"));
  }
});

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

router.post("/", upload.array("media", 8), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { name, description, subcategory_id, variants } = req.body;

    const product = await client.query(
      `INSERT INTO products (name, slug, description, category_id)
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      [
        name,
        name.toLowerCase().replace(/\s+/g, "-"),
        description,
        subcategory_id
      ]
    );

    const productId = product.rows[0].id;

    for (let file of req.files) {
      await client.query(
        `INSERT INTO product_images (product_id,image_url)
         VALUES ($1,$2)`,
        [productId, "/uploads/" + file.filename]
      );
    }

    const parsedVariants = JSON.parse(variants);

    for (let v of parsedVariants) {
      await client.query(
        `INSERT INTO product_variants
         (product_id, shade, price, stock)
         VALUES ($1,$2,$3,$4)`,
        [productId, v.color, v.price, v.stock]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Product Added" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Error creating product" });
  } finally {
    client.release();
  }
});

/* ---------------- GET PRODUCTS ---------------- */

router.get("/", async (req, res) => {
  const result = await pool.query(`
    SELECT p.id, p.name, p.description,
           c.name AS category
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
  `);

  res.json(result.rows);
});

/* ---------------- DELETE ---------------- */

router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
  res.json({ message: "Deleted" });
});

/* ---------------- UPDATE ---------------- */

router.put("/:id", async (req, res) => {
  const { name, description } = req.body;

  await pool.query(
    "UPDATE products SET name=$1, description=$2 WHERE id=$3",
    [name, description, req.params.id]
  );

  res.json({ message: "Updated" });
});

module.exports = router;
