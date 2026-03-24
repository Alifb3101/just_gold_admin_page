# Media Provider Implementation Guide

**Status**: Production-Ready  
**Last Updated**: March 24, 2026  
**Version**: 1.0

---

## Overview

This project supports **three media storage providers** for product images:

| Provider | Purpose | Best For |
|----------|---------|----------|
| **ImageKit** | Modern CDN-backed storage | Production (RECOMMENDED) |
| **Cloudinary** | Legacy image hosting | Migration/Legacy Support |
| **Local Storage** | Local filesystem | Development/Testing |

Admins select the provider when uploading new products. Backend automatically handles optimization, resizing, and delivery.

---

## Architecture

### Components

#### 1. **Media Service** (`src/services/media.service.js`)
- Abstraction layer for all providers
- Handles upload, delete, and provider queries
- Auto-initializes from environment variables
- Error handling with fallback strategies

#### 2. **Database Schema** (`src/migrations/001_add_media_provider.sql`)
- Adds `media_provider` column to `products` table
- Tracks provider per product for multi-provider support
- Creates `media_uploads` audit table (optional)

#### 3. **API Routes** (`src/routes/product.routes.js`)
- `GET /api/v1/media-providers` - Returns available providers
- `POST /api/v1/product` - Creates product, accepts `media_provider` field
- `PUT /api/v1/product/:id` - Updates product with media handling

#### 4. **Frontend Form** (`public/index.html`)
- Media provider dropdown added to product form
- Defaults to ImageKit (recommended)
- Options: ImageKit, Cloudinary, Local

#### 5. **Frontend Logic** (`public/script.js`)
- `loadMediaProviders()` function fetches available providers
- Form passes `media_provider` value to backend
- Admin-friendly labeling

---

## Setup Instructions

### Step 1: Run Database Migration

```bash
# Connect to your PostgreSQL database and run:
psql -U your_user -d your_database -f src/migrations/001_add_media_provider.sql
```

This adds the `media_provider` column to existing `products` table and creates the `media_uploads` audit table.

### Step 2: Configure Environment Variables

Add to your `.env` file:

```sh
# Default Provider (imagekit, cloudinary, or local)
DEFAULT_MEDIA_PROVIDER=imagekit

# ImageKit (if using ImageKit)
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/yoursubdomain

# Cloudinary (if using Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Local Storage (used as fallback)
LOCAL_STORAGE_URL=http://localhost:3001/uploads
```

### Step 3: Install Required Dependencies

```bash
npm install imagekitio cloudinary
```

Or use only the provider(s) you need:

```bash
npm install imagekitio     # For ImageKit only
npm install cloudinary     # For Cloudinary only
```

### Step 4: Restart Server

```bash
npm start
```

Server auto-detects and initializes configured providers.

---

## Provider Details

### ImageKit (Recommended for Production)

**Advantages:**
- ✅ Fast CDN delivery globally
- ✅ Automatic image optimization
- ✅ Responsive image sizing
- ✅ Real-time transformations
- ✅ Reliable uptime

