/**
 * Google Apps Script for Mixed Layout Catalogue Creator
 * Generates Google Docs with mixed layouts (different layouts per page)
 */

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
      utmParams = {}
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
      
      // If layout changes or page is full, start new page
      if (assignedLayout !== currentLayout || itemsInPage >= currentLayout) {
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
