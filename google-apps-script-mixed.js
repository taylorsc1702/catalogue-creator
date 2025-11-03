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
      hyperlinkToggle = 'woodslane',
      itemBarcodeTypes = {},
      barcodeType = 'None'
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
    // Reduced margins to match HTML export
    body.setMarginTop(56.69);    // ~20mm (was 72pt = 1 inch)
    body.setMarginBottom(56.69); // ~20mm (was 72pt = 1 inch)
    body.setMarginLeft(42.52);   // ~15mm (was 72pt = 1 inch)
    body.setMarginRight(42.52);  // ~15mm (was 72pt = 1 inch)
    
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
      
      createMixedPage(body, page.items, page.layout, showFields, bannerColor, websiteName, utmParams, itemBarcodeTypes, barcodeType);
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
function createMixedPage(body, pageItems, layout, showFields, bannerColor, websiteName, utmParams, itemBarcodeTypes, barcodeType) {
  console.log(`Creating page with layout ${layout} and ${pageItems.length} items`);
  
  // Add banner header - ZERO SPACING BEFORE, MINIMAL AFTER
  const bannerParagraph = body.appendParagraph(websiteName);
  bannerParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  bannerParagraph.setSpacingBefore(0); // No space before header
  bannerParagraph.setSpacingAfter(10); // Small spacing after header
  const bannerText = bannerParagraph.editAsText();
  if (bannerText) {
    // ONLY set background color on banner text, not all text - ensure no inheritance
    bannerText.setBackgroundColor(bannerColor).setForegroundColor('#FFFFFF').setBold(true).setFontSize(14).setFontFamily('Calibri');
  }
  
  // Add content based on layout
  if (layout === 1) {
    const itemIndex = pageItems[0].index || 0;
    const itemBarcodeType = itemBarcodeTypes[itemIndex] || barcodeType;
    createSingleItemLayout(body, pageItems[0].item, showFields, bannerColor, websiteName, utmParams, itemBarcodeType);
    // Add internals box at bottom for 1-up
    addInternalsBoxFor1Up(body, pageItems[0].item, showFields);
  } else if (layout === '1L') {
    const itemIndex = pageItems[0].index || 0;
    const itemBarcodeType = itemBarcodeTypes[itemIndex] || barcodeType;
    createSingleItemLayout(body, pageItems[0].item, showFields, bannerColor, websiteName, utmParams, itemBarcodeType);
    // Add internals box at bottom for 1L - double stacked with 4 images
    addInternalsBoxFor1L(body, pageItems[0].item, showFields);
  } else if (layout === '2-int') {
    create2IntLayout(body, pageItems, itemBarcodeTypes, barcodeType);
  } else {
    createMultiItemLayout(body, pageItems, layout, itemBarcodeTypes, barcodeType);
  }
  
  // Add banner footer - MINIMAL SPACING BEFORE
  const footerSpacer = body.appendParagraph('');
  footerSpacer.setSpacingBefore(0);
  footerSpacer.setSpacingAfter(0);
  
  const footerParagraph = body.appendParagraph(websiteName);
  footerParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  footerParagraph.setSpacingBefore(0); // No space before footer
  const footerText = footerParagraph.editAsText();
  if (footerText) {
    // ONLY set background color on footer text, not all text - ensure no inheritance
    footerText.setBackgroundColor(bannerColor).setForegroundColor('#FFFFFF').setBold(true).setFontSize(14).setFontFamily('Calibri');
  }
}

