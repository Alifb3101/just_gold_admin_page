/**
 * Media Storage Service
 * Abstraction layer for handling multiple media providers
 * Supports: Cloudinary, ImageKit, LocalDisk
 */

const axios = require("axios");
const path = require("path");
const fs = require("fs").promises;

class MediaService {
  /**
   * Initialize media service with environment config
   */
  static initialize() {
    this.providers = {
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
        apiKey: process.env.CLOUDINARY_API_KEY || null,
        apiSecret: process.env.CLOUDINARY_API_SECRET || null,
      },
      imagekit: {
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY || null,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY || null,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/justgold",
      },
      local: {
        basePath: path.join(__dirname, "../../uploads"),
        baseUrl: process.env.LOCAL_STORAGE_URL || "http://localhost:3001/uploads",
      },
    };
  }

  /**
   * Upload file to specified provider
   * @param {Buffer} fileBuffer - File content
   * @param {String} filename - Original filename
   * @param {String} provider - 'cloudinary', 'imagekit', or 'local'
   * @param {Object} options - Provider-specific options
   * @returns {Promise<{url: String, provider: String, originalName: String}>}
   */
  static async uploadFile(fileBuffer, filename, provider = "imagekit", options = {}) {
    // Default to ImageKit if not initialized
    provider = provider || "imagekit";

    switch (provider.toLowerCase()) {
      case "cloudinary":
        return this._uploadToCloudinary(fileBuffer, filename, options);
      case "imagekit":
        return this._uploadToImageKit(fileBuffer, filename, options);
      case "local":
        return this._uploadToLocal(fileBuffer, filename, options);
      default:
        throw new Error(`Unknown media provider: ${provider}`);
    }
  }

  /**
   * Upload to Cloudinary
   * @private
   */
  static async _uploadToCloudinary(fileBuffer, filename, options) {
    const { cloudName, apiKey, apiSecret } = this.providers.cloudinary;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary credentials not configured. Use local storage as fallback.");
    }

    try {
      const cloudinary = require("cloudinary").v2;
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: path.parse(filename).name,
            folder: "just-gold/products",
            resource_type: "auto",
            secure: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(fileBuffer);
      });

      return {
        url: uploadResult.secure_url,
        provider: "cloudinary",
        originalName: filename,
        cloudinaryId: uploadResult.public_id,
      };
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  /**
   * Upload to ImageKit
   * @private
   */
  static async _uploadToImageKit(fileBuffer, filename, options) {
    const { privateKey, publicKey, urlEndpoint } = this.providers.imagekit;

    if (!privateKey || !publicKey) {
      throw new Error("ImageKit credentials not configured. Use local storage as fallback.");
    }

    try {
      const ImageKit = require("imagekitio");
      const imagekit = new ImageKit({
        privateKey: privateKey,
        publicKey: publicKey,
        urlEndpoint: urlEndpoint,
      });

      const uploadResult = await imagekit.upload({
        file: fileBuffer,
        fileName: filename,
        folder: "/products",
        useUniqueFileName: true,
      });

      return {
        url: uploadResult.url,
        provider: "imagekit",
        originalName: filename,
        imagekitId: uploadResult.fileId,
      };
    } catch (error) {
      throw new Error(`ImageKit upload failed: ${error.message}`);
    }
  }

  /**
   * Upload to local filesystem (fallback/development)
   * @private
   */
  static async _uploadToLocal(fileBuffer, filename, options) {
    try {
      const { basePath, baseUrl } = this.providers.local;

      // Create uploads directory if it doesn't exist
      await fs.mkdir(basePath, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(filename);
      const name = path.parse(filename).name;
      const uniqueName = `${timestamp}-${name}${ext}`;
      const filepath = path.join(basePath, uniqueName);

      // Write file
      await fs.writeFile(filepath, fileBuffer);

      return {
        url: `${baseUrl}/${uniqueName}`,
        provider: "local",
        originalName: filename,
        localPath: filepath,
      };
    } catch (error) {
      throw new Error(`Local storage upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from provider
   * @param {String} fileUrl - URL of the file
   * @param {String} provider - 'cloudinary', 'imagekit', or 'local'
   * @param {String} fileId - Provider-specific file identifier (optional)
   */
  static async deleteFile(fileUrl, provider, fileId = null) {
    try {
      switch (provider.toLowerCase()) {
        case "cloudinary":
          if (!fileId) {
            console.warn("Warning: fileId required for Cloudinary deletion");
            return;
          }
          const cloudinary = require("cloudinary").v2;
          await cloudinary.uploader.destroy(fileId);
          break;

        case "imagekit":
          if (!fileId) {
            console.warn("Warning: fileId required for ImageKit deletion");
            return;
          }
          const ImageKit = require("imagekitio");
          const imagekit = new ImageKit({
            privateKey: this.providers.imagekit.privateKey,
            publicKey: this.providers.imagekit.publicKey,
            urlEndpoint: this.providers.imagekit.urlEndpoint,
          });
          await imagekit.deleteFile(fileId);
          break;

        case "local":
          const localPath = fileUrl.replace(this.providers.local.baseUrl, this.providers.local.basePath);
          await fs.unlink(localPath);
          break;
      }
    } catch (error) {
      console.error(`Error deleting ${provider} file: ${error.message}`);
    }
  }

  /**
   * Get provider display name
   */
  static getProviderName(provider) {
    const names = {
      cloudinary: "Cloudinary",
      imagekit: "ImageKit",
      local: "Local Storage",
    };
    return names[provider] || provider;
  }

  /**
   * Check if provider is configured
   */
  static isProviderConfigured(provider) {
    const p = this.providers[provider];
    if (!p) return false;

    switch (provider) {
      case "cloudinary":
        return !!(p.cloudName && p.apiKey && p.apiSecret);
      case "imagekit":
        return !!(p.privateKey && p.publicKey);
      case "local":
        return true; // Always available
      default:
        return false;
    }
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders() {
    return ["cloudinary", "imagekit", "local"].filter((p) => this.isProviderConfigured(p));
  }
}

// Initialize on module load
MediaService.initialize();

module.exports = MediaService;
