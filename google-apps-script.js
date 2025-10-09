/**
 * Google Apps Script for Catalogue Creator
 * Generates Google Docs with exact formatting to match HTML export
 */

// Main function to create catalogue document
function createCatalogueDocument(data) {
  try {
    console.log('Creating catalogue document with data:', JSON.stringify(data, null, 2));
    
    // Extract parameters
    const {
      items,
      layout = 4,
      title = "Product Catalogue",
      showFields = {},
      bannerColor = '#F7981D',
      websiteName = 'www.woodslane.com.au',
      utmParams = {}
    } = data;
    
    if (!items || items.length === 0) {
      throw new Error('No items provided');
    }
    
    // Create new document
    const doc = DocumentApp.create(title + ' - ' + new Date().toISOString().split('T')[0]);
    const body = doc.getBody();
    
    // Clear default content
    body.clear();
    
    // Set document properties
    doc.setHeaderMargin(20);
    doc.setFooterMargin(20);
    doc.setTopMargin(20);
    doc.setBottomMargin(20);
    
    // Add title
    const titleParagraph = body.appendParagraph(title);
    titleParagraph.setHeading(DocumentApp.ParagraphHeading.TITLE);
    titleParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    titleParagraph.getRange().getTextStyle().setFontSize(18).setBold(true);
    
    // Add subtitle
    const subtitleParagraph = body.appendParagraph(`Generated on ${new Date().toLocaleDateString()}`);
    subtitleParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    subtitleParagraph.getRange().getTextStyle().setFontSize(12).setForegroundColor('#666666');
    
    // Add spacing
    body.appendParagraph('').setSpacingAfter(40);
    
    // Create pages based on layout
    const perPage = layout;
    const pages = [];
    
    for (let i = 0; i < items.length; i += perPage) {
      pages.push(items.slice(i, i + perPage));
    }
    
    // Generate each page
    pages.forEach((page, pageIndex) => {
      if (pageIndex > 0) {
        // Add page break for subsequent pages
        body.appendPageBreak();
      }
      
      createPage(body, page, layout, showFields, bannerColor, websiteName, utmParams);
    });
    
    // Make document publicly viewable (optional)
    // doc.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
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

// Add banner (header or footer)
function addBanner(body, websiteName, bannerColor, isHeader) {
  const bannerParagraph = body.appendParagraph(websiteName);
  bannerParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  // Style the banner
  const bannerStyle = bannerParagraph.getRange().getTextStyle();
  bannerStyle.setFontSize(12).setBold(true).setForegroundColor('#FFFFFF');
  
  // Set background color (approximation - Google Docs doesn't support exact hex colors)
  const backgroundColor = getGoogleDocsColor(bannerColor);
  bannerParagraph.getRange().getBackgroundColor().setBackgroundColor(backgroundColor);
  
  // Add spacing
  if (isHeader) {
    bannerParagraph.setSpacingAfter(20);
  } else {
    bannerParagraph.setSpacingBefore(20);
  }
}

// Create 1-up layout (two-column design)
function create1UpLayout(body, item, showFields, bannerColor, websiteName, utmParams) {
  if (!item) return;
  
  // Create main table for two-column layout
  const table = body.appendTable();
  
  // Configure table
  table.setBorderWidth(0);
  table.setColumnWidth(0, 200); // Left column width
  table.setColumnWidth(1, 400); // Right column width
  
  // Create single row with two cells
  const row = table.appendTableRow();
  const leftCell = row.appendTableCell();
  const rightCell = row.appendTableCell();
  
  // Left column: Image, Author Bio, Internals
  createLeftColumn(leftCell, item, showFields);
  
  // Right column: Product details
  createRightColumn(rightCell, item, utmParams);
}

// Create left column content
function createLeftColumn(cell, item, showFields) {
  // Product image
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = cell.appendImage(imageBlob);
      image.setWidth(180); // Fixed width
      image.setHeight(270); // Fixed height
      
      // Center the image
      const imageParagraph = cell.getChild(0);
      imageParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      
      // Add spacing
      cell.appendParagraph('').setSpacingAfter(20);
    } catch (error) {
      console.warn('Could not load image:', item.imageUrl);
    }
  }
  
  // Author Bio
  if (showFields.authorBio && item.authorBio) {
    const bioTitle = cell.appendParagraph('Author Bio:');
    bioTitle.getRange().getTextStyle().setBold(true).setFontSize(12).setForegroundColor('#1565C0');
    bioTitle.setSpacingAfter(10);
    
    const bioContent = cell.appendParagraph(htmlToPlainText(item.authorBio));
    bioContent.getRange().getTextStyle().setFontSize(11);
    bioContent.setSpacingAfter(20);
  }
  
  // Internals (if available)
  if (item.additionalImages && item.additionalImages.length > 0) {
    const internalsTitle = cell.appendParagraph('Internals:');
    internalsTitle.getRange().getTextStyle().setBold(true).setFontSize(12).setForegroundColor('#495057');
    internalsTitle.setSpacingAfter(10);
    
    // Add up to 4 internal images in a 2x2 grid
    const imagesToShow = item.additionalImages.slice(0, 4);
    imagesToShow.forEach((imageUrl, index) => {
      try {
        const imageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
        const image = cell.appendImage(imageBlob);
        image.setWidth(80); // Smaller thumbnails
        image.setHeight(120);
        
        // Center the image
        const imageParagraph = cell.getChild(cell.getNumChildren() - 1);
        imageParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        
      } catch (error) {
        console.warn('Could not load internal image:', imageUrl);
      }
    });
  }
}

