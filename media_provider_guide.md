# Media Provider Selection Guide for Admins

---

## WHAT IS MEDIA PROVIDER?

**Media Provider** = Which service stores your product images

We have two options:
- **Cloudinary** = Old image storage
- **ImageKit** = New, faster image storage

---

## WHEN UPLOADING A NEW PRODUCT

### Step 1: Select "ImageKit" as Media Provider

When uploading product images, you will see this option:

```
Media Provider: [Dropdown Menu]
├─ Cloudinary
└─ ImageKit  ✅ SELECT THIS
```

**Always select: ImageKit**

### Step 2: Upload Your Image

- Select image file (JPG, PNG, WebP)
- File size: Max ~5MB
- Click "Upload"

### Step 3: Done

Backend handles everything else automatically:
- ✅ Stores image in S3
- ✅ Creates 3 sizes (thumbnail, product, zoom)
- ✅ Delivers via ImageKit CDN
- ✅ Records in database

**You don't need to do anything else.**

---

## QUICK REFERENCE

| Situation | What to Select |
|-----------|---|
| Uploading a NEW product image | **ImageKit** |
| Uploading variant images | **ImageKit** |
| Uploading review images | **ImageKit** |
| Updating OLD product (already exists) | Keep original provider |

---

## TROUBLESHOOTING

### Image upload fails?
- Check file size (max ~5MB)
- Check file format (JPG, PNG, WebP only)
- Check internet connection
- Try again

### Image loads slowly?
- This shouldn't happen with ImageKit
- Check your internet connection

### Old images still on Cloudinary?
- That's normal, they still work fine
- Leave them alone, system handles migration

---

## THAT'S ALL YOU NEED TO KNOW

✅ Select **ImageKit** when uploading new products.  
✅ Upload your image file.  
✅ Backend handles the rest automatically.

**Backend will handle:**
- Which server to use
- How to store the image
- How to optimize it
- How many sizes to create
- How to deliver it fast
- How to record it in database

**Your job: Select ImageKit, upload file. Done.**
