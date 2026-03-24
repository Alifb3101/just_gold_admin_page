

# Media Upload Guide - Just Gold Admin

---

## Overview

This guide explains how to upload product images and videos through the admin panel. All uploads are validated for security and optimized for web performance.

---

## Requirements

**Supported File Types:**
- Images: JPEG (.jpg), PNG (.png), WebP (.webp)
- Videos: MP4 (.mp4)
- Maximum file size: **5MB per file**
- Maximum files per product: **20 files**

**Browser Support:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Minimum screen width: 768px recommended for admin panel

---

## Upload Process

### Step 1: Access Product Form
1. Navigate to product creation or editing page
2. Locate the **"Media"** or **"Upload Files"** section

### Step 2: Select Files
- Click **"Choose Files"** button
- Select one or more image/video files
- File restrictions:
  - Size: Max 5MB each
  - Type: JPEG, PNG, WebP, MP4 only
  - Quantity: Max 20 per product

### Step 3: Submit
- Click **"Create Product"** or **"Update Product"** button
- System validates and processes files
- Wait for success confirmation

### Step 4: Verification
- Check product display page
- All images should appear in product gallery
- Videos should appear as downloadable/playable media

---

## Troubleshooting

### File Upload Failed

**Error: "File size exceeds 5MB limit"**
- Your file is too large
- Solution: Compress the image (use online tools or image editor)
- Recommended: JPEG at 80% quality, or WebP format for best compression

**Error: "Invalid file type"**
- File type not supported
- Supported: JPEG, PNG, WebP, MP4
- Solution: Convert file using image editor or online converter

**Error: "Too many files"**
- You're uploading more than 20 files at once
- Solution: Split into multiple batches (e.g., 15 files + 5 files)

### Upload Completes but Images Don't Appear

- Clear browser cache (Ctrl+Shift+Delete)
- Reload page (F5)
- Check product detail page instead of list view
- Contact administrator if persists

---

## Best Practices

**Image Optimization:**
- Use JPEG or WebP format (better compression than PNG)
- Recommended resolution: 800×800px or higher
- Compress before uploading to stay under 5MB

**Video Guidelines:**
- Keep videos under 5 minutes
- Use H.264 video codec (standard MP4)
- Recommended bitrate: 2500-4000 kbps

**Organization:**
- Upload main product image first
- Follow with variant/shade images
- Add videos last (for loading priority)

**File Naming:**
- Use clear, descriptive names
- Example: "product-name-shade-red-main.jpg"
- Avoid: Special characters, spaces in filename

---

## Technical Details

**Storage Location:**
- Development: Local server storage (`/uploads` directory)
- Production: Served from web server

**URL Pattern:**
- Images appear as: `/uploads/[timestamp]-[filename]`
- Example: `/uploads/1711000000000-product.jpg`

**Automatic Processing:**
- System generates unique filenames to prevent conflicts
- Files are validated before storage
- Failed uploads are automatically cleaned up

---

## Support

If you encounter issues:
1. Verify file meets requirements (size, type)
2. Try different file format
3. Clear browser cache and retry
4. Contact administrator with error message

---

**Last Updated:** March 2026  
**System Version:** 1.0.0 (Production Ready)