// Create 1-up layout (full page with internals at bottom)
// Matches HTML: 200x300 image (not 250x375)
function createSingleItemLayout(body, item, showFields, bannerColor, websiteName, utmParams, itemBarcodeType) {
  console.log('Creating 1-up layout for:', item.title);
  
  // Create main table for two-column layout
  const table = body.appendTable();
  table.setBorderWidth(0);
  
  // Create two columns
  const row = table.appendTableRow();
  const leftCell = row.appendTableCell();
  const rightCell = row.appendTableCell();
  
  // Set column widths to prevent overflow (match HTML proportions)
  try {
    table.setColumnWidth(0, 220); // Left column: image (~200px + padding)
    table.setColumnWidth(1, 320); // Right column: content (flexible)
  } catch (e) {
    console.log('setColumnWidth not supported or failed:', e);
  }
  
  // Left column: Image and Author Bio
  leftCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  leftCell.setPaddingTop(6);  // Match HTML: 8px ≈ 6pt
  leftCell.setPaddingBottom(6);
  leftCell.setPaddingLeft(6);
  leftCell.setPaddingRight(6);
  
  // Add image - 60% OF ORIGINAL SIZE (200x300 -> 120x180)
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = leftCell.appendImage(imageBlob);
      image.setWidth(120);   // 60% of 200
      image.setHeight(180);  // 60% of 300 (aspect ratio maintained)
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
  rightCell.setPaddingTop(6);  // Match HTML: 8px ≈ 6pt
  rightCell.setPaddingBottom(6);
  rightCell.setPaddingLeft(6);
  rightCell.setPaddingRight(6);
  
  // Title - 2 POINTS SMALLER (24 -> 22)
  const titleParagraph = rightCell.appendParagraph(item.title || '');
  const titleText = titleParagraph.editAsText();
  if (titleText) {
    titleText.setFontSize(22).setBold(true).setFontFamily('Calibri'); // 24 - 2 = 22
  }
  
  // Subtitle - 2 POINTS SMALLER (18 -> 16)
  if (item.subtitle) {
    const subtitleParagraph = rightCell.appendParagraph(item.subtitle);
    const subtitleText = subtitleParagraph.editAsText();
    if (subtitleText) {
      subtitleText.setFontSize(16).setItalic(true).setForegroundColor('#666666').setFontFamily('Calibri'); // 18 - 2 = 16
    }
  }
  
  // Author - 2 POINTS SMALLER (16 -> 14)
  if (item.author) {
    const authorParagraph = rightCell.appendParagraph(item.author);
    const authorText = authorParagraph.editAsText();
    if (authorText) {
      authorText.setFontSize(14).setForegroundColor('#000000').setFontFamily('Calibri'); // 16 - 2 = 14
    }
  }
  
  // Description - 2 POINTS SMALLER (14 -> 12)
  if (item.description) {
    const descParagraph = rightCell.appendParagraph(item.description);
    const descText = descParagraph.editAsText();
    if (descText) {
      descText.setFontSize(12).setForegroundColor('#333333').setFontFamily('Calibri'); // 14 - 2 = 12
    }
  }
  
  // Product details row (meta + barcode)
  const detailsTable = rightCell.appendTable();
  detailsTable.setBorderWidth(0);
  const detailsRow = detailsTable.appendTableRow();
  const metaCell = detailsRow.appendTableCell();
  const barcodeCell = detailsRow.appendTableCell();
  
  // Meta information - SHOW BY DEFAULT (not conditional on showFields)
  metaCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  metaCell.setPaddingRight(20);
  
  // Show product details if they exist (don't check showFields for these)
  if (item.binding) {
    const bindingParagraph = metaCell.appendParagraph('Binding: ' + item.binding);
    const bindingText = bindingParagraph.editAsText();
    if (bindingText) {
      bindingText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  if (item.pages) {
    const pagesParagraph = metaCell.appendParagraph('Pages: ' + item.pages);
    const pagesText = pagesParagraph.editAsText();
    if (pagesText) {
      pagesText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  if (item.dimensions) {
    const dimensionsParagraph = metaCell.appendParagraph('Dimensions: ' + item.dimensions);
    const dimensionsText = dimensionsParagraph.editAsText();
    if (dimensionsText) {
      dimensionsText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  if (item.releaseDate) {
    const releaseParagraph = metaCell.appendParagraph('Release Date: ' + item.releaseDate);
    const releaseText = releaseParagraph.editAsText();
    if (releaseText) {
      releaseText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  // Also show imprint if available
  if (item.imprint) {
    const imprintParagraph = metaCell.appendParagraph('Publisher: ' + item.imprint);
    const imprintText = imprintParagraph.editAsText();
    if (imprintText) {
      imprintText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  // Show SKU/ISBN if available
  const idObj = item; // item might have isbn13 or sku
  const isbn = idObj.isbn13 || item.sku;
  if (isbn) {
    const isbnParagraph = metaCell.appendParagraph('ISBN: ' + isbn);
    const isbnText = isbnParagraph.editAsText();
    if (isbnText) {
      isbnText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
  }
  
  // Barcode section - USE IMAGE URL FROM SERVER
  barcodeCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  barcodeCell.setPaddingLeft(20);
  
  if (item.barcodeImageUrl && itemBarcodeType && itemBarcodeType !== 'None') {
    try {
      // Convert data URL to blob and insert image
      const base64Data = item.barcodeImageUrl.split(',')[1] || item.barcodeImageUrl;
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png');
      const barcodeImage = barcodeCell.appendImage(blob);
      if (itemBarcodeType === 'QR Code') {
        barcodeImage.setWidth(60); // QR code size
        barcodeImage.setHeight(60);
      } else {
        barcodeImage.setWidth(120); // EAN-13 barcode width
        barcodeImage.setHeight(30);
      }
      barcodeImage.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    } catch (error) {
      console.log('Could not insert barcode image:', error);
      // Fallback to text
      if (item.barcodeCode) {
        const barcodeParagraph = barcodeCell.appendParagraph(item.barcodeCode);
        const barcodeText = barcodeParagraph.editAsText();
        if (barcodeText) {
          barcodeText.setFontSize(10).setForegroundColor('#666666').setFontFamily('Calibri');
        }
        barcodeParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
  } else if (showFields.barcode && item.barcode) {
    // Legacy fallback
    const barcodeParagraph = barcodeCell.appendParagraph(item.barcode);
    const barcodeText = barcodeParagraph.editAsText();
    if (barcodeText) {
      barcodeText.setFontSize(10).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    barcodeParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }
  
  // Price - 2 POINTS SMALLER (14 -> 12)
  if (showFields.price && item.price) {
    const priceParagraph = rightCell.appendParagraph('AUD$ ' + item.price);
    const priceText = priceParagraph.editAsText();
    if (priceText) {
      priceText.setFontSize(12).setBold(true).setForegroundColor('#d63384').setFontFamily('Calibri'); // 14 - 2 = 12
    }
    priceParagraph.setSpacingAfter(4);
  }
  
  // Meta text sizes - ALL 2 POINTS SMALLER (12 -> 10)
  // (Meta text already handled in detailsTable above)
}

// Add internals box at bottom for 1-up layout
function addInternalsBoxFor1Up(body, item, showFields) {
  if (showFields.internals && item.additionalImages && item.additionalImages.length > 0) {
    // Add spacing before internals box
    body.appendParagraph('').setSpacingAfter(4);
    
    // Create bordered box for internals
    const internalsTable = body.appendTable();
    internalsTable.setBorderWidth(1); // Visible border to create box
    
    const numImages = Math.min(item.additionalImages.length, 4);
    
    // Create header row that spans all columns
    const headerRow = internalsTable.appendTableRow();
    const headerCell = headerRow.appendTableCell();
    // Make header span all columns if multiple images
    if (numImages > 1) {
      try {
        headerCell.merge().setNumColumns(numImages);
      } catch (e) {
        console.log('merge not supported:', e);
      }
    }
    headerCell.setPaddingTop(4);
    headerCell.setPaddingBottom(4);
    headerCell.setPaddingLeft(4);
    headerCell.setPaddingRight(4);
    
    const internalsTitle = headerCell.appendParagraph('Internals:');
    const internalsTitleText = internalsTitle.editAsText();
    if (internalsTitleText) {
      internalsTitleText.setFontSize(12).setBold(true).setForegroundColor('#1565C0').setFontFamily('Calibri'); // 2 points smaller
    }
    
    // Create row for images
    const imagesRow = internalsTable.appendTableRow();
    item.additionalImages.slice(0, 4).forEach((imageUrl, index) => {
      const cell = imagesRow.appendTableCell();
      cell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
      cell.setPaddingTop(4);
      cell.setPaddingBottom(4);
      cell.setPaddingLeft(4);
      cell.setPaddingRight(4);
      
      try {
        const imageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
        const image = cell.appendImage(imageBlob);
        image.setWidth(110);  // Slightly smaller to fit in box
        image.setHeight(147); // Maintain aspect ratio
      } catch (error) {
        console.log('Could not load internal image:', error);
        cell.appendParagraph('Img N/A').setFontSize(8);
      }
    });
    
    // Set column widths after cells exist
    try {
      if (numImages > 0) {
        const colWidth = 520 / numImages; // Divide full width by number of images
        for (let i = 0; i < numImages; i++) {
          internalsTable.setColumnWidth(i, colWidth);
        }
      }
    } catch (e) {
      console.log('setColumnWidth not supported:', e);
    }
  }
}

// Add internals box at bottom for 1L layout - double stacked with 4 images (2 rows of 2)
function addInternalsBoxFor1L(body, item, showFields) {
  if (showFields.internals && item.additionalImages && item.additionalImages.length > 0) {
    // Reduced spacing before internals box to move it closer to bottom of page
    body.appendParagraph('').setSpacingAfter(3);
    
    // Create bordered box for internals
    const internalsTable = body.appendTable();
    internalsTable.setBorderWidth(1); // Visible border to create box
    
    const numImages = Math.min(item.additionalImages.length, 4);
    
    // Create header row that spans all columns
    const headerRow = internalsTable.appendTableRow();
    const headerCell = headerRow.appendTableCell();
    // Make header span all 2 columns
    try {
      headerCell.merge().setNumColumns(2);
    } catch (e) {
      console.log('merge not supported:', e);
    }
    headerCell.setPaddingTop(4);
    headerCell.setPaddingBottom(4);
    headerCell.setPaddingLeft(4);
    headerCell.setPaddingRight(4);
    
    const internalsTitle = headerCell.appendParagraph('Internals:');
    const internalsTitleText = internalsTitle.editAsText();
    if (internalsTitleText) {
      internalsTitleText.setFontSize(12).setBold(true).setForegroundColor('#1565C0').setFontFamily('Calibri');
    }
    
    // Create FIRST ROW for images (first 2 images)
    const imagesRow1 = internalsTable.appendTableRow();
    item.additionalImages.slice(0, 2).forEach((imageUrl, index) => {
      const cell = imagesRow1.appendTableCell();
      cell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
      cell.setPaddingTop(4);
      cell.setPaddingBottom(4);
      cell.setPaddingLeft(4);
      cell.setPaddingRight(4);
      
      try {
        const imageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
        const image = cell.appendImage(imageBlob);
        // Larger images for 1L layout - optimized for landscape photos
        image.setWidth(240);  // Larger width for landscape optimization
        image.setHeight(176); // Maintain aspect ratio (approximately 3:2.2)
      } catch (error) {
        console.log('Could not load internal image:', error);
        cell.appendParagraph('Img N/A').setFontSize(8);
      }
    });
    
    // Create SECOND ROW for images (next 2 images)
    if (numImages > 2) {
      const imagesRow2 = internalsTable.appendTableRow();
      item.additionalImages.slice(2, 4).forEach((imageUrl, index) => {
        const cell = imagesRow2.appendTableCell();
        cell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
        cell.setPaddingTop(4);
        cell.setPaddingBottom(4);
        cell.setPaddingLeft(4);
        cell.setPaddingRight(4);
        
        try {
          const imageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
          const image = cell.appendImage(imageBlob);
          // Larger images for 1L layout - optimized for landscape photos
          image.setWidth(240);  // Larger width for landscape optimization
          image.setHeight(176); // Maintain aspect ratio (approximately 3:2.2)
        } catch (error) {
          console.log('Could not load internal image:', error);
          cell.appendParagraph('Img N/A').setFontSize(8);
        }
      });
    }
    
    // Set column widths after cells exist (2 columns)
    try {
      const colWidth = 520 / 2; // Divide full width by 2 columns
      internalsTable.setColumnWidth(0, colWidth);
      internalsTable.setColumnWidth(1, colWidth);
    } catch (e) {
      console.log('setColumnWidth not supported:', e);
    }
  }
}

// Create multi-item layout (2-up, 3-up, 4-up, 8-up)
// PRINT-OPTIMIZED: Fixed dimensions, confined boxes, proper scaling
function createMultiItemLayout(body, pageItems, layout, itemBarcodeTypes, barcodeType) {
  console.log(`Creating ${layout}-up layout with ${pageItems.length} items`);
  
  // Create table for grid layout
  const table = body.appendTable();
  table.setBorderWidth(1); // Visible border to define boxes
  
  // Configure table based on layout - PRINT FRIENDLY GRID
  let rows, cols, cellWidth, cellHeight;
  if (layout === 1) {
    rows = 1; cols = 1;
    cellWidth = 520; // Leave margins
    cellHeight = 680; // Full page height minus headers/footers
  } else if (layout === 2 || layout === '2-int') {
    rows = 1; cols = 2;
    cellWidth = 255; // Half width with gap
    cellHeight = 680;
  } else if (layout === 3) {
    rows = 3; cols = 1; // 3 ROWS vertically stacked
    cellWidth = 520; // Full width
    cellHeight = 170; // Reduced further to ensure 3 fit on page properly
  } else if (layout === 4) {
    rows = 2; cols = 2;
    cellWidth = 255; // Quarter page
    cellHeight = 330; // Half page height
  } else if (layout === 8) {
    rows = 2; cols = 4;
    cellWidth = 125; // Eighth page
    cellHeight = 330;
  } else {
    rows = 1; cols = layout;
    cellWidth = 520 / layout;
    cellHeight = 680;
  }
  
  // Create table structure with fixed dimensions
  for (let row = 0; row < rows; row++) {
    const tableRow = table.appendTableRow();
    // Set fixed row height for stability
    try {
      tableRow.setMinimumHeight(cellHeight);
    } catch (e) {
      console.log('setMinimumHeight not supported:', e);
    }
    
    for (let col = 0; col < cols; col++) {
      const cell = tableRow.appendTableCell();
      
      // Fixed cell dimensions - prevents shifting
      cell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
      // Reduced padding for 3-up to fit more content
      const cellPadding = layout === 3 ? 2 : 4;  // Less padding for 3-up
      cell.setPaddingTop(cellPadding);
      cell.setPaddingBottom(cellPadding);
      cell.setPaddingLeft(cellPadding);
      cell.setPaddingRight(cellPadding);
      
      // Set fixed cell width to prevent overflow
      try {
        cell.setWidth(cellWidth);
      } catch (e) {
        console.log('setWidth not supported:', e);
      }
      
      const index = row * cols + col;
      if (index < pageItems.length) {
        const itemIndex = pageItems[index].index || 0;
        const itemBarcodeType = itemBarcodeTypes && itemBarcodeTypes[itemIndex] !== undefined ? itemBarcodeTypes[itemIndex] : barcodeType;
        createProductCard(cell, pageItems[index].item, layout, cellWidth, cellHeight, itemBarcodeType);
      } else {
        // Empty cell - add placeholder to maintain structure
        cell.appendParagraph('').setSpacingAfter(1);
      }
    }
  }
  
  // Set column widths AFTER cells exist (prevents overflow)
  try {
    if (layout === 1) {
      table.setColumnWidth(0, cellWidth);
    } else if (layout === 2 || layout === '2-int') {
      table.setColumnWidth(0, cellWidth);
      table.setColumnWidth(1, cellWidth);
    } else if (layout === 3) {
      table.setColumnWidth(0, cellWidth); // Single column for 3 rows
    } else if (layout === 4) {
      table.setColumnWidth(0, cellWidth);
      table.setColumnWidth(1, cellWidth);
    } else if (layout === 8) {
      for (let i = 0; i < 4; i++) {
        table.setColumnWidth(i, cellWidth);
      }
    }
  } catch (e) {
    console.log('setColumnWidth not supported or failed:', e);
  }
}

// Create 2-int layout (2 items per page with internal images)
function create2IntLayout(body, pageItems, itemBarcodeTypes, barcodeType) {
  console.log('Creating 2-int layout with', pageItems.length, 'items');
  
  // Create table for 2-column layout
  const table = body.appendTable();
  table.setBorderWidth(0);
  
  // Build the structure first (rows and cells must exist before setting column widths)
  const row = table.appendTableRow();
  const cell0 = row.appendTableCell();
  const cell1 = row.appendTableCell();
  
  // NOW it's safe to set column widths
  // (Docs only knows a column exists after at least one row/cell is added)
  try {
    table.setColumnWidth(0, 300);
    table.setColumnWidth(1, 300);
  } catch (e) {
    // Some domains don't support setColumnWidth; fail soft
    console.log('setColumnWidth not supported or failed:', e);
  }
  
  // Configure cells and add content
  // REDUCED LEFT PADDING FOR 2-INT (6 -> 3) so text fits better
  [cell0, cell1].forEach((cell, i) => {
    cell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
    cell.setPaddingTop(6);
    cell.setPaddingBottom(6);
    cell.setPaddingLeft(3);  // REDUCED from 6 to 3 for better text fit
    cell.setPaddingRight(6);
    
    if (i < pageItems.length) {
      const itemIndex = pageItems[i].index || i;
      const itemBarcodeType = itemBarcodeTypes && itemBarcodeTypes[itemIndex] !== undefined ? itemBarcodeTypes[itemIndex] : barcodeType;
      createProductCardWithInternal(cell, pageItems[i].item, '2-int', itemBarcodeType);
    }
  });
}

// Create product card with internal images (for 2-int layout)
// Matches HTML version: vertical layout with image at top, internal images above barcode
function createProductCardWithInternal(cell, item, layout, itemBarcodeType) {
  console.log(`Creating 2-int product card for:`, item.title);
  
  // Image at top - 75% OF ORIGINAL SIZE (175x263 -> 131x197)
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = cell.appendImage(imageBlob);
      image.setWidth(131);  // 75% of 175
      image.setHeight(197); // 75% of 263
      cell.appendParagraph('').setSpacingAfter(3); // Gap after image
    } catch (error) {
      console.log('Could not load image:', error);
      cell.appendParagraph('Image not available');
    }
  }
  
  // Title (16px, bold)
  const titleParagraph = cell.appendParagraph(item.title || '');
  const titleText = titleParagraph.editAsText();
  if (titleText) {
    titleText.setFontSize(16).setBold(true).setFontFamily('Calibri');
  }
  titleParagraph.setSpacingAfter(4);
  
  // Subtitle (12px, italic)
  if (item.subtitle) {
    const subtitleParagraph = cell.appendParagraph(item.subtitle);
    const subtitleText = subtitleParagraph.editAsText();
    if (subtitleText) {
      subtitleText.setFontSize(12).setItalic(true).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    subtitleParagraph.setSpacingAfter(4);
  }
  
  // Author (12px)
  if (item.author) {
    const authorParagraph = cell.appendParagraph(item.author);
    const authorText = authorParagraph.editAsText();
    if (authorText) {
      authorText.setFontSize(12).setForegroundColor('#444444').setFontFamily('Calibri');
    }
    authorParagraph.setSpacingAfter(4);
  }
  
  // Description (11px, truncated to ~1000 chars like HTML)
  if (item.description) {
    const maxLength = 1000;
    const description = item.description.length > maxLength ? 
      item.description.substring(0, 997) + '...' : 
      item.description;
    
    const descParagraph = cell.appendParagraph(description);
    const descText = descParagraph.editAsText();
    if (descText) {
      descText.setFontSize(11).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    descParagraph.setSpacingAfter(4);
  }
  
  // Product Specs (binding, pages, dimensions) - flexbox-like display
  const specs = [];
  if (item.binding) specs.push(item.binding);
  if (item.pages) specs.push(item.pages + ' pages');
  if (item.dimensions) specs.push(item.dimensions);
  
  if (specs.length > 0) {
    const specsParagraph = cell.appendParagraph(specs.join(' • '));
    const specsText = specsParagraph.editAsText();
    if (specsText) {
      specsText.setFontSize(12).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    specsParagraph.setSpacingAfter(4);
  }
  
  // Product Meta (imprint, release date, discount, illustrations)
  const metaItems = [];
  if (item.imprint) metaItems.push('Publisher: ' + item.imprint);
  if (item.releaseDate) metaItems.push('Release Date: ' + item.releaseDate);
  if (item.imidis) metaItems.push('Discount: ' + item.imidis);
  if (item.illustrations) metaItems.push('Illustrations: ' + item.illustrations);
  
  if (metaItems.length > 0) {
    metaItems.forEach((meta, index) => {
      const metaParagraph = cell.appendParagraph(meta);
      const metaText = metaParagraph.editAsText();
    if (metaText) {
      metaText.setFontSize(10).setForegroundColor('#666666').setFontFamily('Calibri'); // 12 - 2 = 10
    }
      metaParagraph.setSpacingAfter(1);
    });
    cell.appendParagraph('').setSpacingAfter(4); // Gap after meta
  }
  
  // Price (14px, bold, pink)
  if (item.price) {
    const priceParagraph = cell.appendParagraph('AUD$ ' + item.price);
    const priceText = priceParagraph.editAsText();
    if (priceText) {
      priceText.setFontSize(14).setBold(true).setForegroundColor('#d63384').setFontFamily('Calibri');
    }
    priceParagraph.setSpacingAfter(4);
  }
  
  // Internal Images (up to 2 images side by side) - positioned above barcode
  if (item.additionalImages && item.additionalImages.length > 0) {
    const internalImagesTable = cell.appendTable();
    internalImagesTable.setBorderWidth(0);
    const internalRow = internalImagesTable.appendTableRow();
    
    // Add up to 2 internal images side by side (60x80, gap 8px)
    const imagesToShow = item.additionalImages.slice(0, 2);
    imagesToShow.forEach((imageUrl) => {
      const internalCell = internalRow.appendTableCell();
      internalCell.setVerticalAlignment(DocumentApp.VerticalAlignment.MIDDLE);
      internalCell.setPaddingTop(2);
      internalCell.setPaddingBottom(2);
      internalCell.setPaddingLeft(4); // Left/right padding creates gap
      internalCell.setPaddingRight(4);
      
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
    
    cell.appendParagraph('').setSpacingAfter(4); // Gap after internal images
  }
  
  // Barcode at bottom - USE IMAGE URL FROM SERVER
  if (item.barcodeImageUrl && itemBarcodeType && itemBarcodeType !== 'None') {
    try {
      const base64Data = item.barcodeImageUrl.split(',')[1] || item.barcodeImageUrl;
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png');
      const barcodeImage = cell.appendImage(blob);
      if (itemBarcodeType === 'QR Code') {
        barcodeImage.setWidth(60);
        barcodeImage.setHeight(60);
      } else {
        barcodeImage.setWidth(120);
        barcodeImage.setHeight(30);
      }
      barcodeImage.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    } catch (error) {
      console.log('Could not insert barcode image:', error);
      if (item.barcodeCode) {
        const barcodeParagraph = cell.appendParagraph(item.barcodeCode);
        const barcodeText = barcodeParagraph.editAsText();
        if (barcodeText) {
          barcodeText.setFontSize(10).setForegroundColor('#666666').setFontFamily('Calibri');
        }
        barcodeParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
  } else if (item.barcode) {
    // Legacy fallback
    const barcodeParagraph = cell.appendParagraph(item.barcode);
    const barcodeText = barcodeParagraph.editAsText();
    if (barcodeText) {
      barcodeText.setFontSize(10).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    barcodeParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }
}

// Create product card for multi-item layouts
// PRINT-OPTIMIZED: Fixed dimensions, confined content, prevents overflow
function createProductCard(cell, item, layout, cellWidth, cellHeight, itemBarcodeType) {
  console.log(`Creating product card for layout ${layout}:`, item.title);
  
  // 3-up uses special horizontal layout - handle separately
  if (layout === 3) {
    createProductCard3Up(cell, item, cellWidth, cellHeight, itemBarcodeType);
    return;
  }
  
  // Available space for content (cell width minus padding)
  const contentWidth = cellWidth - 8; // Minus left/right padding
  const maxContentHeight = cellHeight - 8; // Minus top/bottom padding
  
  // Image sizes - SCALED TO FIT IN CONFINED BOX
  // Scale images to fit within cell width, maintaining aspect ratio
  let imageWidth, imageHeight;
  if (layout === 2 || layout === '2-int') {
    imageWidth = Math.min(175, contentWidth * 0.7); // Max 70% of cell width
    imageHeight = imageWidth * 1.5; // Maintain book aspect ratio
  } else if (layout === 4) {
    imageWidth = Math.min(88, contentWidth * 0.35);
    imageHeight = imageWidth * 1.5;
  } else if (layout === 8) {
    imageWidth = Math.min(40, contentWidth * 0.32);
    imageHeight = imageWidth * 1.5;
  } else {
    imageWidth = Math.min(contentWidth * 0.6, 200);
    imageHeight = imageWidth * 1.5;
  }
  
  // Font sizes - SCALED FOR PRINT AND CONFINED BOXES
  // Smaller fonts for smaller boxes to prevent overflow
  const titleSizes = { 2: 14, 4: 10, 8: 8 };      // Reduced for stability
  const subtitleSizes = { 2: 11, 4: 9, 8: 7 };    // Scaled down
  const authorSizes = { 2: 11, 4: 9, 8: 7 };      // Scaled down
  const descSizes = { 2: 10, 4: 9, 8: 6 };        // Scaled down
  const priceSizes = { 2: 12, 4: 9, 8: 7 };       // Scaled down
  const skuSizes = { 2: 10, 4: 7, 8: 6 };
  
  // Add image - SCALED TO FIT
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = cell.appendImage(imageBlob);
      // Use calculated dimensions that fit in the box
      image.setWidth(imageWidth);
      image.setHeight(imageHeight);
      cell.appendParagraph('').setSpacingAfter(2); // Small gap after image
    } catch (error) {
      console.log('Could not load image:', error);
      cell.appendParagraph('Image not available').setFontSize(8);
    }
  }
  
  // Title - TRUNCATED IF TOO LONG FOR BOX
  const titleFontSize = titleSizes[layout] || 11;
  const maxTitleLength = Math.floor(contentWidth / (titleFontSize * 0.6)); // Chars that fit in width
  const truncatedTitle = (item.title || '').length > maxTitleLength 
    ? (item.title || '').substring(0, maxTitleLength - 3) + '...'
    : (item.title || '');
  
  const titleParagraph = cell.appendParagraph(truncatedTitle);
  const titleText = titleParagraph.editAsText();
  if (titleText) {
    titleText.setFontSize(titleFontSize).setBold(true).setFontFamily('Calibri');
  }
  titleParagraph.setSpacingAfter(2);
  
  // Subtitle - TRUNCATED IF TOO LONG
  if (item.subtitle) {
    const subtitleFontSize = subtitleSizes[layout] || 9;
    const maxSubtitleLength = Math.floor(contentWidth / (subtitleFontSize * 0.6));
    const truncatedSubtitle = item.subtitle.length > maxSubtitleLength
      ? item.subtitle.substring(0, maxSubtitleLength - 3) + '...'
      : item.subtitle;
    
    const subtitleParagraph = cell.appendParagraph(truncatedSubtitle);
    const subtitleText = subtitleParagraph.editAsText();
    if (subtitleText) {
      subtitleText.setFontSize(subtitleFontSize).setItalic(true).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    cell.appendParagraph('').setSpacingAfter(1); // Small gap
  }
  
  // Author - TRUNCATED IF TOO LONG
  if (item.author) {
    const authorFontSize = authorSizes[layout] || 10;
    const maxAuthorLength = Math.floor(contentWidth / (authorFontSize * 0.6));
    const truncatedAuthor = item.author.length > maxAuthorLength
      ? item.author.substring(0, maxAuthorLength - 3) + '...'
      : item.author;
    
    const authorParagraph = cell.appendParagraph(truncatedAuthor);
    const authorText = authorParagraph.editAsText();
    if (authorText) {
      authorText.setFontSize(authorFontSize).setForegroundColor('#000000').setFontFamily('Calibri');
    }
    cell.appendParagraph('').setSpacingAfter(2); // Small gap
  }
  
  // Description - AGGRESSIVE TRUNCATION FOR PRINT STABILITY
  // Much shorter limits to ensure content fits in confined boxes
  if (item.description) {
    // Strip HTML tags
    const plainDescription = item.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    
    // Calculate max chars based on available space and font size
    // Rough estimate: 1 char per point at small fonts, less at larger
    const descFontSize = descSizes[layout] || 8;
    const charsPerLine = Math.floor(contentWidth / (descFontSize * 0.6)); // Approximate chars per line
    const maxLines = Math.floor((maxContentHeight - imageHeight - 100) / (descFontSize * 1.2)); // Available lines
    const maxLength = Math.floor(charsPerLine * maxLines * 0.9); // 90% to be safe
    
    let truncatedDesc;
    if (layout === 2 || layout === '2-int') {
      truncatedDesc = plainDescription.length > 600 ? plainDescription.substring(0, 597) + '...' : plainDescription;
    } else if (layout === 4) {
      truncatedDesc = plainDescription.length > 300 ? plainDescription.substring(0, 297) + '...' : plainDescription;
    } else if (layout === 8) {
      truncatedDesc = plainDescription.length > 80 ? plainDescription.substring(0, 77) + '...' : plainDescription;
    } else {
      truncatedDesc = plainDescription.length > maxLength ? plainDescription.substring(0, maxLength - 3) + '...' : plainDescription;
    }
    
    if (truncatedDesc) {
    const descParagraph = cell.appendParagraph(truncatedDesc);
    const descText = descParagraph.editAsText();
    if (descText) {
      descText.setFontSize(descSizes[layout] || 8).setForegroundColor('#333333').setFontFamily('Calibri');
      }
      descParagraph.setSpacingAfter(2);
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
  
  // SKU/Barcode - USE IMAGE URL FROM SERVER
  if (item.barcodeImageUrl && itemBarcodeType && itemBarcodeType !== 'None') {
    try {
      const base64Data = item.barcodeImageUrl.split(',')[1] || item.barcodeImageUrl;
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png');
      const barcodeImage = cell.appendImage(blob);
      if (itemBarcodeType === 'QR Code') {
        barcodeImage.setWidth(40);
        barcodeImage.setHeight(40);
      } else {
        barcodeImage.setWidth(80);
        barcodeImage.setHeight(20);
      }
      barcodeImage.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    } catch (error) {
      console.log('Could not insert barcode image:', error);
      if (item.barcodeCode || item.barcode) {
        const barcodeText = item.barcodeCode || item.barcode;
        const skuParagraph = cell.appendParagraph(barcodeText);
        const skuText = skuParagraph.editAsText();
        if (skuText) {
          skuText.setFontSize(skuSizes[layout] || 7).setForegroundColor('#999999').setFontFamily('Calibri');
        }
        skuParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
  } else if (item.barcode) {
    // Legacy fallback
    const skuParagraph = cell.appendParagraph(item.barcode);
    const skuText = skuParagraph.editAsText();
    if (skuText) {
      skuText.setFontSize(skuSizes[layout] || 7).setForegroundColor('#999999').setFontFamily('Calibri');
    }
    skuParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }
}

// Create 3-up product card - special horizontal 3-column layout (image | content | details)
// PRINT-OPTIMIZED: Fixed dimensions, confined boxes, prevents overflow
function createProductCard3Up(cell, item, cellWidth, cellHeight, itemBarcodeType) {
  console.log('Creating 3-up special layout for:', item.title);
  
  // Create horizontal table with 3 columns - CONFINED BOXES
  const table = cell.appendTable();
  table.setBorderWidth(1); // Visible border to define boxes
  
  // Create row and 3 cells
  const row = table.appendTableRow();
  
  // Set fixed row height to confine content
  try {
    row.setMinimumHeight(cellHeight - 8); // Match cell height minus padding
  } catch (e) {
    console.log('setMinimumHeight not supported:', e);
  }
  
  const imageCell = row.appendTableCell();
  const contentCell = row.appendTableCell();
  const detailsCell = row.appendTableCell();
  
  // Calculate column widths - FIXED PROPORTIONS
  const totalWidth = cellWidth - 8; // Minus padding
  const imageWidth = totalWidth * 0.25;  // 25% for image (confinement)
  const detailsWidth = totalWidth * 0.15; // 15% for details (confinement)
  const contentWidth = totalWidth * 0.60; // 60% for content (main area)
  
  // Set column widths - FIXED FOR STABILITY
  try {
    table.setColumnWidth(0, imageWidth);
    table.setColumnWidth(1, contentWidth);
    table.setColumnWidth(2, detailsWidth);
  } catch (e) {
    console.log('setColumnWidth not supported or failed:', e);
  }
  
  // Configure cells - MINIMAL PADDING FOR CONFINED BOXES
  imageCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  imageCell.setPaddingTop(3);
  imageCell.setPaddingBottom(3);
  imageCell.setPaddingLeft(3);
  imageCell.setPaddingRight(3);
  
  // Set fixed width to prevent overflow
  try {
    imageCell.setWidth(imageWidth);
  } catch (e) {
    console.log('setWidth not supported:', e);
  }
  
  contentCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  contentCell.setPaddingTop(3);
  contentCell.setPaddingBottom(3);
  contentCell.setPaddingLeft(3);
  contentCell.setPaddingRight(3);
  
  try {
    contentCell.setWidth(contentWidth);
  } catch (e) {
    console.log('setWidth not supported:', e);
  }
  
  detailsCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
  detailsCell.setPaddingTop(3);
  detailsCell.setPaddingBottom(3);
  detailsCell.setPaddingLeft(3);
  detailsCell.setPaddingRight(3);
  
  try {
    detailsCell.setWidth(detailsWidth);
  } catch (e) {
    console.log('setWidth not supported:', e);
  }
  
  // Column 1: Image - SCALED TO FIT IN CONFINED BOX
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = imageCell.appendImage(imageBlob);
      // Scale to fit - max width is 95% of cell width
      const maxImageWidth = imageWidth * 0.95;
      const imageAspectRatio = 228 / 172; // Original aspect ratio
      image.setWidth(maxImageWidth);
      image.setHeight(maxImageWidth * imageAspectRatio);
    } catch (error) {
      console.log('Could not load image:', error);
      imageCell.appendParagraph('Img N/A').setFontSize(7);
    }
  }
  
  // Column 2: Content (title, subtitle, author, description)
  // Title (14px)
  const titleParagraph = contentCell.appendParagraph(item.title || '');
  const titleText = titleParagraph.editAsText();
  if (titleText) {
    titleText.setFontSize(14).setBold(true).setFontFamily('Calibri');
  }
  titleParagraph.setSpacingAfter(2);
  
  // Subtitle (11px)
  if (item.subtitle) {
    const subtitleParagraph = contentCell.appendParagraph(item.subtitle);
    const subtitleText = subtitleParagraph.editAsText();
    if (subtitleText) {
      subtitleText.setFontSize(11).setItalic(true).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    subtitleParagraph.setSpacingAfter(2);
  }
  
  // Author (11px)
  if (item.author) {
    const authorParagraph = contentCell.appendParagraph(item.author);
    const authorText = authorParagraph.editAsText();
    if (authorText) {
      authorText.setFontSize(11).setForegroundColor('#444444').setFontFamily('Calibri');
    }
    authorParagraph.setSpacingAfter(2);
  }
  
  // Description - AGGRESSIVELY TRUNCATED FOR CONFINED BOX
  // Calculate based on available space in content cell
  if (item.description) {
    const plainDescription = item.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    
    // Calculate max chars: contentWidth - padding, font size 9pt
    const descFontSize = 9;
    const charsPerLine = Math.floor((contentWidth - 6) / (descFontSize * 0.6));
    const availableHeight = cellHeight - 100; // Reserve space for title/subtitle/author
    const maxLines = Math.floor(availableHeight / (descFontSize * 1.3));
    const maxLength = Math.floor(charsPerLine * maxLines * 0.85); // 85% safety margin
    
    // More aggressive truncation - max 250 chars for 3-up (reduced from 400)
    const truncatedDesc = plainDescription.length > Math.min(250, maxLength) 
      ? plainDescription.substring(0, Math.min(247, maxLength - 3)) + '...' 
      : plainDescription;
    
    if (truncatedDesc) {
      const descParagraph = contentCell.appendParagraph(truncatedDesc);
      const descText = descParagraph.editAsText();
      if (descText) {
        descText.setFontSize(descFontSize).setForegroundColor('#333333').setFontFamily('Calibri');
      }
      descParagraph.setSpacingAfter(2);
    }
  }
  
  // Column 3: Details (meta information and barcode)
  // Details as list items (10px font)
  if (item.imprint) {
    const detailParagraph = detailsCell.appendParagraph(item.imprint);
    const detailText = detailParagraph.editAsText();
    if (detailText) {
      detailText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    detailParagraph.setSpacingAfter(1);
  }
  
  if (item.imidis) {
    const detailParagraph = detailsCell.appendParagraph('Discount: ' + item.imidis);
    const detailText = detailParagraph.editAsText();
    if (detailText) {
      detailText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    detailParagraph.setSpacingAfter(1);
  }
  
  if (item.binding) {
    const detailParagraph = detailsCell.appendParagraph(item.binding);
    const detailText = detailParagraph.editAsText();
    if (detailText) {
      detailText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    detailParagraph.setSpacingAfter(1);
  }
  
  if (item.pages) {
    const detailParagraph = detailsCell.appendParagraph(item.pages + ' Pages');
    const detailText = detailParagraph.editAsText();
    if (detailText) {
      detailText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    detailParagraph.setSpacingAfter(1);
  }
  
  if (item.dimensions) {
    const detailParagraph = detailsCell.appendParagraph(item.dimensions);
    const detailText = detailParagraph.editAsText();
    if (detailText) {
      detailText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    detailParagraph.setSpacingAfter(1);
  }
  
  if (item.releaseDate) {
    const detailParagraph = detailsCell.appendParagraph(item.releaseDate);
    const detailText = detailParagraph.editAsText();
    if (detailText) {
      detailText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    detailParagraph.setSpacingAfter(1);
  }
  
  if (item.sku) {
    const detailParagraph = detailsCell.appendParagraph('ISBN: ' + item.sku);
    const detailText = detailParagraph.editAsText();
    if (detailText) {
      detailText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    detailParagraph.setSpacingAfter(1);
  }
  
  if (item.price) {
    const detailParagraph = detailsCell.appendParagraph('AUD$ ' + item.price);
    const detailText = detailParagraph.editAsText();
    if (detailText) {
      detailText.setFontSize(10).setForegroundColor('#333333').setFontFamily('Calibri');
    }
    detailParagraph.setSpacingAfter(4);
  }
  
  // Barcode - USE IMAGE URL FROM SERVER
  if (item.barcodeImageUrl && itemBarcodeType && itemBarcodeType !== 'None') {
    try {
      const base64Data = item.barcodeImageUrl.split(',')[1] || item.barcodeImageUrl;
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png');
      const barcodeImage = detailsCell.appendImage(blob);
      if (itemBarcodeType === 'QR Code') {
        barcodeImage.setWidth(40);
        barcodeImage.setHeight(40);
      } else {
        barcodeImage.setWidth(80);
        barcodeImage.setHeight(20);
      }
      barcodeImage.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    } catch (error) {
      console.log('Could not insert barcode image:', error);
      if (item.barcodeCode || item.barcode) {
        const barcodeText = item.barcodeCode || item.barcode;
        const barcodeParagraph = detailsCell.appendParagraph(barcodeText);
        const barcodeTextObj = barcodeParagraph.editAsText();
        if (barcodeTextObj) {
          barcodeTextObj.setFontSize(8).setForegroundColor('#666666').setFontFamily('Calibri');
        }
        barcodeParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
  } else if (item.barcode) {
    // Legacy fallback
    const barcodeParagraph = detailsCell.appendParagraph(item.barcode);
    const barcodeText = barcodeParagraph.editAsText();
    if (barcodeText) {
      barcodeText.setFontSize(8).setForegroundColor('#666666').setFontFamily('Calibri');
    }
    barcodeParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
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
    
    // Set cell properties first
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
      logoCell.appendParagraph('[Logo]');
    }
    
    // Set text cell properties
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
    
    // Try to set alignment (not supported in all Google Apps Script domains)
    try {
      imagesTable.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    } catch (e) {
      // setAlignment not supported; fail soft
      console.log('setAlignment not supported or failed:', e);
    }
    
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
        
        // Set cell properties first (before adding content)
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
