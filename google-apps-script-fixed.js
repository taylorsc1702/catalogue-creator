/**
 * Google Apps Script for Catalogue Creator - FIXED VERSION
 * Generates Google Docs with exact formatting to match HTML export
 */

// Safe paragraph styling helper
function styleParagraph(p, fn) {
  if (p.getNumChildren() === 0) p.appendText('');
  const t = p.editAsText();
  if (t) fn(t);
}

// Main function to create catalogue document
function createCatalogueDocument(data) {
  try {
    console.log('Creating catalogue document');
    console.log('Data received:', data ? 'Yes' : 'No');
    
    if (!data) {
      throw new Error('No data received');
    }
    
    console.log('Items count:', data.items ? data.items.length : 0);
    
    // Extract parameters
    const {
      items,
      layout = 4,
      layoutAssignments = null, // For mixed layouts
      title = "Product Catalogue",
      showFields = {},
      bannerColor = '#F7981D',
      websiteName = 'www.woodslane.com.au',
      utmParams = {}
    } = data;
    
    // Validate and clean items data
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        // Ensure required fields exist with defaults
        if (!item.title) item.title = `Item ${index + 1}`;
        if (!item.author) item.author = 'Unknown Author';
        if (!item.description) item.description = 'No description available';
        if (!item.price) item.price = '0.00';
        if (!item.sku) item.sku = `SKU${index + 1}`;
        if (!item.additionalImages) item.additionalImages = [];
        if (!item.authorBio) item.authorBio = '';
        
        console.log(`Item ${index + 1}:`, {
          title: item.title,
          hasImage: !!item.imageUrl,
          hasAuthorBio: !!item.authorBio,
          internalsCount: item.additionalImages ? item.additionalImages.length : 0
        });
      });
    }
    
    if (!items || items.length === 0) {
      throw new Error('No items provided');
    }
    
    // Create new document
    const doc = DocumentApp.create(title + ' - ' + new Date().toISOString().split('T')[0]);
    const body = doc.getBody();
    
    // Clear default content
    body.clear();
    
    // NOTE: Removed margin settings as they're not available in DocumentApp
    
    // Check if this is a mixed layout
    const isMixedLayout = layoutAssignments && layoutAssignments.length === items.length;
    
    if (isMixedLayout) {
      // Mixed layout: group items by their layout and handle each group
      let currentIndex = 0;
      
      while (currentIndex < items.length) {
        if (currentIndex > 0) {
          body.appendPageBreak();
        }
        
        const currentLayout = layoutAssignments[currentIndex];
        const itemsForThisPage = [];
        
        // Collect items with the same layout for this page
        for (let i = 0; i < currentLayout && currentIndex < items.length; i++) {
          itemsForThisPage.push(items[currentIndex]);
          currentIndex++;
        }
        
        createPage(body, itemsForThisPage, currentLayout, showFields, bannerColor, websiteName, utmParams);
      }
    } else {
      // Regular layout: fixed items per page
      const perPage = layout;
      const pages = [];
      
      for (let i = 0; i < items.length; i += perPage) {
        pages.push(items.slice(i, i + perPage));
      }
      
      // Generate each page (banners handled inside createPage)
      pages.forEach((page, pageIndex) => {
        if (pageIndex > 0) {
          // Add page break for subsequent pages
          body.appendPageBreak();
        }
        
        createPage(body, page, layout, showFields, bannerColor, websiteName, utmParams);
      });
    }
    
    console.log('Document created successfully:', doc.getUrl());
    
    return {
      success: true,
      documentId: doc.getId(),
      documentUrl: doc.getUrl(),
      documentName: doc.getName()
    };
    
  } catch (error) {
    console.error('Error creating document:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Create a single page with products
function createPage(body, pageItems, layout, showFields, bannerColor, websiteName, utmParams) {
  // Add header banner
  addBanner(body, websiteName, bannerColor, true);
  
  // Add content based on layout
  if (layout === 1) {
    create1UpLayout(body, pageItems[0], showFields, bannerColor, websiteName, utmParams);
  } else {
    createMultiItemLayout(body, pageItems, layout);
  }
  
  // Add footer banner
  addBanner(body, websiteName, bannerColor, false);
}

// Banner function - simple paragraph with background
function addBanner(body, websiteName, bannerColor, isHeader) {
  const bannerText = body.appendParagraph(websiteName);
  bannerText.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  // Style the text
  styleParagraph(bannerText, t => {
    t.setFontSize(12).setBold(true).setForegroundColor('#FFFFFF').setBackgroundColor(bannerColor);
  });
  
  // Set spacing
  if (isHeader) {
    bannerText.setSpacingAfter(20);
  } else {
    bannerText.setSpacingBefore(20);
  }
}

// Create 1-up layout (two-column design) - ENHANCED with text boxes and grid structure
function create1UpLayout(body, item, showFields, bannerColor, websiteName, utmParams) {
  if (!item) {
    console.warn('No item provided to create1UpLayout');
    return;
  }
  
  try {
  
  // Page breaks are handled in the outer loop, no need to add them here
  
  // Create a simple two-column table without headers
  const table = body.appendTable([['', '']]);
  table.setBorderWidth(0); // Remove borders for cleaner look
  
  // Work with the single row
  const row = table.getRow(0);
  const leftCell = row.getCell(0);
  const rightCell = row.getCell(1);
  
  // Note: setWidth() is not available for table cells in DocumentApp
  // Cell widths will be determined by content
  
  // Set cell padding and alignment
  leftCell.setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(10).setPaddingRight(10);
  rightCell.setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(10).setPaddingRight(10);
  
  // Left column: Image, Author Bio, Internals (in structured sections)
  createStructuredLeftColumn(leftCell, item, showFields);
  
  // Right column: Product details (in structured sections)
  createStructuredRightColumn(rightCell, item, utmParams);
  
  } catch (error) {
    console.error('Error in create1UpLayout:', error.toString());
    // Fallback: create a simple layout
    const fallbackText = body.appendParagraph(`Error creating layout for: ${item.title || 'Unknown item'}`);
    styleParagraph(fallbackText, t => t.setFontSize(12).setForegroundColor('#FF0000'));
  }
}

// Utility: truncate at word boundary
function truncateAtWord(str, maxChars) {
  if (!str || str.length <= maxChars) return str || '';
  const sliced = str.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim() + '…';
}

// Create structured left column with defined sections
function createStructuredLeftColumn(cell, item, showFields) {
  if (!item) {
    console.warn('No item provided to createStructuredLeftColumn');
    return;
  }
  
  try {
    // ----- Section 1: Product Image (unchanged) -----
    if (item.imageUrl) {
      const imageSection = cell.appendTable([['']]);
      imageSection.setBorderWidth(1);
      imageSection.setBorderColor('#e0e0e0');
      const imageCell = imageSection.getRow(0).getCell(0);
      imageCell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
      imageCell.setBackgroundColor('#FFFFFF');

      try {
        const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
        const image = imageCell.appendImage(imageBlob);
        image.setWidth(120);
        image.setHeight(160);
      } catch (e) {
        console.warn('Could not load image:', item.imageUrl);
      }

      cell.appendParagraph('').setSpacingAfter(5); // Reduced for footer space
    }

  // ----- Section 2: Author Bio (truncate to keep Internals on same page) -----
  const hasInternals = item.additionalImages && item.additionalImages.length > 0;

  if (showFields.authorBio && item.authorBio) {
    const bioSection = cell.appendTable([['']]);
    bioSection.setBorderWidth(1);
    bioSection.setBorderColor('#e0e0e0');

    const bioContent = bioSection.getRow(0).getCell(0);
    bioContent.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
    bioContent.setBackgroundColor('#FFFFFF');

    const bioHeading = bioContent.appendParagraph('Author Bio:');
    styleParagraph(bioHeading, t => t.setBold(true).setFontSize(11).setForegroundColor('#1565C0'));
    bioHeading.setSpacingAfter(5);

    // Heuristic: max characters allowed so Internals (heading + 2x2 grid) fits below
    // Tweak these numbers to taste.
    const BASE_MAX = 900;                 // roomy bio with no internals
    const RESERVE_FOR_INTERNALS = 360;    // room to keep Internals on same page
    const maxBioChars = hasInternals ? Math.max(140, BASE_MAX - RESERVE_FOR_INTERNALS) : BASE_MAX;

    let bioText = htmlToPlainText(item.authorBio);
    bioText = truncateAtWord(bioText, maxBioChars);

    const bioParagraph = bioContent.appendParagraph(bioText);
    styleParagraph(bioParagraph, t => t.setFontSize(9).setForegroundColor('#000000'));
    bioParagraph.setLineSpacing(1.0); // tighter so the box is compact

    // Minimal spacer before Internals
    const bioAnchor = cell.appendParagraph('');
    bioAnchor.setSpacingAfter(5); // Reduced for footer space
    // Note: setKeepWithNext and setKeepLinesTogether are not available in DocumentApp
  }

  // ----- Section 3: Internals (2 images side by side) -----
  if (hasInternals) {
    // Compact heading
    const internalsHeading = cell.appendParagraph('Internals:');
    styleParagraph(internalsHeading, t => t.setBold(true).setFontSize(10).setForegroundColor('#495057'));
    internalsHeading.setSpacingAfter(3);
    
    // Create a simple 1x2 horizontal table for 2 images
    const internalsTable = cell.appendTable([['', '']]); // Single row, 2 columns
    internalsTable.setBorderWidth(1);
    internalsTable.setBorderColor('#e0e0e0');
    
    // Style both cells with minimal padding
    for (let c = 0; c < 2; c++) {
      const gridCell = internalsTable.getRow(0).getCell(c);
      gridCell.setBackgroundColor('#FFFFFF');
      gridCell.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(3).setPaddingRight(3);
    }
    
    // Add up to 2 images side by side (larger images)
    const imagesToShow = item.additionalImages.slice(0, 2);
    imagesToShow.forEach((imageUrl, idx) => {
      try {
        const gridCell = internalsTable.getRow(0).getCell(idx);
        
        const blob = UrlFetchApp.fetch(imageUrl).getBlob();
        const img = gridCell.appendImage(blob);
        img.setWidth(60); // Larger images since we only have 2
        img.setHeight(85); // Larger images since we only have 2
      } catch (e) {
        console.warn('Could not load internal image:', imageUrl);
      }
    });
    
    // Small spacer after internals
    const spacer = cell.appendParagraph('');
    spacer.setSpacingBefore(0).setSpacingAfter(3);
  }
  
  } catch (error) {
    console.error('Error in createStructuredLeftColumn:', error.toString());
    // Fallback: create a simple text
    const fallbackText = cell.appendParagraph(`Error in left column: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(10).setForegroundColor('#FF0000'));
  }
}

// Legacy function for backward compatibility
function createLeftColumn(cell, item, showFields) {
  // Product image
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = cell.appendImage(imageBlob);
      image.setWidth(120); // Much smaller for Google Docs
      image.setHeight(160);
      
      // Add spacing after image
      cell.appendParagraph('').setSpacingAfter(15);
    } catch (error) {
      console.warn('Could not load image:', item.imageUrl);
    }
  }
  
  // Author Bio - truncated if too long
  if (showFields.authorBio && item.authorBio) {
    const bioTitle = cell.appendParagraph('Author Bio:');
    styleParagraph(bioTitle, t => t.setBold(true).setFontSize(11).setForegroundColor('#1565C0'));
    bioTitle.setSpacingAfter(8);
    
    let bioText = htmlToPlainText(item.authorBio);
    // Truncate if too long (limit to ~200 characters)
    if (bioText.length > 200) {
      bioText = bioText.substring(0, 200) + '...';
    }
    
    const bioContent = cell.appendParagraph(bioText);
    styleParagraph(bioContent, t => t.setFontSize(10).setForegroundColor('#000000'));
    bioContent.setSpacingAfter(15);
  }
  
  // Internals (if available) - COMPACT 2x2 grid
  if (item.additionalImages && item.additionalImages.length > 0) {
    const internalsTitle = cell.appendParagraph('Internals:');
    styleParagraph(internalsTitle, t => t.setBold(true).setFontSize(11).setForegroundColor('#495057'));
    internalsTitle.setSpacingAfter(8);
    
    // Create a 2x2 table for internals
    const internalsTable = cell.appendTable([['',''], ['','']]);
    internalsTable.setBorderWidth(0);
    
    // Add up to 4 internal images in the table - much smaller
    const imagesToShow = item.additionalImages.slice(0, 4);
    imagesToShow.forEach((imageUrl, index) => {
      try {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const tableCell = internalsTable.getRow(row).getCell(col);
        
        const imageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
        const image = tableCell.appendImage(imageBlob);
        image.setWidth(50); // Much smaller thumbnails
        image.setHeight(75);
      } catch (error) {
        console.warn('Could not load internal image:', imageUrl);
      }
    });
  }
}

// Create structured right column with defined sections
function createStructuredRightColumn(cell, item, utmParams) {
  if (!item) {
    console.warn('No item provided to createStructuredRightColumn');
    return;
  }
  
  try {
    // Section 1: Title and Basic Info (transparent box)
    const titleSection = cell.appendTable([['']]); // single row
  titleSection.setBorderWidth(1);
  titleSection.setBorderColor('#e0e0e0');
  
  const titleCell = titleSection.getRow(0).getCell(0);
  titleCell.setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(8).setPaddingRight(8);
  titleCell.setBackgroundColor('#FFFFFF'); // Transparent white background
  
  // Product title (smaller text)
  const title = titleCell.appendParagraph(item.title);
  styleParagraph(title, t => t.setFontSize(14).setBold(true).setForegroundColor('#000000'));
  title.setSpacingAfter(3);
  
  // Subtitle
  if (item.subtitle) {
    const subtitle = titleCell.appendParagraph(item.subtitle);
    styleParagraph(subtitle, t => t.setFontSize(10).setItalic(true).setForegroundColor('#666666'));
    subtitle.setSpacingAfter(3);
  }
  
  // Author (fix duplication - don't add "By" if it's already in the metafield)
  if (item.author) {
    let authorText = item.author;
    if (!authorText.toLowerCase().startsWith('by ')) {
      authorText = `By ${authorText}`;
    }
    const author = titleCell.appendParagraph(authorText);
    styleParagraph(author, t => t.setFontSize(9).setForegroundColor('#444444'));
    author.setSpacingAfter(3);
  }
  
  // Description section (scales to fill available space)
  if (item.description) {
    const descSection = cell.appendTable([['']]);
    descSection.setBorderWidth(1);
    descSection.setBorderColor('#e0e0e0');
    
    const descCell = descSection.getRow(0).getCell(0);
    descCell.setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(8).setPaddingRight(8);
    descCell.setBackgroundColor('#FFFFFF');
    
    let descText = item.description;
    const description = descCell.appendParagraph(descText);
    styleParagraph(description, t => t.setFontSize(9).setForegroundColor('#333333'));
    description.setSpacingAfter(0); // No extra spacing
  }
  
  // Section 2: Product Details (heading outside, data in table)
  
  // Add heading outside the table
  const detailsHeading = titleCell.appendParagraph('Product Details:');
  styleParagraph(detailsHeading, t => t.setBold(true).setFontSize(11).setForegroundColor('#000000'));
  detailsHeading.setSpacingAfter(8);
  
  // Prepare data for table
  const metaItems = [];
  if (item.imprint) metaItems.push(['Publisher:', item.imprint]);
  if (item.releaseDate) metaItems.push(['Release Date:', item.releaseDate]);
  if (item.binding) metaItems.push(['Binding:', item.binding]);
  if (item.pages) metaItems.push(['Pages:', `${item.pages} pages`]);
  if (item.dimensions) metaItems.push(['Dimensions:', item.dimensions]);
  if (item.weight) metaItems.push(['Weight:', item.weight]);
  
  // Create table with proper structure
  if (metaItems.length > 0) {
    const detailsTable = titleCell.appendTable(metaItems);
    detailsTable.setBorderWidth(1);
    detailsTable.setBorderColor('#e0e0e0');
    
    // Style all cells
    for (let i = 0; i < detailsTable.getNumRows(); i++) {
      const row = detailsTable.getRow(i);
      const labelCell = row.getCell(0);
      const valueCell = row.getCell(1);
      
      // Make cells transparent
      labelCell.setBackgroundColor('#FFFFFF');
      valueCell.setBackgroundColor('#FFFFFF');
      
      // Minimal padding for compact table
      labelCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(6).setPaddingRight(2);
      valueCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(2).setPaddingRight(6);
      
      // STYLE THE EXISTING PARAGRAPHS (no new paragraphs!)
      const labelPara = labelCell.getChild(0).asParagraph();
      const valuePara = valueCell.getChild(0).asParagraph();
      styleParagraph(labelPara, t => t.setBold(true).setFontSize(9).setForegroundColor('#666666'));
      styleParagraph(valuePara, t => t.setFontSize(9).setForegroundColor('#333333'));
      
      // Reduce spacing between rows
      labelPara.setSpacingAfter(0);
      valuePara.setSpacingAfter(0);
    }
  }
  
  // No spacer - price/barcode should be at the bottom
  
  // Section 3: Price and Barcode (fixed position at bottom)
  const priceSection = cell.appendTable([['', '']]); // Two columns: price and barcode
  priceSection.setBorderWidth(1);
  priceSection.setBorderColor('#e0e0e0');
  
  const priceCell = priceSection.getRow(0).getCell(0);
  const barcodeCell = priceSection.getRow(0).getCell(1);
  
  // Minimal padding for compact layout - push to bottom
  priceCell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(6).setPaddingRight(6);
  barcodeCell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(6).setPaddingRight(6);
  
  // Make cells transparent
  priceCell.setBackgroundColor('#FFFFFF');
  barcodeCell.setBackgroundColor('#FFFFFF');
  
  // Price (left side) - smaller font
  if (item.price) {
    const price = priceCell.appendParagraph(`AUD$ ${item.price}`);
    styleParagraph(price, t => t.setFontSize(10).setBold(true).setForegroundColor('#d63384'));
    price.setSpacingAfter(0);
  }
  
  // Barcode (right side) - Show only EAN-13 barcode image
  if (item.sku) {
    // Generate EAN-13 barcode image (no text, just the barcode)
    try {
      const barcodeImage = generateEAN13Barcode(item.sku);
      if (barcodeImage) {
        const image = barcodeCell.appendImage(barcodeImage);
        image.setWidth(100); // Smaller barcode
        image.setHeight(30); // Smaller barcode
      } else {
        // Fallback: show SKU as text if barcode generation fails
        const barcodeText = barcodeCell.appendParagraph(`SKU: ${item.sku}`);
        styleParagraph(barcodeText, t => t.setFontSize(8).setForegroundColor('#999999'));
      }
    } catch (error) {
      console.warn('Could not generate barcode:', error);
      // Fallback: show SKU as text if barcode generation fails
      const barcodeText = barcodeCell.appendParagraph(`SKU: ${item.sku}`);
      styleParagraph(barcodeText, t => t.setFontSize(8).setForegroundColor('#999999'));
    }
  }
  
  } catch (error) {
    console.error('Error in createStructuredRightColumn:', error.toString());
    // Fallback: create a simple text
    const fallbackText = cell.appendParagraph(`Error in right column: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(10).setForegroundColor('#FF0000'));
  }
}

// Legacy function for backward compatibility
function createRightColumn(cell, item, utmParams) {
  // Product title
  const title = cell.appendParagraph(item.title);
  styleParagraph(title, t => t.setFontSize(20).setBold(true).setForegroundColor('#000000'));
  title.setSpacingAfter(10);
  
  // Subtitle
  if (item.subtitle) {
    const subtitle = cell.appendParagraph(item.subtitle);
    styleParagraph(subtitle, t => t.setFontSize(14).setItalic(true).setForegroundColor('#666666'));
    subtitle.setSpacingAfter(10);
  }
  
  // Author
  if (item.author) {
    const author = cell.appendParagraph(`By ${item.author}`);
    styleParagraph(author, t => t.setFontSize(13).setForegroundColor('#444444'));
    author.setSpacingAfter(10);
  }
  
  // Description - truncated if too long
  if (item.description) {
    let descText = item.description;
    // Truncate if too long (limit to ~300 characters)
    if (descText.length > 300) {
      descText = descText.substring(0, 300) + '...';
    }
    const description = cell.appendParagraph(descText);
    styleParagraph(description, t => t.setFontSize(10).setForegroundColor('#333333'));
    description.setSpacingAfter(12);
  }
  
  // Product meta information
  const metaItems = [];
  if (item.imprint) metaItems.push(`Publisher: ${item.imprint}`);
  if (item.releaseDate) metaItems.push(`Release Date: ${item.releaseDate}`);
  if (item.binding) metaItems.push(`Binding: ${item.binding}`);
  if (item.pages) metaItems.push(`Pages: ${item.pages} pages`);
  if (item.dimensions) metaItems.push(`Dimensions: ${item.dimensions}`);
  if (item.weight) metaItems.push(`Weight: ${item.weight}`);
  if (item.illustrations) metaItems.push(`Illustrations: ${item.illustrations}`);
  
  metaItems.forEach(metaItem => {
    const meta = cell.appendParagraph(metaItem);
    styleParagraph(meta, t => t.setFontSize(10).setForegroundColor('#666666'));
    meta.setSpacingAfter(5);
  });
  
  // Price
  if (item.price) {
    const price = cell.appendParagraph(`AUD$ ${item.price}`);
    styleParagraph(price, t => t.setFontSize(16).setBold(true).setForegroundColor('#d63384'));
    price.setSpacingAfter(15);
  }
  
  // Barcode (if SKU available)
  if (item.sku) {
    const barcodeText = cell.appendParagraph(`Barcode: ${item.sku}`);
    styleParagraph(barcodeText, t => t.setFontSize(10).setForegroundColor('#999999'));
    barcodeText.setSpacingAfter(10);
  }
}

// Create multi-item layout - FIXED with proper table creation
function createMultiItemLayout(body, pageItems, layout) {
  let rows, cols;
  switch (layout) {
    case 2: rows = 1; cols = 2; break;
    case 3: rows = 1; cols = 3; break;
    case 4: rows = 2; cols = 2; break;
    case 8: rows = 2; cols = 4; break;
    default: rows = 2; cols = 2;
  }
  
  // Create table with exact structure (no phantom first row)
  const data = Array.from({length: rows}, () => Array.from({length: cols}, () => ''));
  const table = body.appendTable(data);
  table.setBorderWidth(0);

  // NOTE: Removed setColumnWidth calls as they're not available in DocumentApp
  
  for (let r = 0; r < rows; r++) {
    const row = table.getRow(r);
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cell = row.getCell(c);
      if (idx < pageItems.length && pageItems[idx]) {
        createProductCard(cell, pageItems[idx], layout);
      }
    }
  }
}

// Create individual product card
function createProductCard(cell, item, layout) {
  // Image
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = cell.appendImage(imageBlob);
      
      // Set image size based on layout
      const sizes = {
        2: { width: 120, height: 180 },
        3: { width: 100, height: 150 },
        4: { width: 80, height: 120 },
        8: { width: 40, height: 60 }
      };
      
      const size = sizes[layout] || sizes[4];
      image.setWidth(size.width);
      image.setHeight(size.height);
      
      // Add spacing after image
      cell.appendParagraph('').setSpacingAfter(10);
    } catch (error) {
      console.warn('Could not load image:', item.imageUrl);
    }
  }
  
  // Title
  const title = cell.appendParagraph(item.title);
  const titleSizes = { 2: 14, 3: 12, 4: 11, 8: 9 };
  styleParagraph(title, t => t.setFontSize(titleSizes[layout] || 11).setBold(true));
  title.setSpacingAfter(5);
  
  // Subtitle
  if (item.subtitle) {
    const subtitle = cell.appendParagraph(item.subtitle);
    const subtitleSizes = { 2: 11, 3: 10, 4: 9, 8: 7 };
    styleParagraph(subtitle, t => t.setFontSize(subtitleSizes[layout] || 9).setItalic(true).setForegroundColor('#666666'));
    subtitle.setSpacingAfter(5);
  }
  
  // Author
  if (item.author) {
    const author = cell.appendParagraph(`By ${item.author}`);
    const authorSizes = { 2: 11, 3: 10, 4: 10, 8: 8 };
    styleParagraph(author, t => t.setFontSize(authorSizes[layout] || 10).setForegroundColor('#000000'));
    author.setSpacingAfter(5);
  }
  
  // Description (truncated for smaller layouts)
  if (item.description) {
    const maxLength = layout === 8 ? 50 : layout === 4 ? 100 : 150;
    const description = item.description.length > maxLength ? 
      item.description.substring(0, maxLength) + '...' : 
      item.description;
    
    const desc = cell.appendParagraph(description);
    const descSizes = { 2: 10, 3: 9, 4: 8, 8: 6 };
    styleParagraph(desc, t => t.setFontSize(descSizes[layout] || 8).setForegroundColor('#333333'));
    desc.setSpacingAfter(8);
  }
  
  // Price
  if (item.price) {
    const price = cell.appendParagraph(`AUD$ ${item.price}`);
    const priceSizes = { 2: 12, 3: 11, 4: 10, 8: 8 };
    styleParagraph(price, t => t.setFontSize(priceSizes[layout] || 10).setBold(true).setForegroundColor('#d63384'));
    price.setSpacingAfter(5);
  }
  
  // SKU/Barcode
  if (item.sku) {
    const sku = cell.appendParagraph(`SKU: ${item.sku}`);
    const skuSizes = { 2: 8, 3: 8, 4: 7, 8: 6 };
    styleParagraph(sku, t => t.setFontSize(skuSizes[layout] || 7).setForegroundColor('#999999'));
  }
}