**Setup:**
1. Create account at [https://imagekit.io](https://imagekit.io)
2. Get API keys from Dashboard → Settings → API Keys
3. Add to `.env`:
   ```
   IMAGEKIT_PUBLIC_KEY=xxx
   IMAGEKIT_PRIVATE_KEY=xxx
   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/yoursubdomain
   ```

**Limits:**
- Max file size: ~100MB (configurable)
- File types: Any (filtered at upload)

---

### Cloudinary (Legacy Support)

**Advantages:**
- ✅ Backward compatible with existing images
- ✅ Rich transformation options
- ✅ Mobile optimization built-in
- ✅ Analytics included

**Setup:**
1. Create account at [https://cloudinary.com](https://cloudinary.com)
2. Get credentials from Dashboard → Settings
3. Add to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=xxx
   CLOUDINARY_API_KEY=xxx
   CLOUDINARY_API_SECRET=xxx
   ```

**Limits:**
- Max file size: 100MB default (free tier limited to 10MB)
- API rate limits apply

---

### Local Storage (Development Only)

**Advantages:**
- ✅ No configuration required
- ✅ Fastest for local development
- ✅ Files stored in `/uploads` directory

**Disadvantages:**
- ❌ Not persistent on cloud hosts (Render, Heroku)
- ❌ Files deleted on server restart
- ❌ Not suitable for production

**Use Only For:**
- Local development
- Testing before production
- Backup/fallback when cloud providers unavailable

---

## Multi-Provider Migration

Supports storing different products in different providers:

```sql
-- Check provider distribution
SELECT media_provider, COUNT(*) FROM products GROUP BY media_provider;

-- Products on ImageKit
SELECT COUNT(*) FROM products WHERE media_provider = 'imagekit';

-- Products on Cloudinary
SELECT COUNT(*) FROM products WHERE media_provider = 'cloudinary';
```

**Migration strategy:**
1. New uploads default to ImageKit
2. Old uploads remain on Cloudinary (URLs work as-is)
3. Gradual transition as old products are updated
4. No data loss during switch

---

## Admin Interface

### Uploading New Product

1. Fill out product details
2. Select **Media Provider** dropdown
   - **ImageKit** (recommended) ← Default
   - **Cloudinary** (legacy)
   - **Local Storage** (development only)
3. Upload images
4. Click "Create Product"
5. Backend handles everything else

### Updating Existing Product

- **Don't change provider** for existing products
- Keep original provider to avoid re-uploading
- Add new images with new provider if desired
- System accepts mixed providers

---

## API Reference

### Get Available Providers

```
GET /api/v1/media-providers
```

**Response:**
```json
{
  "providers": [
    { "value": "imagekit", "label": "ImageKit" },
    { "value": "cloudinary", "label": "Cloudinary" },
    { "value": "local", "label": "Local Storage" }
  ],
  "default": "imagekit"
}
```

### Create Product with Media Provider

```
POST /api/v1/product
Content-Type: multipart/form-data

Required fields:
- name: string
- base_price: number
- subcategory_id: integer
- media_provider: "imagekit" | "cloudinary" | "local"
- media: file (1-6 images)
- variants: JSON array
```

**Response:**
```json
{
  "message": "Product Added",
  "id": 123,
  "media_provider": "imagekit"
}
```

### Update Product with New Media

```
PUT /api/v1/product/:id
Content-Type: multipart/form-data

Optional:
- media: file (new images)
- media_provider: string (to change provider for new images)
```

---

## Error Handling

### Provider Configuration Missing

**Error:**
```json
{"message": "ImageKit credentials not configured. Use local storage as fallback."}
```

**Solution:**
- Check `.env` file
- Verify API keys are correct
- Restart server

### File Upload Fails

**Check In Order:**
1. File size < provider limit
2. File format supported (JPEG, PNG, WebP, MP4)
3. Provider credentials valid
4. Network connectivity
5. Disk space (for local storage)

### Provider Unavailable

**Automatic Fallback:**
- System attempts configured provider first
- On failure, logs error and returns error to admin
- (Optional: Could fall back to local storage)

---

## Monitoring & Audit

### View Media Uploads (if using media_uploads table)

```sql
SELECT 
  p.id, p.name, m.provider, m.file_url, m.created_at
FROM products p
JOIN media_uploads m ON p.id = m.product_id
WHERE m.deleted_at IS NULL
ORDER BY m.created_at DESC;
```

### Provider Usage

```sql
SELECT media_provider, COUNT(*) as product_count
FROM products
GROUP BY media_provider
ORDER BY product_count DESC;
```

---

## Security Considerations

1. **API Keys:** Store in `.env`, never commit to Git
2. **File Validation:** Backend validates MIME types before upload
3. **File Size:** Limits enforced per provider
4. **Access Control:** (Add authentication as needed)

---

## Troubleshooting

### Images Not Loading

**Check:**
1. Provider credentials valid
2. Provider account has active plan
3. URL returned from upload is accessible
4. Browser's CORS policy allows domain

### Upload Hangs

**Common Causes:**
- Large file + slow connection
- Provider rate limit reached
- Network timeout

**Solutions:**
- Compress images before upload
- Use local storage for backup
- Check provider account status

### "Unknown Media Provider" Error

**Cause:** Form sent invalid `media_provider` value

**Solution:** Ensure only these values:
- `imagekit`
- `cloudinary`
- `local`

---

## Development Notes

### Adding New Provider

To support additional providers (e.g., AWS S3, Google Cloud Storage):

1. Add method to `MediaService` class:
   ```javascript
   static async _uploadToS3(fileBuffer, filename, options) {
     // Implementation
     return { url, provider, originalName };
   }
   ```

2. Handle in `uploadFile` switch statement:
   ```javascript
   case "s3":
     return this._uploadToS3(...);
   ```

3. Update HTML dropdown and API response
4. Add environment variables to `.env`

### Testing

```bash
# Test local upload
# POST /api/v1/product with media_provider=local

# Test ImageKit
# POST /api/v1/product with media_provider=imagekit

# Test Cloudinary
# POST /api/v1/product with media_provider=cloudinary
```

---

## Rollback Plan

If provider fails:

1. **Check Provider Status**
   ```sql
   SELECT * FROM products WHERE media_provider = 'imagekit' LIMIT 5;
   ```

2. **Re-upload to Different Provider**
   - Edit product
   - Change media_provider field
   - Upload images again

3. **Migrate All Products**
   ```sql
   UPDATE products SET media_provider = 'cloudinary' WHERE media_provider = 'imagekit';
   ```

---

## Support & References

- **ImageKit Docs:** https://docs.imagekit.io
- **Cloudinary Docs:** https://cloudinary.com/documentation
- **Project Issue:** Check GitHub Issues for known problems

---

**Next Steps:** Deploy this version and test media uploads with your chosen provider.
