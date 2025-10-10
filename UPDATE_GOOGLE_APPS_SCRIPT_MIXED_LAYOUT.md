# 🚨 URGENT: Update Google Apps Script for Mixed Layout Support

## What Changed
The Google Apps Script now supports **mixed layouts** where different products can have different layouts (1-up, 2-up, 4-up, etc.) in the same document.

## Quick Update Steps

### 1. ✅ Copy the Latest Code
Open `google-apps-script-fixed.js` in this repository and copy **ALL** the code.

### 2. ✅ Open Your Google Apps Script
Go to: https://script.google.com/macros/s/AKfycbxrvUzDXnCXTc5eTMJ4-dsGItgbyUAeJpQ7FaGPjRiG9Sp7S03amLjkjUfnY76VR7XWgw/edit

(Or open it from your Google Drive)

### 3. ✅ Replace All Code
1. Select **ALL** text in the script editor (Ctrl+A or Cmd+A)
2. Delete it
3. Paste the new code from `google-apps-script-fixed.js`
4. Click **"💾 Save"** (or Ctrl+S / Cmd+S)

### 4. ✅ Deploy New Version
1. Click **"Deploy"** → **"Manage deployments"**
2. Click the **"Edit"** button (pencil icon) next to your current deployment
3. Under "Version", select **"New version"** from the dropdown
4. **IMPORTANT**: Description: "Added mixed layout support"
5. Click **"Deploy"**

### 5. ✅ Verify the Deployment
You should see a confirmation like:
```
✅ Web app
   URL: https://script.google.com/macros/s/AKfycbx.../exec
   Version: 2 (or higher)
```

### 6. ✅ Test It
1. Go to your catalogue creator
2. Click **"🔀 Reorder Items"**
3. Assign different layouts to different products
4. Click **"🚀 Mixed Google Doc"**
5. Wait for the success message
6. Open the Google Doc and verify it has mixed layouts

## What's New in the Code

### Key Changes:
```javascript
// NEW: Support for layoutAssignments
const {
  items,
  layout = 4,
  layoutAssignments = null, // <-- NEW PARAMETER
  title = "Product Catalogue",
  // ...
} = data;

// NEW: Mixed layout logic
const isMixedLayout = layoutAssignments && layoutAssignments.length === items.length;

if (isMixedLayout) {
  // Process items with their individual layout assignments
  let currentIndex = 0;
  
  while (currentIndex < items.length) {
    const currentLayout = layoutAssignments[currentIndex];
    const itemsForThisPage = [];
    
    for (let i = 0; i < currentLayout && currentIndex < items.length; i++) {
      itemsForThisPage.push(items[currentIndex]);
      currentIndex++;
    }
    
    createPage(body, itemsForThisPage, currentLayout, showFields, bannerColor, websiteName, utmParams);
  }
} else {
  // EXISTING: Regular fixed layout
  // ... existing code ...
}
```

## Troubleshooting

### ❌ "Script function not found: doPost"
**Fix**: Make sure you saved the script before deploying.

### ❌ "Authorization required"
**Fix**: 
1. Click **"Deploy"** → **"Test deployments"**
2. Click **"Install"**
3. Authorize the script to access Google Drive

### ❌ "TypeError: Cannot read property 'length' of null"
**Fix**: This means `layoutAssignments` is not being sent. Check that:
- You've deployed the **frontend** changes to Vercel
- You're clicking the **"🚀 Mixed Google Doc"** button (not the regular one)

### ❌ "Document creates but items are on wrong pages"
**Fix**: This is a logic issue. Check the execution logs:
1. Go to Google Apps Script
2. Click **"Executions"** (left sidebar)
3. Click on the latest execution
4. Check the logs to see how items were grouped

### ❌ "Items duplicating in the document"
**Fix**: This might be due to the `currentIndex` not incrementing correctly. Verify that:
- The `for` loop inside the `while` loop is working
- `currentIndex++` is being called for each item added

## Testing Checklist

After updating, test these scenarios:

- [ ] **Regular layout** (no reordering): Should work as before
  - Try 1-up, 2-up, 4-up layouts
  
- [ ] **Mixed layout - Simple**: 
  - Product 1: 1-up
  - Product 2: 2-up
  - Product 3: 2-up
  - Expected: 2 pages (1st = Product 1, 2nd = Products 2+3)

- [ ] **Mixed layout - Complex**:
  - Products 1-2: 1-up each
  - Products 3-6: 4-up
  - Products 7-8: 2-up
  - Expected: 4 pages

- [ ] **Mixed layout with barcodes**: 
  - Assign different barcode types (EAN-13, QR, None)
  - Verify they appear correctly

- [ ] **Mixed layout with custom banner color**:
  - Select a different website (e.g., Woodslane Health)
  - Verify banner color changes

## Need Help?

### Check Execution Logs
1. Go to your Google Apps Script editor
2. Click **"Executions"** in the left sidebar
3. Click on the most recent execution
4. Look for errors or unexpected behavior

### Check Request Data
1. Open your catalogue creator
2. Open Browser DevTools (F12)
3. Go to **Network** tab
4. Click **"🚀 Mixed Google Doc"**
5. Find the request to `/api/render/googledocs-apps-script`
6. Check the **Payload** to see what data was sent

### Still Not Working?
Check these files have been deployed:
- ✅ `google-apps-script-fixed.js` → Updated in Google Apps Script
- ✅ `pages/index.tsx` → Deployed to Vercel
- ✅ `pages/api/render/googledocs-apps-script.ts` → Deployed to Vercel

## Success Indicators

You'll know it's working when:
1. ✅ The **"🚀 Mixed Google Doc"** button appears next to **"🎨 Mixed Layout View"**
2. ✅ Clicking it creates a Google Doc without errors
3. ✅ The Google Doc has products in their assigned layouts
4. ✅ Page breaks occur at the right places
5. ✅ All formatting (banners, barcodes, etc.) is correct

## Version Info
- **Frontend changes**: `pages/index.tsx` (added `openGoogleAppsScriptMixed` function)
- **Backend changes**: None (API route already supports pass-through)
- **Google Apps Script changes**: Added `layoutAssignments` support in `createCatalogueDocument`

---

**Last Updated**: 2025-10-10
**Feature**: Mixed Layout Google Doc Export
**Status**: Ready for deployment ✅