// Helper function to convert HTML to plain text
function htmlToPlainText(html) {
  if (!html) return '';
  
  let text = html;
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
}

// Web app function to handle GET requests (for testing)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: "Google Apps Script is running. Use POST requests to create documents.",
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Generate EAN-13 barcode as image blob
function generateEAN13Barcode(code) {
  try {
    // Ensure we have a 13-digit code
    let barcodeCode = code.toString().replace(/\D/g, ''); // Remove non-digits
    
    if (barcodeCode.length === 12) {
      // Add check digit for 12-digit codes
      barcodeCode += calculateEAN13CheckDigit(barcodeCode);
    } else if (barcodeCode.length < 13) {
      // Pad with zeros to make 12 digits, then add check digit
      barcodeCode = barcodeCode.padStart(12, '0');
      barcodeCode += calculateEAN13CheckDigit(barcodeCode);
    } else if (barcodeCode.length > 13) {
      // Take first 13 digits
      barcodeCode = barcodeCode.substring(0, 13);
    }
    
    // Use Barcode.tec API for EAN-13 barcode generation
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeCode)}&code=EAN13&translate-esc=on&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23FFFFFF&qunit=Mm&quiet=0`;
    
    // Fetch the barcode image
    const response = UrlFetchApp.fetch(barcodeUrl);
    return response.getBlob();
    
  } catch (error) {
    console.error('Error generating EAN-13 barcode:', error);
    return null;
  }
}

// Calculate EAN-13 check digit
function calculateEAN13CheckDigit(code) {
  const digits = code.toString().split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

// Web app function to handle HTTP requests
function doPost(e) {
  try {
    console.log('doPost called');
    
    if (!e.postData || !e.postData.contents) {
      throw new Error('No POST data received');
    }
    
    const data = JSON.parse(e.postData.contents);
    console.log('Parsed data successfully');
    
    const result = createCatalogueDocument(data);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('doPost error:', error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function testCreateDocument() {
  const testData = {
    items: [
      {
        title: "Test Book",
        subtitle: "A Test Subtitle",
        author: "Test Author",
        description: "This is a test description for the book.",
        price: "29.99",
        imageUrl: "https://via.placeholder.com/200x300?text=Test+Book",
        sku: "TEST1234567890",
        imprint: "Test Publisher",
        releaseDate: "2025-01-01",
        binding: "Paperback",
        pages: "250",
        dimensions: "210 x 148 mm",
        authorBio: "<p>This is a test author bio with <strong>HTML formatting</strong>.</p>",
        additionalImages: [
          "https://via.placeholder.com/100x150?text=Internal+1",
          "https://via.placeholder.com/100x150?text=Internal+2"
        ]
      }
    ],
    layout: 1,
    title: "Test Catalogue",
    showFields: { authorBio: true },
    bannerColor: "#F7981D",
    websiteName: "www.woodslane.com.au"
  };
  
  const result = createCatalogueDocument(testData);
  console.log('Test result:', result);
}
