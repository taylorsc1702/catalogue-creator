# Woodslane Catalogue Creator - User Guide

## Overview
The Woodslane Catalogue Creator is a powerful tool for generating professional product catalogues from your Shopify store. It supports multiple layouts, export formats, and branding options for all Woodslane websites.

## Getting Started

### 1. Access the Tool
- Navigate to the catalogue creator URL
- The interface will load with default settings

### 2. Basic Workflow
1. **Configure Settings** → 2. **Fetch Products** → 3. **Preview** → 4. **Export**

---

## Configuration Options

### Website Selection
Choose which Woodslane website to use for product links and branding:

- **Woodslane** (www.woodslane.com.au) - Orange branding (#F7981D)
- **Woodslane Health** (www.woodslanehealth.com.au) - Blue branding (#1EADFF)
- **Woodslane Education** (www.woodslaneeducation.com.au) - Green branding (#28A745)
- **Woodslane Press** (www.woodslanepress.com.au) - Light blue branding (#1EADFF)

### Product Filtering Options

#### By Tags
- Enter comma-separated tags (e.g., `spring2024, new-release`)
- Products matching ANY of these tags will be included

#### By Vendor
- Enter vendor name (e.g., `Hey Sigmund`, `Woodslane`)
- Only products from this vendor will be included

#### By Collection ID
- Enter Shopify collection ID (numeric)
- Only products in this collection will be included

#### By Publishing Status
- **Active**: Only published products
- **Draft**: Only draft products
- **All**: Both active and draft products

#### By Specific Products (Handle List)
- Enter product handles, one per line
- Only these specific products will be included
- Example:
  ```
  hey-warrior
  dear-you-love-from-your-brain
  but-were-not-lions
  ```

### Layout Options

#### Grid Layouts
- **1-up**: One product per page (detailed view with author bio and internals)
- **2-up**: Two products per page
- **3-up**: Three products per page (horizontal row layout)
- **4-up**: Four products per page
- **8-up**: Eight products per page

#### List Layouts
- **List**: Horizontal list with images, titles, and details
- **Compact List**: Compact horizontal list without images
- **Table**: Tabular format with columns for ISBN, Author, Title, AURRP, Discount, Quantity

### Barcode Options
- **EAN-13**: Traditional barcode using product SKU/ISBN
- **QR Code**: QR code linking to product page
- **None**: No barcode displayed

### UTM Tracking Parameters (Optional)
Add tracking parameters to all product URLs for analytics:

- **Source (UTM_SOURCE)**: Default "catalogue"
- **Medium (UTM_MEDIUM)**: Default "print"
- **Campaign (UTM_CAMPAIGN)**: Default "spring2024"
- **Content (UTM_CONTENT)**: Default "qr_code"
- **Term (UTM_TERM)**: Default "keyword"

### Banner Customization
- **Automatic**: Uses brand colors based on website selection
- **Custom**: Override with your own hex color (e.g., #FF5733)
- Banner appears at header and footer of all exports

---

## Step-by-Step Usage

### Step 1: Configure Your Catalogue

1. **Select Website**: Choose the appropriate Woodslane website
2. **Set Product Filters**: 
   - Use tags for seasonal collections (e.g., `spring2024`)
   - Use vendor for specific publishers
   - Use handle list for curated selections
3. **Choose Layout**: Select appropriate layout for your needs
4. **Set Barcode Type**: Choose EAN-13, QR Code, or None
5. **Configure UTM Parameters**: Add tracking for analytics
6. **Customize Banner**: Adjust colors if needed

### Step 2: Fetch Products

1. Click **"Fetch Products"** button
2. Wait for products to load (progress indicator will show)
3. Review the product count and query used
4. Products will appear in the preview area

### Step 3: Preview Your Catalogue

- **Live Preview**: See how your catalogue will look
- **Layout Options**: Switch between different layouts to compare
- **Product Details**: Hover over products to see details
- **Reorder Items**: Use drag-and-drop or arrow buttons to reorder

### Step 4: Export Your Catalogue

#### HTML Export Options
- **📄 HTML Print View**: Opens in browser for printing
- **📋 List View**: Horizontal list format
- **📋 Compact List**: Compact list without images
- **📊 Table View**: Tabular format for data analysis

#### Document Export Options
- **📝 Download DOCX**: Microsoft Word document
- **📊 Google Docs Import**: HTML for Google Docs import
- **🚀 Create Google Doc**: Direct Google Docs creation (requires setup)

#### Advanced Options
- **🎨 Mixed Layout View**: Preview with different layouts per product
- **🚀 Mixed Google Doc**: Create Google Doc with mixed layouts

---

## Layout Details

### 1-Up Layout
- **Best for**: Detailed product showcases
- **Features**: 
  - Large product image
  - Author bio (if available)
  - Internal page images (2x2 grid)
  - Complete product details
  - Barcode/QR code

### 2-Up Layout
- **Best for**: Balanced detail and space efficiency
- **Features**:
  - Two products per page
  - Product details in table format
  - Barcode/QR code

### 3-Up Layout
- **Best for**: Efficient use of space
- **Features**:
  - Horizontal row layout
  - Image, content, and details columns
  - Truncated descriptions (1000 characters)
  - Compact product details

### 4-Up and 8-Up Layouts
- **Best for**: High-density catalogues
- **Features**:
  - Multiple products per page
  - Compact information display
  - Efficient for large product ranges

### List Layouts
- **Best for**: Quick reference and data analysis
- **Features**:
  - Horizontal layout with key information
  - Easy to scan
  - Good for inventory management

### Table Layout
- **Best for**: Data analysis and inventory
- **Features**:
  - Columns: ISBN, Author, Title, AURRP, Discount, Quantity
  - Compact row height
  - A4 page optimized
  - Blank quantity column for manual entry

---

## Export Formats

### HTML Export
- **Use for**: Web viewing, email sharing, printing
- **Features**: 
  - Responsive design
  - Print-optimized CSS
  - Clickable product links
  - UTM tracking included

### DOCX Export
- **Use for**: Microsoft Word editing, professional documents
- **Features**:
  - Editable format
  - Professional layout
  - Embedded images
  - Barcode/QR codes

### Google Docs Export
- **Use for**: Collaborative editing, cloud sharing
- **Features**:
  - Direct Google Docs creation
  - Collaborative editing
  - Cloud storage
  - Easy sharing

---

## Advanced Features

### Mixed Layout Mode
- **Purpose**: Use different layouts for different products
- **How to use**:
  1. Enable "Reorder Items" mode
  2. Set individual layout for each product
  3. Use "Mixed Layout View" to preview
  4. Export with "Mixed Google Doc"

### Individual Barcode Types
- **Purpose**: Different barcode types per product
- **How to use**:
  1. Enable "Reorder Items" mode
  2. Set barcode type for each product
  3. Export normally

### Product Reordering
- **Purpose**: Control product sequence
- **How to use**:
  1. Click "Reorder Items" button
  2. Use drag-and-drop or arrow buttons
  3. Set individual layouts and barcode types
  4. Click "✓ Reordering Mode" to finish

---

## Troubleshooting

### Common Issues

#### No Products Found
- **Check filters**: Ensure tags, vendor, or collection ID are correct
- **Check status**: Verify publishing status setting
- **Check handles**: Ensure product handles are valid

#### Images Not Loading
- **Check internet connection**: Images are fetched from Shopify
- **Check product data**: Ensure products have featured images
- **Try refresh**: Reload the page and fetch products again

#### Export Errors
- **Check product count**: Large catalogues may timeout
- **Check browser**: Try different browser or clear cache
- **Check popup blockers**: Allow popups for export windows

#### Google Docs Creation Fails
- **Check setup**: Ensure Google Apps Script is properly configured
- **Check permissions**: Verify Google account permissions
- **Try smaller batches**: Reduce product count for large catalogues

### Performance Tips

#### For Large Catalogues
- Use specific filters to reduce product count
- Use handle list for curated selections
- Consider using list or table layouts for better performance

#### For Best Results
- Use high-quality product images
- Ensure product data is complete
- Test with small batches first

---

## Best Practices

### Catalogue Planning
1. **Define your audience**: Choose layout based on use case
2. **Plan your filters**: Use tags and collections effectively
3. **Consider the format**: HTML for web, DOCX for print, Google Docs for collaboration

### Content Optimization
1. **Complete product data**: Ensure all metafields are populated
2. **High-quality images**: Use clear, professional product photos
3. **Consistent branding**: Use appropriate website selection

### Export Strategy
1. **Test first**: Always preview before final export
2. **Choose right format**: Match export format to intended use
3. **Include tracking**: Use UTM parameters for analytics

### Workflow Efficiency
1. **Save configurations**: Note down successful filter combinations
2. **Batch processing**: Group similar catalogues together
3. **Quality control**: Review exports before distribution

---

## Support

### Getting Help
- Check this user guide first
- Test with small product sets
- Verify all settings are correct
- Try different browsers if issues persist

### Feature Requests
- Document specific use cases
- Provide examples of desired output
- Include any error messages

---

## Technical Notes

### Data Sources
- Products are fetched directly from Shopify
- Images are served from Shopify CDN
- Metafields include: Author, Subtitle, Binding, Pages, Imprint, Dimensions, Release Date, Weight, Author Bio, Discount, etc.

### Export Formats
- HTML: Server-side rendered with embedded CSS
- DOCX: Generated using docx library with embedded images
- Google Docs: Created via Google Apps Script API

### Performance
- Product fetching: ~1-2 seconds per 100 products
- HTML export: ~2-5 seconds depending on product count
- DOCX export: ~5-10 seconds depending on images
- Google Docs: ~10-30 seconds depending on complexity

---

*Last updated: [Current Date]*
*Version: 1.0*
