# Google Apps Script Setup Guide

This guide will help you set up Google Apps Script to create perfectly formatted Google Docs for your catalogue creator.

## Step 1: Create Google Apps Script

1. **Go to Google Apps Script**: https://script.google.com
2. **Click "New Project"**
3. **Replace the default code** with the contents of `google-apps-script.js`
4. **Save the project** (Ctrl+S or Cmd+S)

## Step 2: Deploy as Web App

1. **Click "Deploy" → "New deployment"**
2. **Choose type**: "Web app"
3. **Settings**:
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
4. **Click "Deploy"**
5. **Copy the Web App URL** (you'll need this for the environment variable)

## Step 3: Configure Environment Variable

Add this to your `.env.local` file:

```bash
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Replace `YOUR_SCRIPT_ID` with the actual ID from your Web App URL.

## Step 4: Test the Integration

1. **Restart your Next.js development server**
2. **Fetch some products** in your catalogue creator
3. **Click "🚀 Create Google Doc"** button
4. **Check that a Google Doc is created** with perfect formatting

## Features Included

### ✅ **All Layouts Supported**
- 1-up (single product, full page)
- 2-up, 3-up, 4-up, 8-up (multiple products per page)

### ✅ **1-up Layout Features**
- **Two-column design** (left: image/bio/internals, right: details)
- **Author bio** (HTML to plain text conversion)
- **Internals** (up to 4 additional images)
- **Perfect image sizing** and positioning

### ✅ **All Products Include**
- **Product images** (automatically downloaded)
- **Barcodes** (using SKU)
- **Custom banners** (header/footer with your colors)
- **UTM parameters** (for tracking)
- **Perfect typography** and spacing

### ✅ **Google Docs Integration**
- **Native Google Doc** (not HTML import)
- **Perfect formatting** preserved
- **Easy to edit** and share
- **Professional appearance**

## Troubleshooting

### Error: "Google Apps Script URL not configured"
- Make sure you've added `GOOGLE_APPS_SCRIPT_URL` to your `.env.local` file
- Restart your development server after adding the environment variable

### Error: "Google Apps Script failed"
- Check that your Apps Script is deployed as a web app
- Verify the URL in your environment variable is correct
- Make sure the script has "Anyone" access

### Images not loading
- The script automatically downloads images from your product URLs
- Check that your product images are publicly accessible
- Some image URLs might be blocked by CORS policies

### Permission errors
- Make sure your Google Apps Script deployment allows "Anyone" access
- Check that your Google account has permission to create documents

## Advanced Configuration

### Custom Fonts
Edit the Google Apps Script to use different fonts:
```javascript
title.getRange().getTextStyle().setFontFamily('Roboto');
```

### Custom Colors
Modify banner colors and text colors:
```javascript
bannerStyle.setForegroundColor('#FFFFFF');
```

### Custom Image Sizing
Adjust image dimensions for different layouts:
```javascript
image.setWidth(200); // Custom width
image.setHeight(300); // Custom height
```

## Benefits of Google Apps Script

1. **Perfect Formatting**: Creates native Google Docs with exact control
2. **No Import Issues**: No need to import HTML files
3. **Professional Results**: Looks exactly like your HTML export
4. **Easy Sharing**: Standard Google Docs sharing and collaboration
5. **Cloud-Based**: Documents created directly in your Google Drive

The Google Apps Script approach gives you the most precise control over formatting and creates professional-looking catalogues that are indistinguishable from your HTML exports!
