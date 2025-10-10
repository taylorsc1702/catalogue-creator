# 🎨 Mixed Layout Google Doc Export

## Overview
The mixed layout Google Doc export feature allows you to create catalogues where different products can have different layouts (1-up, 2-up, 3-up, 4-up, 8-up) all within the same document.

## How It Works

### 1. **Frontend (pages/index.tsx)**
- A new button **"🚀 Mixed Google Doc"** appears when you enable reordering mode
- When clicked, it calls `openGoogleAppsScriptMixed()` function
- This function:
  - Collects all products
  - Creates a `layoutAssignments` array mapping each product to its assigned layout
  - Sends the data to `/api/render/googledocs-apps-script` with the `layoutAssignments` parameter

### 2. **API Route (pages/api/render/googledocs-apps-script.ts)**
- Receives the request with `layoutAssignments` array
- Passes it through to the Google Apps Script deployment
- Returns the Google Doc URL and metadata

### 3. **Google Apps Script (google-apps-script-fixed.js)**
- Detects if `layoutAssignments` is provided (mixed layout mode)
- **Mixed Layout Logic**:
  - Iterates through all items
  - For each page, takes the current item's layout value (e.g., 1, 2, 4)
  - Collects that many items for the page
  - Renders them using the appropriate layout handler
  - Moves to the next item and repeats

### Example
If you have 5 products with these assignments:
```
Product 1: 1-up (1 per page)
Product 2: 2-up (2 per page)
Product 3: 2-up (2 per page)  → Goes on same page as Product 2
Product 4: 4-up (4 per page)
Product 5: 1-up (1 per page)
```

The resulting Google Doc will have:
- **Page 1**: Product 1 (1-up layout)
- **Page 2**: Product 2 & 3 (2-up layout, side by side)
- **Page 3**: Product 4 (4-up layout, partial page with 1 item)
- **Page 4**: Product 5 (1-up layout)

## Features

### ✅ Supported
- All layout types: 1-up, 2-up, 3-up, 4-up, 8-up
- Author bio for 1-up layouts
- Internals (up to 4 thumbnails) for 1-up layouts
- EAN-13 barcodes and QR codes
- Custom banners with colors
- UTM parameters for links
- Reordering products
- Individual barcode type assignments per product

### 🎯 Use Cases
1. **Featured products first**: Use 1-up layout for featured titles, then 2-up or 4-up for regular titles
2. **Different product types**: Full-page layout for illustrated books, compact layout for novels
3. **Highlight new releases**: 1-up for new releases, 4-up for backlist
4. **Custom catalogues**: Mix and match based on marketing strategy

## How to Use

### Step 1: Enable Reordering Mode
Click the **"🔀 Reorder Items"** button to enable layout assignment mode.

### Step 2: Assign Layouts
For each product in the preview, use the dropdown to select the desired layout:
- 1 per page (1-up)
- 2 per page (2-up)
- 3 per page (3-up)
- 4 per page (4-up)
- 8 per page (8-up)

### Step 3: Create Google Doc
Click the **"🚀 Mixed Google Doc"** button to generate your mixed layout catalogue.

### Step 4: Review & Edit
The Google Doc will open in a new tab, ready for review and editing.

## Technical Details

### Data Flow
```
User assigns layouts
    ↓
Frontend collects layoutAssignments array
    ↓
POST to /api/render/googledocs-apps-script
    ↓
Proxy to Google Apps Script
    ↓
GAS detects mixed layout
    ↓
Iterates through items with assigned layouts
    ↓
Creates pages with appropriate layouts
    ↓
Returns Google Doc URL
    ↓
Frontend opens Google Doc
```

### Key Code Changes

**Frontend (pages/index.tsx)**
```javascript
async function openGoogleAppsScriptMixed() {
  const layoutAssignments = items.map((_, i) => itemLayouts[i] || layout);
  
  const resp = await fetch("/api/render/googledocs-apps-script", {
    method: "POST",
    body: JSON.stringify({ 
      items, 
      layoutAssignments, // Pass mixed layouts
      // ... other params
    })
  });
}
```

**Google Apps Script (google-apps-script-fixed.js)**
```javascript
const isMixedLayout = layoutAssignments && layoutAssignments.length === items.length;

if (isMixedLayout) {
  let currentIndex = 0;
  
  while (currentIndex < items.length) {
    const currentLayout = layoutAssignments[currentIndex];
    const itemsForThisPage = [];
    
    // Collect items for this page
    for (let i = 0; i < currentLayout && currentIndex < items.length; i++) {
      itemsForThisPage.push(items[currentIndex]);
      currentIndex++;
    }
    
    createPage(body, itemsForThisPage, currentLayout, showFields, bannerColor, websiteName, utmParams);
  }
}
```

## Deployment

### Update Google Apps Script
1. Open your Google Apps Script project
2. Copy the updated code from `google-apps-script-fixed.js`
3. Click **"Deploy"** → **"Manage deployments"**
4. Click **"Edit"** (pencil icon) on your existing deployment
5. Change the version to **"New version"**
6. Click **"Deploy"**

### Deploy to Vercel
```bash
git add .
git commit -m "Add mixed layout Google Doc export"
git push origin main
```

Vercel will automatically deploy the changes.

## Troubleshooting

### Issue: Mixed layout not working
- **Check**: Ensure you've updated the Google Apps Script with the latest code
- **Check**: Verify that `layoutAssignments` is being sent in the request (check Network tab)
- **Fix**: Redeploy the Google Apps Script with "New version"

### Issue: Items appearing on wrong pages
- **Check**: Verify the layout assignments in the preview
- **Check**: Look at the `layoutAssignments` array in the request payload
- **Fix**: Clear layout assignments and reassign

### Issue: 400 Bad Request
- **Check**: Ensure `GOOGLE_APPS_SCRIPT_URL` environment variable is set in Vercel
- **Check**: Google Apps Script is deployed with "Anyone" access
- **Fix**: Follow the deployment steps again

## Future Enhancements
- [ ] Visual page preview showing how items will be grouped
- [ ] Bulk layout assignment (e.g., "Make all fiction books 2-up")
- [ ] Layout templates (e.g., "Featured + Backlist" preset)
- [ ] Page count estimate before generation
- [ ] Mixed layout for DOCX export

