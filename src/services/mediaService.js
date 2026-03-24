const fs = require("fs");
const path = require("path");

/**
 * Media Service - Handles file uploads and storage
 * 
 * Features:
 * - Local filesystem storage (development)
 * - Cloud storage ready (Cloudinary, S3) via environment config
 * - Automatic cleanup on errors
 * - File validation and size limits
 * - URL generation for different environments
 */

class MediaService {
  constructor() {
    this.UPLOAD_DIR = path.join(__dirname, "../../uploads");
    this.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB as per guide
    this.ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"];
    
    // Ensure uploads directory exists (development only)
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Multer file object
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, error: "No file provided" };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File size exceeds 5MB limit (received ${(file.size / 1024 / 1024).toFixed(2)}MB)` 
      };
    }

    if (!this.ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed: JPEG, PNG, WebP, MP4 (received ${file.mimetype})` 
      };
    }

    return { valid: true };
  }

  /**
   * Generate storage-aware URL for file
   * In production, this would integrate with Cloudinary/S3 URLs
   * 
   * @param {string} filename - Original filename from Multer
   * @returns {string} URL path to access the file
   */
  generateFileUrl(filename) {
    // Development: Local storage
    if (process.env.NODE_ENV !== "production") {
      return `/uploads/${filename}`;
    }

    // Production: Could integrate cloud URL here
    // Example: return `https://cdn.example.com/${filename}`
    // For now, still use local URLs but this is where cloud integration happens
    return `/uploads/${filename}`;
  }

  /**
   * Get default/fallback image URL for products without images
   * @returns {string} URL to placeholder image
   */
  getPlaceholderImageUrl() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23ddd' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='sans-serif' font-size='24'%3ENo Image%3C/text%3E%3C/svg%3E";
  }

  /**
   * Cleanup files on error (rollback scenario)
   * @param {Array<string>} filenames - Filenames to delete
   */
  cleanupFiles(filenames = []) {
    filenames.forEach(filename => {
      try {
        const filepath = path.join(this.UPLOAD_DIR, filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (err) {
        console.warn(`Failed to cleanup file ${filename}:`, err.message);
      }
    });
  }

  /**
   * Sanitize filename to prevent path traversal attacks
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    // Remove path separators and suspicious characters
    return filename
      .replace(/\.\./g, "")
      .replace(/[\/\\]/g, "")
      .substring(0, 255);
  }
}

module.exports = new MediaService();