// Create right column content
function createRightColumn(cell, item, utmParams) {
  // Product title (clickable)
  const title = cell.appendParagraph(item.title);
  title.getRange().getTextStyle().setFontSize(20).setBold(true);
  title.setSpacingAfter(10);
  
  // Subtitle
  if (item.subtitle) {
    const subtitle = cell.appendParagraph(item.subtitle);
    subtitle.getRange().getTextStyle().setFontSize(14).setItalic(true).setForegroundColor('#666666');
    subtitle.setSpacingAfter(10);
  }
  
  // Author
  if (item.author) {
    const author = cell.appendParagraph(`By ${item.author}`);
    author.getRange().getTextStyle().setFontSize(13).setForegroundColor('#444444');
    author.setSpacingAfter(10);
  }
  
  // Description
  if (item.description) {
    const description = cell.appendParagraph(item.description);
    description.getRange().getTextStyle().setFontSize(11).setForegroundColor('#333333');
    description.setSpacingAfter(15);
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
    meta.getRange().getTextStyle().setFontSize(10).setForegroundColor('#666666');
    meta.setSpacingAfter(5);
  });
  
  // Price
  if (item.price) {
    const price = cell.appendParagraph(`AUD$ ${item.price}`);
    price.getRange().getTextStyle().setFontSize(16).setBold(true).setForegroundColor('#d63384');
    price.setSpacingAfter(15);
  }
  
  // Barcode (if SKU available)
  if (item.sku) {
    const barcodeText = cell.appendParagraph(`Barcode: ${item.sku}`);
    barcodeText.getRange().getTextStyle().setFontSize(10).setForegroundColor('#999999');
    barcodeText.setSpacingAfter(10);
  }
}

// Create multi-item layout (2-up, 3-up, 4-up, 8-up)
function createMultiItemLayout(body, pageItems, layout) {
  // Create table for grid layout
  const table = body.appendTable();
  table.setBorderWidth(0);
  
  // Configure table based on layout
  let rows, cols;
  switch (layout) {
    case 2:
      rows = 1; cols = 2;
      table.setColumnWidth(0, 300);
      table.setColumnWidth(1, 300);
      break;
    case 3:
      rows = 1; cols = 3;
      table.setColumnWidth(0, 200);
      table.setColumnWidth(1, 200);
      table.setColumnWidth(2, 200);
      break;
    case 4:
      rows = 2; cols = 2;
      table.setColumnWidth(0, 300);
      table.setColumnWidth(1, 300);
      break;
    case 8:
      rows = 2; cols = 4;
      table.setColumnWidth(0, 150);
      table.setColumnWidth(1, 150);
      table.setColumnWidth(2, 150);
      table.setColumnWidth(3, 150);
      break;
  }
  
  // Create rows and cells
  for (let row = 0; row < rows; row++) {
    const tableRow = table.appendTableRow();
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const cell = tableRow.appendTableCell();
      
      if (index < pageItems.length && pageItems[index]) {
        createProductCard(cell, pageItems[index], layout);
      } else {
        // Empty cell
        cell.appendParagraph('');
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
      
      // Center the image
      const imageParagraph = cell.getChild(0);
      imageParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      imageParagraph.setSpacingAfter(10);
    } catch (error) {
      console.warn('Could not load image:', item.imageUrl);
    }
  }
  
  // Title
  const title = cell.appendParagraph(item.title);
  const titleSizes = { 2: 14, 3: 12, 4: 11, 8: 9 };
  title.getRange().getTextStyle().setFontSize(titleSizes[layout] || 11).setBold(true);
  title.setSpacingAfter(5);
  
  // Subtitle
  if (item.subtitle) {
    const subtitle = cell.appendParagraph(item.subtitle);
    const subtitleSizes = { 2: 11, 3: 10, 4: 9, 8: 7 };
    subtitle.getRange().getTextStyle().setFontSize(subtitleSizes[layout] || 9).setItalic(true).setForegroundColor('#666666');
    subtitle.setSpacingAfter(5);
  }
  
  // Author
  if (item.author) {
    const author = cell.appendParagraph(`By ${item.author}`);
    const authorSizes = { 2: 11, 3: 10, 4: 10, 8: 8 };
    author.getRange().getTextStyle().setFontSize(authorSizes[layout] || 10).setForegroundColor('#000000');
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
    desc.getRange().getTextStyle().setFontSize(descSizes[layout] || 8).setForegroundColor('#333333');
    desc.setSpacingAfter(8);
  }
  
  // Price
  if (item.price) {
    const price = cell.appendParagraph(`AUD$ ${item.price}`);
    const priceSizes = { 2: 12, 3: 11, 4: 10, 8: 8 };
    price.getRange().getTextStyle().setFontSize(priceSizes[layout] || 10).setBold(true).setForegroundColor('#d63384');
    price.setSpacingAfter(5);
  }
  
  // SKU/Barcode
  if (item.sku) {
    const sku = cell.appendParagraph(`SKU: ${item.sku}`);
    const skuSizes = { 2: 8, 3: 8, 4: 7, 8: 6 };
    sku.getRange().getTextStyle().setFontSize(skuSizes[layout] || 7).setForegroundColor('#999999');
  }
}

// Helper function to convert hex color to Google Docs color
function getGoogleDocsColor(hexColor) {
  // Remove # if present
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Return RGB color
  return `#${hexColor}`;
}

// Helper function to convert HTML to plain text
function htmlToPlainText(html) {
  if (!html) return '';
  
  let text = html;
  
  // Convert line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');
  
  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up extra whitespace
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
}

// Web app function to handle HTTP requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = createCatalogueDocument(data);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (optional)
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
