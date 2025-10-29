/**
 * Google Apps Script for Mixed Layout Catalogue Creator
 * Generates Google Docs with mixed layouts (different layouts per page)
 */

// HTTP POST handler - entry point for web app
function doPost(e) {
  try {
    // Parse the JSON payload
    const data = JSON.parse(e.postData.contents);
    
    // Create the catalogue document
    const result = createMixedCatalogueDocument(data);
    
    // Return JSON response
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: error.message || 'Unknown error occurred'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// HTTP GET handler (for testing)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Google Apps Script for Mixed Layout Catalogue Creator is running',
    version: '1.0.0'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Main function to create mixed layout catalogue document
function createMixedCatalogueDocument(data) {
  try {
    console.log('Creating mixed layout catalogue document');
    console.log('Data received:', data ? 'Yes' : 'No');
    
    if (!data) {
      throw new Error('No data received');
    }
    
    console.log('Items count:', data.items ? data.items.length : 0);
    
    // Extract parameters
    const {
      items,
      layoutAssignments,
      title = "Mixed Layout Product Catalogue",
      showFields = {},
      bannerColor = '#F7981D',
      websiteName = 'www.woodslane.com.au',
      utmParams = {},
      coverData = null,
      hyperlinkToggle = 'woodslane'
    } = data;
    
    if (!items || items.length === 0) {
      throw new Error('No items provided');
    }
    
    if (!layoutAssignments || items.length !== layoutAssignments.length) {
      throw new Error('Layout assignments must match items count');
    }
    
    // Create new document
    const doc = DocumentApp.create(title + ' - ' + new Date().toISOString().split('T')[0]);
    const body = doc.getBody();
    
    // Clear default content
    body.clear();
    
    // Set document margins (in points: 72 points = 1 inch)
    body.setMarginTop(72);    // 1 inch
    body.setMarginBottom(72); // 1 inch
    body.setMarginLeft(72);   // 1 inch
    body.setMarginRight(72);  // 1 inch
    
    // Create cover pages if requested
    if (coverData) {
      if (coverData.showFrontCover && coverData.coverImageUrls && coverData.coverImageUrls.length > 0) {
        createCoverPage(body, coverData, bannerColor, websiteName, hyperlinkToggle, true);
        body.appendPageBreak();
      }
    }
    
    // Add title
    const titleParagraph = body.appendParagraph(title);
    titleParagraph.setHeading(DocumentApp.ParagraphHeading.TITLE);
    titleParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    const titleText = titleParagraph.editAsText();
    if (titleText) {
      titleText.setFontSize(18).setBold(true).setFontFamily('Calibri');
    }
    
    // Add subtitle
    const subtitleParagraph = body.appendParagraph('Generated on ' + new Date().toLocaleDateString());
    subtitleParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    const subtitleText = subtitleParagraph.editAsText();
    if (subtitleText) {
      subtitleText.setFontSize(12).setItalic(true).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    
    // Add page break after title
    body.appendPageBreak();
    
    // Group items by their layout requirements
    const pages = [];
    let currentPage = [];
    let currentLayout = layoutAssignments[0];
    let itemsInPage = 0;
    
    items.forEach((item, i) => {
      const assignedLayout = layoutAssignments[i];
      
      // Convert layout to number for comparison
      const currentLayoutNum = currentLayout === '2-int' ? 2 : currentLayout;
      const assignedLayoutNum = assignedLayout === '2-int' ? 2 : assignedLayout;
      
      // If layout changes or page is full, start new page
      if (assignedLayout !== currentLayout || itemsInPage >= currentLayoutNum) {
        if (currentPage.length > 0) {
          pages.push({ items: currentPage, layout: currentLayout });
        }
        currentPage = [{ item, index: i }];
        currentLayout = assignedLayout;
        itemsInPage = 1;
      } else {
        currentPage.push({ item, index: i });
        itemsInPage++;
      }
    });
    
    // Add last page
    if (currentPage.length > 0) {
      pages.push({ items: currentPage, layout: currentLayout });
    }
    
    // Create pages
    pages.forEach((page, pageIndex) => {
      if (pageIndex > 0) {
        body.appendPageBreak();
      }
      
      createMixedPage(body, page.items, page.layout, showFields, bannerColor, websiteName, utmParams);
    });
    
    // Create back cover if requested
    if (coverData) {
      if (coverData.showBackCover && coverData.coverImageUrls && coverData.coverImageUrls.length > 0) {
        body.appendPageBreak();
        createCoverPage(body, coverData, bannerColor, websiteName, hyperlinkToggle, false);
      }
    }
    
    // Save and return document URL
    doc.saveAndClose();
    return {
      success: true,
      url: doc.getUrl(),
      title: doc.getName()
    };
    
  } catch (error) {
    console.error('Error creating mixed catalogue document:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Create a page with mixed layout
function createMixedPage(body, pageItems, layout, showFields, bannerColor, websiteName, utmParams) {
  console.log(`Creating page with layout ${layout} and ${pageItems.length} items`);
  
  // Add banner header
  const bannerParagraph = body.appendParagraph(websiteName);
  bannerParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const bannerText = bannerParagraph.editAsText();
  if (bannerText) {
    bannerText.setBackgroundColor(bannerColor).setForegroundColor('#FFFFFF').setBold(true).setFontSize(14).setFontFamily('Calibri');
  }
  
  // Add content based on layout
  if (layout === 1) {
    createSingleItemLayout(body, pageItems[0].item, showFields, bannerColor, websiteName, utmParams);
  } else if (layout === '2-int') {
    create2IntLayout(body, pageItems.map(p => p.item));
  } else {
    createMultiItemLayout(body, pageItems, layout);
  }
  
  // Add banner footer
  const footerParagraph = body.appendParagraph(websiteName);
  footerParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const footerText = footerParagraph.editAsText();
  if (footerText) {
    footerText.setBackgroundColor(bannerColor).setForegroundColor('#FFFFFF').setBold(true).setFontSize(14).setFontFamily('Calibri');
  }
}

// Create 1-up layout (full page with internals at bottom)
function createSingleItemLayout(body, item, showFields, bannerColor, websiteName, utmParams) {
  console.log('Creating 1-up layout for:', item.title);
  
  // Create main table for two-column layout
  const table = body.appendTable();
  table.setBorderWidth(0);
  
  // Create two columns
  const row = table.appendTableRow();
  const leftCell = row.appendTableCell();
  const rightCell = row.appendTableCell();
  
  // Left column: Image and Author Bio
  leftCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  leftCell.setPaddingTop(10);
  leftCell.setPaddingBottom(10);
  leftCell.setPaddingLeft(10);
  leftCell.setPaddingRight(10);
  
  // Add image
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = leftCell.appendImage(imageBlob);
      image.setWidth(250);
      image.setHeight(375); // Maintain aspect ratio
    } catch (error) {
      console.log('Could not load image:', error);
      leftCell.appendParagraph('Image not available');
    }
  }
  
  // Add author bio if enabled and available
  if (showFields.authorBio && item.authorBio) {
    const bioTitle = leftCell.appendParagraph('Author Bio:');
    const bioTitleText = bioTitle.editAsText();
    if (bioTitleText) {
      bioTitleText.setFontSize(10).setBold(true).setForegroundColor('#1565C0').setFontFamily('Calibri');
    }
    
    // Truncate bio to 752 characters
    const plainTextBio = item.authorBio.replace(/<[^>]*>/g, '');
    const displayBio = plainTextBio.length > 752 ? plainTextBio.substring(0, 752) + '...' : plainTextBio;
    
    const bioContent = leftCell.appendParagraph(displayBio);
    const bioText = bioContent.editAsText();
    if (bioText) {
      bioText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
  }
  
  // Right column: Product details
  rightCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  rightCell.setPaddingTop(10);
  rightCell.setPaddingBottom(10);
  rightCell.setPaddingLeft(10);
  rightCell.setPaddingRight(10);
  
  // Title
  const titleParagraph = rightCell.appendParagraph(item.title || '');
  const titleText = titleParagraph.editAsText();
  if (titleText) {
    titleText.setFontSize(14).setBold(true).setFontFamily('Calibri');
  }
  
  // Subtitle
  if (item.subtitle) {
    const subtitleParagraph = rightCell.appendParagraph(item.subtitle);
    const subtitleText = subtitleParagraph.editAsText();
    if (subtitleText) {
      subtitleText.setFontSize(10).setItalic(true).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  // Author
  if (item.author) {
    const authorParagraph = rightCell.appendParagraph(item.author);
    const authorText = authorParagraph.editAsText();
    if (authorText) {
      authorText.setFontSize(10).setForegroundColor('#000000').setFontFamily('Calibri');
    }
  }
  
  // Description
  if (item.description) {
    const descParagraph = rightCell.appendParagraph(item.description);
    const descText = descParagraph.editAsText();
    if (descText) {
      descText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
  }
  
  // Product details row (meta + barcode)
  const detailsTable = rightCell.appendTable();
  detailsTable.setBorderWidth(0);
  const detailsRow = detailsTable.appendTableRow();
  const metaCell = detailsRow.appendTableCell();
  const barcodeCell = detailsRow.appendTableCell();
  
  // Meta information
  metaCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  metaCell.setPaddingRight(20);
  
  if (showFields.binding && item.binding) {
    const bindingParagraph = metaCell.appendParagraph('Binding: ' + item.binding);
    const bindingText = bindingParagraph.editAsText();
    if (bindingText) {
      bindingText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  if (showFields.pages && item.pages) {
    const pagesParagraph = metaCell.appendParagraph('Pages: ' + item.pages);
    const pagesText = pagesParagraph.editAsText();
    if (pagesText) {
      pagesText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  if (showFields.dimensions && item.dimensions) {
    const dimensionsParagraph = metaCell.appendParagraph('Dimensions: ' + item.dimensions);
    const dimensionsText = dimensionsParagraph.editAsText();
    if (dimensionsText) {
      dimensionsText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  if (showFields.releaseDate && item.releaseDate) {
    const releaseParagraph = metaCell.appendParagraph('Release Date: ' + item.releaseDate);
    const releaseText = releaseParagraph.editAsText();
    if (releaseText) {
      releaseText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  // Barcode section
  barcodeCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  barcodeCell.setPaddingLeft(20);
  
  if (showFields.barcode && item.barcode) {
    const barcodeParagraph = barcodeCell.appendParagraph(item.barcode);
    const barcodeText = barcodeParagraph.editAsText();
    if (barcodeText) {
      barcodeText.setFontSize(10).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  // Price
  if (showFields.price && item.price) {
    const priceParagraph = rightCell.appendParagraph('$' + item.price);
    const priceText = priceParagraph.editAsText();
    if (priceText) {
      priceText.setFontSize(14).setBold(true).setForegroundColor('#d63384').setFontFamily('Calibri');
    }
  }
  
  // Internals section (full width at bottom)
  if (showFields.internals && item.additionalImages && item.additionalImages.length > 0) {
    const internalsTitle = body.appendParagraph('Internals:');
    const internalsTitleText = internalsTitle.editAsText();
    if (internalsTitleText) {
      internalsTitleText.setFontSize(14).setBold(true).setForegroundColor('#1565C0').setFontFamily('Calibri');
    }
    
    // Create table for internals (up to 4 images)
    const internalsTable = body.appendTable();
    internalsTable.setBorderWidth(0);
    const internalsRow = internalsTable.appendTableRow();
    
    item.additionalImages.slice(0, 4).forEach((imageUrl, index) => {
      const cell = internalsRow.appendTableCell();
      cell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
      cell.setPaddingTop(10);
      cell.setPaddingBottom(10);
      cell.setPaddingLeft(10);
      cell.setPaddingRight(10);
      
      try {
        const imageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
        const image = cell.appendImage(imageBlob);
        image.setWidth(120);
        image.setHeight(160);
      } catch (error) {
        console.log('Could not load internal image:', error);
        cell.appendParagraph('Image not available');
      }
    });
  }
}

// Create multi-item layout (2-up, 3-up, 4-up, 8-up)
function createMultiItemLayout(body, pageItems, layout) {
  console.log(`Creating ${layout}-up layout with ${pageItems.length} items`);
  
  // Create table for grid layout
  const table = body.appendTable();
  table.setBorderWidth(0);
  
  // Configure table based on layout
  const rows = layout === 8 ? 2 : layout === 4 ? 2 : 1;
  const cols = layout === 8 ? 4 : layout === 4 ? 2 : layout;
  
  // Create table structure
  for (let row = 0; row < rows; row++) {
    const tableRow = table.appendTableRow();
    for (let col = 0; col < cols; col++) {
      const cell = tableRow.appendTableCell();
      cell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
      cell.setPaddingTop(10);
      cell.setPaddingBottom(10);
      cell.setPaddingLeft(10);
      cell.setPaddingRight(10);
      
      const index = row * cols + col;
      if (index < pageItems.length) {
        createProductCard(cell, pageItems[index].item, layout);
      }
    }
  }
}

// Create 2-int layout (2 items per page with internal images)
function create2IntLayout(body, items) {
  console.log('Creating 2-int layout with', items.length, 'items');
  
  // Create table for 2-column layout
  const table = body.appendTable();
  table.setBorderWidth(0);
  table.setColumnWidth(0, 300);
  table.setColumnWidth(1, 300);
  
  const row = table.appendTableRow();
  
  // Create cells for 2 items
  for (let i = 0; i < 2; i++) {
    const cell = row.appendTableCell();
    cell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
    cell.setPaddingTop(10);
    cell.setPaddingBottom(10);
    cell.setPaddingLeft(10);
    cell.setPaddingRight(10);
    
    if (i < items.length) {
      createProductCardWithInternal(cell, items[i], '2-int');
    }
  }
}

// Create product card with internal images (for 2-int layout)
function createProductCardWithInternal(cell, item, layout) {
  console.log(`Creating 2-int product card for:`, item.title);
  
  // Image (same size as 2-up)
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = cell.appendImage(imageBlob);
      image.setWidth(175);
      image.setHeight(263);
    } catch (error) {
      console.log('Could not load image:', error);
      cell.appendParagraph('Image not available');
    }
  }
  
  // Title
  const titleParagraph = cell.appendParagraph(item.title || '');
  const titleText = titleParagraph.editAsText();
  if (titleText) {
    titleText.setFontSize(16).setBold(true).setFontFamily('Calibri');
  }
  titleParagraph.setSpacingAfter(5);
  
  // Subtitle
  if (item.subtitle) {
    const subtitleParagraph = cell.appendParagraph(item.subtitle);
    const subtitleText = subtitleParagraph.editAsText();
    if (subtitleText) {
      subtitleText.setFontSize(12).setItalic(true).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    subtitleParagraph.setSpacingAfter(5);
  }
  
  // Author
  if (item.author) {
    const authorParagraph = cell.appendParagraph(item.author);
    const authorText = authorParagraph.editAsText();
    if (authorText) {
      authorText.setFontSize(12).setForegroundColor('#000000').setFontFamily('Calibri');
    }
    authorParagraph.setSpacingAfter(5);
  }
  
  // Description
  if (item.description) {
    const maxLength = 150;
    const description = item.description.length > maxLength ? 
      item.description.substring(0, maxLength) + '...' : 
      item.description;
    
    const descParagraph = cell.appendParagraph(description);
    const descText = descParagraph.editAsText();
    if (descText) {
      descText.setFontSize(11).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    descParagraph.setSpacingAfter(8);
  }
  
  // Internal Images (up to 2 images side by side)
  if (item.additionalImages && item.additionalImages.length > 0) {
    const internalImagesTable = cell.appendTable();
    internalImagesTable.setBorderWidth(0);
    const internalRow = internalImagesTable.appendTableRow();
    
    // Add up to 2 internal images side by side
    const imagesToShow = item.additionalImages.slice(0, 2);
    imagesToShow.forEach((imageUrl) => {
      const internalCell = internalRow.appendTableCell();
      internalCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
      internalCell.setPaddingTop(2);
      internalCell.setPaddingBottom(2);
      internalCell.setPaddingLeft(2);
      internalCell.setPaddingRight(2);
      
      try {
        const internalImageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
        const internalImage = internalCell.appendImage(internalImageBlob);
        internalImage.setWidth(60);
        internalImage.setHeight(80);
      } catch (error) {
        console.log('Could not load internal image:', error);
        internalCell.appendParagraph('[Internal Image]');
      }
    });
    
    cell.appendParagraph('').setSpacingAfter(8);
  }
  
  // Price
  if (item.price) {
    const priceParagraph = cell.appendParagraph('$' + item.price);
    const priceText = priceParagraph.editAsText();
    if (priceText) {
      priceText.setFontSize(14).setBold(true).setForegroundColor('#d63384').setFontFamily('Calibri');
    }
    priceParagraph.setSpacingAfter(5);
  }
  
  // SKU/Barcode
  if (item.barcode) {
    const skuParagraph = cell.appendParagraph(item.barcode);
    const skuText = skuParagraph.editAsText();
    if (skuText) {
      skuText.setFontSize(12).setForegroundColor('#999999').setFontFamily('Calibri');
    }
  }
}

// Create product card for multi-item layouts
function createProductCard(cell, item, layout) {
  console.log(`Creating product card for layout ${layout}:`, item.title);
  
  // Image sizes based on layout (updated to match HTML export)
  const sizes = {
    2: { width: 175, height: 263 },
    3: { width: 106, height: 158 },
    4: { width: 88, height: 132 },
    8: { width: 40, height: 60 }
  };
  
  // Font sizes based on layout (updated to match HTML export)
  const titleSizes = { 2: 16, 3: 14, 4: 11, 8: 9 };
  const subtitleSizes = { 2: 12, 3: 11, 4: 10, 8: 7 };
  const authorSizes = { 2: 12, 3: 11, 4: 10, 8: 8 };
  const descSizes = { 2: 11, 3: 10, 4: 10, 8: 6 };
  const priceSizes = { 2: 14, 3: 13, 4: 10, 8: 8 };
  const skuSizes = { 2: 12, 3: 8, 4: 7, 8: 6 };
  
  // Add image
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = cell.appendImage(imageBlob);
      const size = sizes[layout] || sizes[4];
      image.setWidth(size.width);
      image.setHeight(size.height);
    } catch (error) {
      console.log('Could not load image:', error);
      cell.appendParagraph('Image not available');
    }
  }
  
  // Title
  const titleParagraph = cell.appendParagraph(item.title || '');
  const titleText = titleParagraph.editAsText();
  if (titleText) {
    titleText.setFontSize(titleSizes[layout] || 11).setBold(true).setFontFamily('Calibri');
  }
  
  // Subtitle
  if (item.subtitle) {
    const subtitleParagraph = cell.appendParagraph(item.subtitle);
    const subtitleText = subtitleParagraph.editAsText();
    if (subtitleText) {
      subtitleText.setFontSize(subtitleSizes[layout] || 9).setItalic(true).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  // Author
  if (item.author) {
    const authorParagraph = cell.appendParagraph(item.author);
    const authorText = authorParagraph.editAsText();
    if (authorText) {
      authorText.setFontSize(authorSizes[layout] || 10).setForegroundColor('#000000').setFontFamily('Calibri');
    }
  }
  
  // Description (truncated for smaller layouts)
  if (item.description) {
    const maxLength = layout === 8 ? 50 : layout === 4 ? 950 : 150; // Updated 4-up to 950 chars
    const truncatedDesc = item.description.length > maxLength 
      ? item.description.substring(0, maxLength) + '...' 
      : item.description;
    
    const descParagraph = cell.appendParagraph(truncatedDesc);
    const descText = descParagraph.editAsText();
    if (descText) {
      descText.setFontSize(descSizes[layout] || 8).setForegroundColor('#333333').setFontFamily('Calibri');
    }
  }
  
  // Price
  if (item.price) {
    const priceParagraph = cell.appendParagraph('$' + item.price);
    const priceText = priceParagraph.editAsText();
    if (priceText) {
      priceText.setFontSize(priceSizes[layout] || 10).setBold(true).setForegroundColor('#d63384').setFontFamily('Calibri');
    }
  }
  
  // SKU/Barcode
  if (item.barcode) {
    const skuParagraph = cell.appendParagraph(item.barcode);
    const skuText = skuParagraph.editAsText();
    if (skuText) {
      skuText.setFontSize(skuSizes[layout] || 7).setForegroundColor('#999999').setFontFamily('Calibri');
    }
  }
}

// Create cover page (front or back)
function createCoverPage(body, coverData, bannerColor, websiteName, hyperlinkToggle, isFrontCover) {
  try {
    // Get logo URL based on hyperlinkToggle
    const brand = hyperlinkToggle || 'woodslane';
    const logoUrl = brand === 'woodslane' 
      ? 'https://www.woodslane.com.au/skin/frontend/rwd/woodslane/images/logo.png'
      : brand === 'woodslanehealth'
      ? 'https://www.woodslanehealth.com.au/skin/frontend/rwd/woodslanehealth/images/logo.png'
      : brand === 'woodslaneeducation'
      ? 'https://www.woodslaneeducation.com.au/skin/frontend/rwd/woodslaneeducation/images/logo.png'
      : 'https://www.woodslane.com.au/skin/frontend/rwd/woodslane/images/logo.png';
    
    // Get text content (front or back)
    const text1 = isFrontCover ? coverData.frontCoverText1 : coverData.backCoverText1;
    const text2 = isFrontCover ? coverData.frontCoverText2 : coverData.backCoverText2;
    const catalogueName = coverData.catalogueName || 'Product Catalogue';
    
    // Get valid image URLs (filter empty strings)
    const validUrls = (coverData.coverImageUrls || []).filter(url => url && url.trim());
    const imageCount = validUrls.length;
    
    if (imageCount === 0) {
      console.log('No valid image URLs for cover page');
      return;
    }
    
    // Create header section with logo and text
    const headerTable = body.appendTable();
    headerTable.setBorderWidth(0);
    const headerRow = headerTable.appendTableRow();
    const logoCell = headerRow.appendTableCell();
    const textCell = headerRow.appendTableCell();
    
    // Set cell properties safely
    try {
      logoCell.setWidth(120);
      logoCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
    } catch (error) {
      console.log('Error setting logo cell properties:', error);
    }
    
    // Add logo
    try {
      const logoBlob = UrlFetchApp.fetch(logoUrl).getBlob();
      const logoImage = logoCell.appendImage(logoBlob);
      logoImage.setWidth(100);
      logoImage.setHeight(100);
    } catch (error) {
      console.log('Could not load logo:', error);
      // Add placeholder text if logo fails
      logoCell.appendParagraph('[Logo]');
    }
    
    // Add text content (right-aligned)
    try {
      textCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
      textCell.setPaddingLeft(20);
    } catch (error) {
      console.log('Error setting text cell properties:', error);
    }
    
    if (text1) {
      const text1Para = textCell.appendParagraph(text1);
      const text1Text = text1Para.editAsText();
      if (text1Text) {
        text1Text.setFontSize(18).setBold(true).setFontFamily('Calibri');
      }
      text1Para.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    }
    
    if (text2) {
      const text2Para = textCell.appendParagraph(text2);
      const text2Text = text2Para.editAsText();
      if (text2Text) {
        text2Text.setFontSize(14).setFontFamily('Calibri');
      }
      text2Para.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    }
    
    // Add catalogue title (centered)
    const titlePara = body.appendParagraph(catalogueName);
    titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    const titleText = titlePara.editAsText();
    if (titleText) {
      titleText.setFontSize(28).setBold(true).setFontFamily('Calibri');
    }
    titlePara.setSpacingAfter(20);
    
    // Create images grid based on count
    const imagesTable = body.appendTable();
    imagesTable.setBorderWidth(0);
    imagesTable.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    
    // Determine grid layout
    let rows, cols;
    if (imageCount === 1) {
      rows = 1; cols = 1;
    } else if (imageCount === 2) {
      rows = 1; cols = 2;
    } else if (imageCount === 3) {
      rows = 2; cols = 2; // Third image spans both columns
    } else {
      rows = 2; cols = 2; // 4 images in 2x2 grid
    }
    
    // Create grid structure
    for (let r = 0; r < rows; r++) {
      const row = imagesTable.appendTableRow();
      for (let c = 0; c < cols; c++) {
      const cell = row.appendTableCell();
      
      // Determine which image to show first
      let imageIndex = -1;
      if (imageCount === 1) {
        imageIndex = 0;
      } else if (imageCount === 2) {
        imageIndex = c;
      } else if (imageCount === 3) {
        if (r === 0) imageIndex = c;
        else if (r === 1 && c === 0) imageIndex = 2;
      } else {
        imageIndex = r * cols + c;
      }
      
      // Set cell properties safely (after cell is created)
      try {
        cell.setVerticalAlignment(DocumentApp.VerticalAlignment.MIDDLE);
        cell.setPaddingTop(5);
        cell.setPaddingBottom(5);
        cell.setPaddingLeft(5);
        cell.setPaddingRight(5);
      } catch (error) {
        console.log('Error setting image cell properties:', error);
      }
        
      // Only process cells that should have images
      if (imageIndex >= 0 && imageIndex < validUrls.length) {
          try {
            const imageBlob = UrlFetchApp.fetch(validUrls[imageIndex]).getBlob();
            const image = cell.appendImage(imageBlob);
            
            // Set size based on count (larger for fewer images)
            if (imageCount === 1) {
              image.setWidth(400);
              image.setHeight(600);
            } else if (imageCount === 2) {
              image.setWidth(225);
              image.setHeight(300);
            } else {
              image.setWidth(200);
              image.setHeight(250);
            }
          } catch (error) {
            console.log('Could not load cover image:', validUrls[imageIndex]);
            const placeholder = cell.appendParagraph('[Cover Image]');
            placeholder.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          }
        } else {
          // Empty cell (like in 3-image layout at position 1,1)
          // Add empty paragraph to ensure cell has content
          cell.appendParagraph('');
        }
      }
    }
    
    // Add footer with banner color
    const footerPara = body.appendParagraph(websiteName);
    footerPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    const footerText = footerPara.editAsText();
    if (footerText) {
      footerText.setBackgroundColor(bannerColor).setForegroundColor('#FFFFFF').setBold(true).setFontSize(12).setFontFamily('Calibri');
    }
    footerPara.setSpacingBefore(30);
    
    // Add contact info
    const contactPara = body.appendParagraph('Phone: (02) 8445 2300\nEmail: Info@woodslane.com.au');
    contactPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    const contactText = contactPara.editAsText();
    if (contactText) {
      contactText.setFontSize(9).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    
  } catch (error) {
    console.error('Error creating cover page:', error);
  }
}

// Test function for mixed layout
function testMixedLayout() {
  const testData = {
    items: [
      { title: 'Test Book 1', author: 'Author 1', imageUrl: 'https://via.placeholder.com/200x300' },
      { title: 'Test Book 2', author: 'Author 2', imageUrl: 'https://via.placeholder.com/200x300' },
      { title: 'Test Book 3', author: 'Author 3', imageUrl: 'https://via.placeholder.com/200x300' }
    ],
    layoutAssignments: [1, 2, 4],
    title: 'Test Mixed Layout',
    showFields: {
      authorBio: true,
      internals: true,
      barcode: true,
      price: true
    }
  };
  
  const result = createMixedCatalogueDocument(testData);
  console.log('Test result:', result);
  return result;
}
