-- Migration: Add media_provider column to products table
-- Purpose: Track which media provider stores each product's images
-- Default: 'imagekit' (new standard)
-- Fallback: 'local' for backwards compatibility

-- Add media_provider column if it doesn't exist
ALTER TABLE products
ADD COLUMN IF NOT EXISTS media_provider VARCHAR(50) DEFAULT 'imagekit';

-- Add comment for documentation
COMMENT ON COLUMN products.media_provider IS 'Media provider for product images: cloudinary, imagekit, or local';

-- Create index for queries filtering by provider
CREATE INDEX IF NOT EXISTS idx_products_media_provider ON products(media_provider);

-- Optional: Add media tracking table for auditing
CREATE TABLE IF NOT EXISTS media_uploads (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_file_id TEXT,
  original_filename VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_uploads_product_id ON media_uploads(product_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_provider ON media_uploads(provider);
