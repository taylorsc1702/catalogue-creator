# Modular Architecture Deployment Guide

## 🎯 Overview

The Google Apps Script has been refactored into a **modular architecture** that's easier to maintain, debug, and extend. This guide explains the changes and how to deploy the new version.

## 📁 New File Structure

```
utils/
├── styling.js      # Font sizes, image sizes, HTML-to-text, styling helpers
├── barcode.js      # EAN-13 barcode generation and cell creation
├── tables.js       # Product details, price/barcode, internals tables
└── banners.js      # Header/footer banner creation

layouts/
├── 1-up.js         # 1-per-page layout (two-column design)
├── 2-up.js         # 2-per-page layout (1x2 grid)
├── 3-up.js         # 3-per-page layout (1x3 grid)
├── 4-up.js         # 4-per-page layout (2x2 grid)
├── 8-up.js         # 8-per-page layout (2x4 grid)
└── mixed.js        # Mixed layout handler (delegates to others)

main.js             # Main router and document creation
google-apps-script-modular.js  # Consolidated deployable script
```

## 🔧 Key Changes

### **1. Fixed 2-up, 3-up, 4-up, 8-up Layout Item Batching**

**Problem:** The old code was processing items one-at-a-time, so 2-up layout was only ever receiving 1 item, causing products to only appear in the left column.

**Solution:** The new router properly batches items based on layout type:
- **1-up**: 1 item per page
- **2-up**: 2 items per page (left and right columns)
- **3-up**: 3 items per page (3 columns)
- **4-up**: 4 items per page (2x2 grid)
- **8-up**: 8 items per page (2x4 grid)

### **2. Proper Banner Management**

- Banners are now added correctly for each page
- Header banner at the top
- Footer banner at the bottom
- Works for both single layout and mixed layout modes

### **3. Mixed Layout Support**

The mixed layout handler now:
- Properly delegates to appropriate layout handlers
- Batches items correctly based on `layoutAssignments`
- Adds banners for each page
- Handles page breaks between different layout types

## 🚀 Deployment Instructions

### **Step 1: Copy the New Script**

1. Open the file `google-apps-script-modular.js`
2. Copy the entire contents

### **Step 2: Update Google Apps Script**

1. Go to your Google Apps Script project: [https://script.google.com](https://script.google.com)
2. Select your existing catalogue creator script
3. **Delete all existing code** in the main file (Code.gs)
4. **Paste the new modular script** from `google-apps-script-modular.js`
5. Click **Save** (💾 icon)

### **Step 3: Redeploy as Web App**

1. Click **Deploy** → **Manage deployments**
2. Click the **Edit** icon (✏️) on your existing deployment
3. Update the **Version** to "New version"
4. Add description: "Modular architecture with fixed item batching"
5. Click **Deploy**
6. Copy the new **Web app URL** (if it changed)

### **Step 4: Test the Deployment**

1. Go to your catalogue creator application
2. Fetch some products
3. Test each layout:
   - ✅ **1-up**: Should show 1 product per page with two-column design
   - ✅ **2-up**: Should show 2 products per page (left and right columns)
   - ✅ **3-up**: Should show 3 products per page (3 columns)
   - ✅ **4-up**: Should show 4 products per page (2x2 grid)
   - ✅ **8-up**: Should show 8 products per page (2x4 grid)
4. Check that banners appear correctly at top and bottom of each page
5. Test mixed layout (if enabled)

## 🎯 Benefits of the New Architecture

### **1. Easier Maintenance**
- ✅ **Modular files** - Each layout is self-contained
- ✅ **Shared utilities** - Reusable functions prevent duplication
- ✅ **Clear separation** - Utilities, layouts, and main router are separate

### **2. Easier Debugging**
- ✅ **Isolated issues** - Problems in one layout don't affect others
- ✅ **Clear error messages** - Each function has proper error handling
- ✅ **Console logging** - Comprehensive logging for troubleshooting

### **3. Easier Extension**
- ✅ **Add new layouts** - Just create a new layout file and add it to the router
- ✅ **Update shared logic** - Change utilities once, benefits all layouts
- ✅ **Consistent behavior** - Shared utilities ensure uniformity

### **4. Mixed Layout Ready**
- ✅ **Dynamic delegation** - Routes to appropriate layout handler
- ✅ **Flexible combinations** - Any mix of layouts possible
- ✅ **Proper batching** - Items are grouped correctly per page

## 📊 How Item Batching Works

### **Single Layout Mode** (e.g., 2-up for all items)

```javascript
// Example: 6 items, 2-up layout
Items: [A, B, C, D, E, F]

// Result:
// Page 1: A, B (2-up layout)
// Page 2: C, D (2-up layout)
// Page 3: E, F (2-up layout)
```

### **Mixed Layout Mode** (different layouts per page)

```javascript
// Example: 6 items with custom layouts
Items: [A, B, C, D, E, F]
Layouts: [1, 2, 2, 1, 3, 3]

// Result:
// Page 1: A (1-up layout)
// Page 2: B, C (2-up layout)
// Page 3: D (1-up layout)
// Page 4: E, F, [empty] (3-up layout, 3rd slot empty)
```

## 🔍 Troubleshooting

### **Problem: Products only showing in left column (2-up)**
**Solution:** This was the original issue. Ensure you've deployed the new modular script that properly batches items.

### **Problem: Banners not showing**
**Solution:** Ensure you've copied the entire `google-apps-script-modular.js` file, including the banner utility functions.

### **Problem: Mixed layout not working**
**Solution:** Ensure your frontend is passing the `layoutAssignments` array with the correct length (must match items length).

### **Problem: Script execution timeout**
**Solution:** Google Apps Script has a 6-minute execution limit. For very large catalogues, consider:
- Processing items in smaller batches
- Optimizing image fetching
- Reducing complexity per page

## 📝 Code Quality Improvements

### **Error Handling**
- ✅ Comprehensive try-catch blocks
- ✅ Fallback rendering for errors
- ✅ Console logging for debugging

### **Code Organization**
- ✅ Clear function names
- ✅ Consistent formatting
- ✅ Documented sections

### **Performance**
- ✅ Efficient item batching
- ✅ Optimized table creation
- ✅ Minimal DOM manipulation

## 🎉 Summary

The new modular architecture:
- ✅ **Fixes the 2-up layout issue** (and 3-up, 4-up, 8-up)
- ✅ **Improves code maintainability** significantly
- ✅ **Makes debugging easier** with isolated components
- ✅ **Enables mixed layouts** with proper item batching
- ✅ **Sets foundation for future enhancements**

Deploy the new script and enjoy a much more robust and maintainable catalogue creator! 🚀

