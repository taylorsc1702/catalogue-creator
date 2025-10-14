/**
 * Modular Google Apps Script for Catalogue Creator
 * This file consolidates all the modular components into a single deployable script
 */

// ============================================================================
// UTILITIES - STYLING
// ============================================================================

// Safe paragraph styling helper
function styleParagraph(p, fn) {
  if (p.getNumChildren() === 0) p.appendText('');
  const t = p.editAsText();
  if (t) fn(t);
}

// Utility: truncate at word boundary
function truncateAtWord(str, maxChars) {
  if (!str || str.length <= maxChars) return str || '';
  const sliced = str.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim() + '…';
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

// Common font sizes for different layouts
const FONT_SIZES = {
  title: { 1: 14, 2: 12, 3: 10, 4: 9, 8: 7 },
  subtitle: { 1: 10, 2: 9, 3: 8, 4: 7, 8: 6 },
  author: { 1: 9, 2: 8, 3: 7, 4: 7, 8: 6 },
  description: { 1: 9, 2: 8, 3: 7, 4: 6, 8: 5 },
  price: { 1: 10, 2: 10, 3: 9, 4: 8, 8: 6 },
  details: { 1: 9, 2: 7, 3: 7, 4: 7, 8: 6 }
};

// Common image sizes for different layouts
const IMAGE_SIZES = {
  product: { 1: { width: 120, height: 160 }, 2: { width: 100, height: 140 }, 3: { width: 80, height: 120 }, 4: { width: 60, height: 90 }, 8: { width: 30, height: 45 } },
  barcode: { 1: { width: 100, height: 30 }, 2: { width: 80, height: 25 }, 3: { width: 70, height: 20 }, 4: { width: 60, height: 18 }, 8: { width: 40, height: 12 } },
  internals: { 1: { width: 70, height: 95 }, 2: { width: 50, height: 70 }, 3: { width: 40, height: 60 }, 4: { width: 30, height: 45 }, 8: { width: 20, height: 30 } }
};

// Get font size for layout
function getFontSize(type, layout) {
  return FONT_SIZES[type]?.[layout] || FONT_SIZES[type]?.[4] || 8;
}

// Get image size for layout
function getImageSize(type, layout) {
  return IMAGE_SIZES[type]?.[layout] || IMAGE_SIZES[type]?.[4] || { width: 50, height: 50 };
}

// ============================================================================
// UTILITIES - BARCODE
// ============================================================================

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

// Create barcode image in a cell with fallback
function createBarcodeInCell(cell, sku, layout, fallbackText = null) {
  if (!sku) return;
  
  try {
    const barcodeImage = generateEAN13Barcode(sku);
    if (barcodeImage) {
      const image = cell.appendImage(barcodeImage);
      const size = getImageSize('barcode', layout);
      image.setWidth(size.width);
      image.setHeight(size.height);
      return true;
    } else {
      // Fallback: show SKU as text
      const barcodeText = cell.appendParagraph(fallbackText || `SKU: ${sku}`);
      styleParagraph(barcodeText, t => t.setFontSize(6).setForegroundColor('#999999'));
      return false;
    }
  } catch (error) {
    console.warn('Could not generate barcode:', error);
    // Fallback: show SKU as text
    const barcodeText = cell.appendParagraph(fallbackText || `SKU: ${sku}`);
    styleParagraph(barcodeText, t => t.setFontSize(6).setForegroundColor('#999999'));
    return false;
  }
}

// ============================================================================
// UTILITIES - TABLES
// ============================================================================

// Create product details table
function createProductDetailsTable(cell, item, layout) {
  const metaItems = [];
  if (item.imprint) metaItems.push([`Publisher:`, item.imprint]);
  if (item.releaseDate) metaItems.push([`Release Date:`, item.releaseDate]);
  if (item.binding) metaItems.push([`Binding:`, item.binding]);
  if (item.pages) metaItems.push([`Pages:`, `${item.pages} pages`]);
  if (item.dimensions) metaItems.push([`Dimensions:`, item.dimensions]);
  if (item.weight) metaItems.push([`Weight:`, item.weight]);
  
  if (metaItems.length === 0) return null;
  
  const detailsTable = cell.appendTable(metaItems);
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
    labelCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(4).setPaddingRight(2);
    valueCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(2).setPaddingRight(4);
    
    // Style the existing paragraphs
    const labelPara = labelCell.getChild(0).asParagraph();
    const valuePara = valueCell.getChild(0).asParagraph();
    styleParagraph(labelPara, t => t.setBold(true).setFontSize(getFontSize('details', layout)).setForegroundColor('#666666'));
    styleParagraph(valuePara, t => t.setFontSize(getFontSize('details', layout)).setForegroundColor('#333333'));
    
    // Reduce spacing between rows
    labelPara.setSpacingAfter(0);
    valuePara.setSpacingAfter(0);
  }
  
  return detailsTable;
}

// Create product details table WITH price and barcode (for multi-item layouts)
function createProductDetailsTableWithPriceBarcode(cell, item, layout) {
  const metaItems = [];
  if (item.imprint) metaItems.push([`Publisher:`, item.imprint]);
  if (item.releaseDate) metaItems.push([`Release Date:`, item.releaseDate]);
  if (item.binding) metaItems.push([`Binding:`, item.binding]);
  if (item.pages) metaItems.push([`Pages:`, `${item.pages} pages`]);
  if (item.dimensions) metaItems.push([`Dimensions:`, item.dimensions]);
  if (item.weight) metaItems.push([`Weight:`, item.weight]);
  
  // Add price as the last row (barcode is handled separately for 4-up)
  if (item.price) {
    metaItems.push([`Price:`, `AUD$ ${item.price}`]);
  }
  
  if (metaItems.length === 0) return null;
  
  const detailsTable = cell.appendTable(metaItems);
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
    labelCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(4).setPaddingRight(2);
    valueCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(2).setPaddingRight(4);
    
    // Check if this is the price row (last row)
    const labelText = labelCell.getChild(0).asParagraph().getText();
    const isLastRow = i === detailsTable.getNumRows() - 1;
    
    if (labelText === 'Price:' && isLastRow) {
      // Style the price row
      const labelPara = labelCell.getChild(0).asParagraph();
      const valuePara = valueCell.getChild(0).asParagraph();
      styleParagraph(labelPara, t => t.setBold(true).setFontSize(getFontSize('details', layout)).setForegroundColor('#666666'));
      styleParagraph(valuePara, t => t.setBold(true).setFontSize(getFontSize('price', layout)).setForegroundColor('#d63384'));
      
      // Reduce spacing between rows
      labelPara.setSpacingAfter(0);
      valuePara.setSpacingAfter(0);
    } else {
      // Style the existing paragraphs for normal rows
      const labelPara = labelCell.getChild(0).asParagraph();
      const valuePara = valueCell.getChild(0).asParagraph();
      styleParagraph(labelPara, t => t.setBold(true).setFontSize(getFontSize('details', layout)).setForegroundColor('#666666'));
      styleParagraph(valuePara, t => t.setFontSize(getFontSize('details', layout)).setForegroundColor('#333333'));
      
      // Reduce spacing between rows
      labelPara.setSpacingAfter(0);
      valuePara.setSpacingAfter(0);
    }
  }
  
  return detailsTable;
}

// Create price and barcode table (for 1-up layout)
function createPriceBarcodeTable(cell, item, layout) {
  if (!item.price && !item.sku) return null;
  
  const priceBarcodeTable = cell.appendTable([['', '']]); // Two columns: price and barcode
  priceBarcodeTable.setBorderWidth(1);
  priceBarcodeTable.setBorderColor('#e0e0e0');
  
  const priceCell = priceBarcodeTable.getRow(0).getCell(0);
  const barcodeCell = priceBarcodeTable.getRow(0).getCell(1);
  
  // Minimal padding
  priceCell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(4).setPaddingRight(4);
  barcodeCell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(4).setPaddingRight(4);
  priceCell.setBackgroundColor('#FFFFFF');
  barcodeCell.setBackgroundColor('#FFFFFF');
  
  // Price (left side)
  if (item.price) {
    const price = priceCell.appendParagraph(`AUD$ ${item.price}`);
    styleParagraph(price, t => t.setFontSize(getFontSize('price', layout)).setBold(true).setForegroundColor('#d63384'));
    price.setSpacingAfter(0);
  }
  
  // Barcode (right side)
  if (item.sku) {
    createBarcodeInCell(barcodeCell, item.sku, layout);
  }
  
  return priceBarcodeTable;
}

// Create internals table (2x2 grid)
function createInternalsTable(cell, item, layout) {
  if (!item.additionalImages || item.additionalImages.length === 0) return null;
  
  // Create a proper 2x2 grid table
  const internalsTable = cell.appendTable([
    ['', ''], // Row 1: 2 cells
    ['', '']  // Row 2: 2 cells
  ]);
  internalsTable.setBorderWidth(1);
  internalsTable.setBorderColor('#e0e0e0');
  
  // Style all cells with minimal padding
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const gridCell = internalsTable.getRow(r).getCell(c);
      gridCell.setBackgroundColor('#FFFFFF');
      gridCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(1).setPaddingRight(1);
    }
  }
  
  // Add up to 4 images into the 2x2 grid
  const imagesToShow = item.additionalImages.slice(0, 4);
  imagesToShow.forEach((imageUrl, idx) => {
    try {
      const r = idx < 2 ? 0 : 1; // First 2 images in row 0, next 2 in row 1
      const c = idx % 2;         // Alternate between columns 0 and 1
      const gridCell = internalsTable.getRow(r).getCell(c);
      
      const blob = UrlFetchApp.fetch(imageUrl).getBlob();
      const img = gridCell.appendImage(blob);
      const size = getImageSize('internals', layout);
      img.setWidth(size.width);
      img.setHeight(size.height);
    } catch (e) {
      console.warn('Could not load internal image:', imageUrl);
    }
  });
  
  return internalsTable;
}

// Create section with border
function createSection(cell, content) {
  const section = cell.appendTable([['']]);
  section.setBorderWidth(1);
  section.setBorderColor('#e0e0e0');
  
  const sectionCell = section.getRow(0).getCell(0);
  sectionCell.setBackgroundColor('#FFFFFF');
  sectionCell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
  
  if (typeof content === 'function') {
    content(sectionCell);
  }
  
  return section;
}

// ============================================================================
// UTILITIES - BANNERS
// ============================================================================

// Add banner (header or footer)
function addBanner(body, websiteName, bannerColor, isHeader) {
  try {
    const banner = body.appendParagraph(websiteName);
    banner.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    
    // Style the text (separate from background)
    styleParagraph(banner, t => {
      t.setFontSize(12).setBold(true).setForegroundColor('#FFFFFF');
    });
    
    // Set background color on the paragraph
    banner.setBackgroundColor(bannerColor);
    
    // Add spacing
    if (isHeader) {
      banner.setSpacingAfter(10); // Reduced for tighter layout
    } else {
      banner.setSpacingBefore(10); // Reduced for tighter layout
    }
    
  } catch (error) {
    console.error('Error adding banner:', error.toString());
  }
}

// Add banners for a page
function addPageBanners(body, websiteName, bannerColor) {
  // Header banner
  addBanner(body, websiteName, bannerColor, true);
  
  // Footer banner (will be added at the end of the page)
  // Note: In Google Docs, we can't easily add footers, so we'll add it at the end of content
}

// ============================================================================
// LAYOUT HANDLERS
// ============================================================================

// Create 1-up layout (two-column design)
function create1UpLayout(body, item, showFields, bannerColor, websiteName, utmParams) {
  if (!item) {
    console.warn('No item provided to create1UpLayout');
    return;
  }
  
  try {
    // Create a simple two-column table without headers
    const table = body.appendTable([['', '']]);
    table.setBorderWidth(0); // Remove borders for cleaner look
    
    // Work with the single row
    const row = table.getRow(0);
    const leftCell = row.getCell(0);
    const rightCell = row.getCell(1);
    
    // Set cell padding and alignment (reduced for tighter layout)
    leftCell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(8).setPaddingRight(8);
    rightCell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(8).setPaddingRight(8);
    
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

// Create structured left column with defined sections
function createStructuredLeftColumn(cell, item, showFields) {
  if (!item) {
    console.warn('No item provided to createStructuredLeftColumn');
    return;
  }
  
  try {
    // ----- Section 1: Product Image -----
    if (item.imageUrl) {
      createSection(cell, (sectionCell) => {
        try {
          const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
          const image = sectionCell.appendImage(imageBlob);
          const size = getImageSize('product', 1);
          image.setWidth(size.width);
          image.setHeight(size.height);
        } catch (e) {
          console.warn('Could not load image:', item.imageUrl);
        }
      });
      
      cell.appendParagraph('').setSpacingAfter(3); // Further reduced for tighter layout
    }

    // ----- Section 2: Author Bio (truncate to keep Internals on same page) -----
    const hasInternals = item.additionalImages && item.additionalImages.length > 0;

    if (showFields.authorBio && item.authorBio) {
      createSection(cell, (sectionCell) => {
        const bioHeading = sectionCell.appendParagraph('Author Bio:');
        styleParagraph(bioHeading, t => t.setBold(true).setFontSize(11).setForegroundColor('#1565C0'));
        bioHeading.setSpacingAfter(5);

        // Heuristic: max characters allowed so Internals (heading + 2x2 grid) fits below
        const BASE_MAX = 900;                 // roomy bio with no internals
        const RESERVE_FOR_INTERNALS = 360;    // room to keep Internals on same page
        const maxBioChars = hasInternals ? Math.max(140, BASE_MAX - RESERVE_FOR_INTERNALS) : BASE_MAX;

        let bioText = htmlToPlainText(item.authorBio);
        bioText = truncateAtWord(bioText, maxBioChars);

        const bioParagraph = sectionCell.appendParagraph(bioText);
        styleParagraph(bioParagraph, t => t.setFontSize(9).setForegroundColor('#000000'));
        bioParagraph.setLineSpacing(1.0); // tighter so the box is compact
      });

      // Minimal spacer before Internals
      const bioAnchor = cell.appendParagraph('');
      bioAnchor.setSpacingAfter(3); // Further reduced for tighter layout
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
          const size = getImageSize('internals', 1);
          img.setWidth(size.width);
          img.setHeight(size.height);
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
    titleCell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(6).setPaddingRight(6);
    titleCell.setBackgroundColor('#FFFFFF'); // Transparent white background
    
    // Ensure no text highlighting in title section
    const titlePara = titleCell.getChild(0).asParagraph();
    if (titlePara) {
      styleParagraph(titlePara, t => t.setBackgroundColor(null));
    }
    
    // Product title (smaller text)
    const title = titleCell.appendParagraph(item.title);
    styleParagraph(title, t => t.setFontSize(getFontSize('title', 1)).setBold(true).setForegroundColor('#000000'));
    title.setSpacingAfter(3);
    
    // Subtitle
    if (item.subtitle) {
      const subtitle = titleCell.appendParagraph(item.subtitle);
      styleParagraph(subtitle, t => t.setFontSize(getFontSize('subtitle', 1)).setItalic(true).setForegroundColor('#666666'));
      subtitle.setSpacingAfter(3);
    }
    
    // Author (fix duplication - don't add "By" if it's already in the metafield)
    if (item.author) {
      let authorText = item.author;
      if (!authorText.toLowerCase().startsWith('by ')) {
        authorText = `By ${authorText}`;
      }
      const author = titleCell.appendParagraph(authorText);
      styleParagraph(author, t => t.setFontSize(getFontSize('author', 1)).setForegroundColor('#444444'));
      author.setSpacingAfter(3);
    }
    
    // Description section (scales to fill available space)
    if (item.description) {
      const descSection = cell.appendTable([['']]);
      descSection.setBorderWidth(1);
      descSection.setBorderColor('#e0e0e0');
      
      const descCell = descSection.getRow(0).getCell(0);
      descCell.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(6).setPaddingRight(6);
      descCell.setBackgroundColor('#FFFFFF');
      
      // Ensure no text highlighting in description section
      const descPara = descCell.getChild(0).asParagraph();
      if (descPara) {
        styleParagraph(descPara, t => t.setBackgroundColor(null));
      }
      
      let descText = item.description;
      const description = descCell.appendParagraph(descText);
      styleParagraph(description, t => t.setFontSize(getFontSize('description', 1)).setForegroundColor('#333333'));
      description.setSpacingAfter(0); // No extra spacing
    }
    
    // Section 2: Product Details (heading outside, data in table)
    
    // Add heading outside the table
    const detailsHeading = titleCell.appendParagraph('Product Details:');
    styleParagraph(detailsHeading, t => t.setBold(true).setFontSize(11).setForegroundColor('#1565C0'));
    detailsHeading.setSpacingAfter(5);
    
    // Create product details table
    const detailsTable = createProductDetailsTable(titleCell, item, 1);
    if (detailsTable) {
      cell.appendParagraph('').setSpacingAfter(3);
    }
    
    // No spacer - price/barcode should be at the bottom
    
    // Section 3: Price and Barcode (fixed position at bottom)
    const priceBarcodeTable = createPriceBarcodeTable(cell, item, 1);
    
  } catch (error) {
    console.error('Error in createStructuredRightColumn:', error.toString());
    // Fallback: create a simple text
    const fallbackText = cell.appendParagraph(`Error in right column: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(10).setForegroundColor('#FF0000'));
  }
}

// Create 2-up layout (1 row, 2 columns)
function create2UpLayout(body, items, options) {
  if (!items || items.length === 0) {
    console.warn('No items provided to create2UpLayout');
    return;
  }
  
  try {
    // Create a 1x2 grid table
    const data = Array.from({length: 1}, () => Array.from({length: 2}, () => ''));
    const table = body.appendTable(data);
    table.setBorderWidth(0);
    
    // Fill the grid with items
    for (let c = 0; c < 2; c++) {
      const cell = table.getRow(0).getCell(c);
      if (c < items.length) {
        createProductCard(cell, items[c], 2);
      }
    }
    
  } catch (error) {
    console.error('Error in create2UpLayout:', error.toString());
    // Fallback: create a simple text
    const fallbackText = body.appendParagraph(`Error creating 2-up layout: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(12).setForegroundColor('#FF0000'));
  }
}

// Create 3-up layout (3 rows stacked vertically)
function create3UpLayout(body, items, options) {
  if (!items || items.length === 0) {
    console.warn('No items provided to create3UpLayout');
    return;
  }
  
  try {
    // Create 3 separate rows (one for each item)
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        // Add minimal spacing between rows
        body.appendParagraph('').setSpacingAfter(5); // Reduced from 10 to 5
      }
      
      if (i < items.length) {
        // Create a single-cell table for each item to act as a container
        const itemTable = body.appendTable([['']]);
        itemTable.setBorderWidth(0);
        const itemCell = itemTable.getRow(0).getCell(0);
        
        // Now call createProductCard with the proper cell
        createProductCard(itemCell, items[i], 3);
      }
    }
    
  } catch (error) {
    console.error('Error in create3UpLayout:', error.toString());
    // Fallback: create a simple text
    const fallbackText = body.appendParagraph(`Error creating 3-up layout: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(12).setForegroundColor('#FF0000'));
  }
}

// Create 4-up layout (2 rows, 2 columns)
function create4UpLayout(body, items, options) {
  if (!items || items.length === 0) {
    console.warn('No items provided to create4UpLayout');
    return;
  }
  
  try {
    // Create a 2x2 grid table
    const data = Array.from({length: 2}, () => Array.from({length: 2}, () => ''));
    const table = body.appendTable(data);
    table.setBorderWidth(0);
    
    // Fill the grid with items
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const index = r * 2 + c;
        const cell = table.getRow(r).getCell(c);
        if (index < items.length) {
          createProductCard(cell, items[index], 4);
        }
      }
    }
    
  } catch (error) {
    console.error('Error in create4UpLayout:', error.toString());
    // Fallback: create a simple text
    const fallbackText = body.appendParagraph(`Error creating 4-up layout: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(12).setForegroundColor('#FF0000'));
  }
}

// Create 8-up layout (2 rows, 4 columns)
function create8UpLayout(body, items, options) {
  if (!items || items.length === 0) {
    console.warn('No items provided to create8UpLayout');
    return;
  }
  
  try {
    // Create a 2x4 grid table
    const data = Array.from({length: 2}, () => Array.from({length: 4}, () => ''));
    const table = body.appendTable(data);
    table.setBorderWidth(0);
    
    // Fill the grid with items
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const index = r * 4 + c;
        const cell = table.getRow(r).getCell(c);
        if (index < items.length) {
          createProductCard(cell, items[index], 8);
        }
      }
    }
    
  } catch (error) {
    console.error('Error in create8UpLayout:', error.toString());
    // Fallback: create a simple text
    const fallbackText = body.appendParagraph(`Error creating 8-up layout: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(12).setForegroundColor('#FF0000'));
  }
}

// Create product card for multi-item layouts (2-up, 3-up, 4-up, 8-up)
function createProductCard(cell, item, layout) {
  if (!item) {
    console.warn('No item provided to createProductCard');
    return;
  }
  
  try {
    // Set cell padding
    cell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
    cell.setBackgroundColor('#FFFFFF');
    
    if (layout === 3) {
      // Special layout for 3-up: image left, title/author/description middle, details/barcode right
      createProductCard3Up(cell, item);
    } else if (layout === 4) {
      // Special layout for 4-up: image left, title/author/barcode right, description below
      createProductCard4Up(cell, item);
    } else {
      // Standard layout for other multi-item layouts
      createProductCardStandard(cell, item, layout);
    }
    
  } catch (error) {
    console.error('Error in createProductCard:', error.toString());
    // Fallback: create a simple text
    const fallbackText = cell.appendParagraph(`Error creating product card: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(8).setForegroundColor('#FF0000'));
  }
}

// Special 3-up layout: image left, title/author/description middle, details/barcode right
function createProductCard3Up(cell, item) {
  // === THREE COLUMN LAYOUT: IMAGE LEFT, CONTENT MIDDLE, DETAILS RIGHT ===
  const mainTable = cell.appendTable([['', '', '']]); // Left: image, Middle: content, Right: details
  mainTable.setBorderWidth(0);
  
  const imageCell = mainTable.getRow(0).getCell(0);
  const contentCell = mainTable.getRow(0).getCell(1);
  const detailsCell = mainTable.getRow(0).getCell(2);
  
  // Style cells
  imageCell.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(5);
  contentCell.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(5).setPaddingRight(5);
  detailsCell.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(5).setPaddingRight(0);
  imageCell.setBackgroundColor('#FFFFFF');
  contentCell.setBackgroundColor('#FFFFFF');
  detailsCell.setBackgroundColor('#FFFFFF');
  
  // === LEFT CELL: IMAGE ===
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = imageCell.appendImage(imageBlob);
      image.setWidth(113); // Increased by 25% (90 * 1.25 = 112.5, rounded to 113)
      image.setHeight(150); // Increased by 25% (120 * 1.25 = 150)
    } catch (error) {
      console.warn('Could not load image:', item.imageUrl);
    }
  }
  
  // === MIDDLE CELL: TITLE, SUBTITLE, AUTHOR, DESCRIPTION ===
  // Title
  const title = contentCell.appendParagraph(item.title);
  styleParagraph(title, t => t.setFontSize(12).setBold(true).setForegroundColor('#000000'));
  title.setSpacingAfter(1); // Reduced from 3 to 1
  
  // Subtitle
  if (item.subtitle) {
    const subtitle = contentCell.appendParagraph(item.subtitle);
    styleParagraph(subtitle, t => t.setFontSize(10).setItalic(true).setForegroundColor('#666666'));
    subtitle.setSpacingAfter(1); // Reduced from 3 to 1
  }
  
  // Author
  if (item.author) {
    let authorText = item.author;
    if (!authorText.toLowerCase().startsWith('by ')) {
      authorText = `By ${authorText}`;
    }
    const author = contentCell.appendParagraph(authorText);
    styleParagraph(author, t => t.setFontSize(10).setForegroundColor('#444444'));
    author.setSpacingAfter(2); // Reduced from 5 to 2
  }
  
  // Description (longer for 3-up)
  if (item.description) {
    let descText = item.description;
    
    // Truncate description to 400 chars for 3-up
    const maxChars = 400;
    if (descText.length > maxChars) {
      descText = truncateAtWord(descText, maxChars);
    }
    
    const desc = contentCell.appendParagraph(descText);
    styleParagraph(desc, t => t.setFontSize(9).setForegroundColor('#333333'));
    desc.setSpacingAfter(0);
  }
  
  // === RIGHT CELL: PUBLICATION DETAILS AND BARCODE ===
  // Publication details
  const detailsItems = [];
  if (item.imprint) detailsItems.push([`Publisher:`, item.imprint]);
  if (item.category) detailsItems.push([`Category:`, item.category]);
  if (item.discount) detailsItems.push([`Disc:`, item.discount]);
  if (item.binding) detailsItems.push([`Format:`, item.binding]);
  if (item.dimensions) detailsItems.push([`Dimensions:`, item.dimensions]);
  if (item.pages) detailsItems.push([`Pages:`, `${item.pages} Pages`]);
  if (item.colorInfo) detailsItems.push([`Color:`, item.colorInfo]);
  if (item.releaseDate) detailsItems.push([`Release Date:`, item.releaseDate]);
  if (item.sku) detailsItems.push([`ISBN:`, item.sku]);
  if (item.price) detailsItems.push([`Price:`, `AUD$ ${item.price}`]);
  
  // Create details table
  if (detailsItems.length > 0) {
    const detailsTable = detailsCell.appendTable(detailsItems);
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
      labelCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(4).setPaddingRight(2);
      valueCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(2).setPaddingRight(4);
      
      // Style the existing paragraphs
      const labelPara = labelCell.getChild(0).asParagraph();
      const valuePara = valueCell.getChild(0).asParagraph();
      styleParagraph(labelPara, t => t.setBold(true).setFontSize(8).setForegroundColor('#666666'));
      styleParagraph(valuePara, t => t.setFontSize(8).setForegroundColor('#333333'));
      
      // Reduce spacing between rows
      labelPara.setSpacingAfter(0);
      valuePara.setSpacingAfter(0);
    }
    
    // Add barcode below the table
    if (item.sku) {
      try {
        const barcodeImage = generateEAN13Barcode(item.sku);
        if (barcodeImage) {
          const barcode = detailsCell.appendImage(barcodeImage);
          barcode.setWidth(80);
          barcode.setHeight(24);
          
          // Add ISBN below barcode
          const isbnText = detailsCell.appendParagraph(item.sku);
          styleParagraph(isbnText, t => t.setFontSize(7).setForegroundColor('#999999'));
          isbnText.setSpacingAfter(0);
        }
      } catch (error) {
        console.warn('Could not generate barcode:', error);
      }
    }
  }
}

// Special 4-up layout: image left, title/author/barcode right, description below
function createProductCard4Up(cell, item) {
  // === TOP SECTION: IMAGE LEFT, TITLE/AUTHOR/BARCODE RIGHT ===
  const topTable = cell.appendTable([['', '']]); // Left: image, Right: title/author/barcode
  topTable.setBorderWidth(0);
  
  const imageCell = topTable.getRow(0).getCell(0);
  const infoCell = topTable.getRow(0).getCell(1);
  
  // Style cells
  imageCell.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(5);
  infoCell.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(5).setPaddingRight(0);
  imageCell.setBackgroundColor('#FFFFFF');
  infoCell.setBackgroundColor('#FFFFFF');
  
  // === LEFT CELL: BIGGER IMAGE ===
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const image = imageCell.appendImage(imageBlob);
      
      // Image sizes based on layout
      const imageSizes = {
        3: { width: 90, height: 120 },  // 3-up: slightly bigger
        4: { width: 80, height: 110 }   // 4-up: smaller
      };
      
      const size = imageSizes[layout] || imageSizes[4];
      image.setWidth(size.width);
      image.setHeight(size.height);
    } catch (error) {
      console.warn('Could not load image:', item.imageUrl);
    }
  }
  
  // === RIGHT CELL: TITLE, SUBTITLE, AUTHOR, BARCODE ===
  // Font sizes based on layout
  const fontSizes = {
    3: { title: 11, subtitle: 9, author: 9, description: 8 },  // 3-up: slightly bigger
    4: { title: 10, subtitle: 8, author: 8, description: 7 }   // 4-up: smaller
  };
  
  const fonts = fontSizes[layout] || fontSizes[4];
  
  // Title
  const title = infoCell.appendParagraph(item.title);
  styleParagraph(title, t => t.setFontSize(fonts.title).setBold(true).setForegroundColor('#000000'));
  title.setSpacingAfter(2);
  
  // Subtitle
  if (item.subtitle) {
    const subtitle = infoCell.appendParagraph(item.subtitle);
    styleParagraph(subtitle, t => t.setFontSize(fonts.subtitle).setItalic(true).setForegroundColor('#666666'));
    subtitle.setSpacingAfter(2);
  }
  
  // Author
  if (item.author) {
    let authorText = item.author;
    if (!authorText.toLowerCase().startsWith('by ')) {
      authorText = `By ${authorText}`;
    }
    const author = infoCell.appendParagraph(authorText);
    styleParagraph(author, t => t.setFontSize(fonts.author).setForegroundColor('#444444'));
    author.setSpacingAfter(3);
  }
  
  // Barcode (right side of info)
  if (item.sku) {
    try {
      const barcodeImage = generateEAN13Barcode(item.sku);
      if (barcodeImage) {
        const barcode = infoCell.appendImage(barcodeImage);
        // Barcode sizes based on layout
        const barcodeSizes = {
          3: { width: 70, height: 20 },  // 3-up: slightly bigger
          4: { width: 60, height: 18 }   // 4-up: smaller
        };
        
        const barcodeSize = barcodeSizes[layout] || barcodeSizes[4];
        barcode.setWidth(barcodeSize.width);
        barcode.setHeight(barcodeSize.height);
      }
    } catch (error) {
      console.warn('Could not generate barcode:', error);
    }
  }
  
  // === DESCRIPTION (FULL WIDTH BELOW) ===
  if (item.description) {
    let descText = item.description;
    
    // Truncate description based on layout
    const maxDescChars = {
      3: 300,  // 3-up: longer description
      4: 200   // 4-up: shorter description
    };
    
    const maxChars = maxDescChars[layout] || 200;
    if (descText.length > maxChars) {
      descText = truncateAtWord(descText, maxChars);
    }
    
    const desc = cell.appendParagraph(descText);
    styleParagraph(desc, t => t.setFontSize(fonts.description).setForegroundColor('#333333'));
    desc.setSpacingAfter(3);
  }
  
  // === PRODUCT DETAILS TABLE (FULL WIDTH) ===
  createProductDetailsTableWithPriceBarcode(cell, item, layout);
}

// Standard layout for 2-up, 8-up (centered images)
function createProductCardStandard(cell, item, layout) {
  // === IMAGE (CENTERED) ===
  if (item.imageUrl) {
    try {
      const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
      const imagePara = cell.appendParagraph('');
      const image = imagePara.appendInlineImage(imageBlob);
      const size = getImageSize('product', layout);
      image.setWidth(size.width);
      image.setHeight(size.height);
      
      // Center the image
      imagePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      imagePara.setSpacingAfter(5);
    } catch (error) {
      console.warn('Could not load image:', item.imageUrl);
    }
  }
  
  // === TITLE ===
  const title = cell.appendParagraph(item.title);
  styleParagraph(title, t => t.setFontSize(getFontSize('title', layout)).setBold(true).setForegroundColor('#000000'));
  title.setSpacingAfter(3);
  
  // === SUBTITLE ===
  if (item.subtitle) {
    const subtitle = cell.appendParagraph(item.subtitle);
    styleParagraph(subtitle, t => t.setFontSize(getFontSize('subtitle', layout)).setItalic(true).setForegroundColor('#666666'));
    subtitle.setSpacingAfter(3);
  }
  
  // === AUTHOR ===
  if (item.author) {
    let authorText = item.author;
    if (!authorText.toLowerCase().startsWith('by ')) {
      authorText = `By ${authorText}`;
    }
    const author = cell.appendParagraph(authorText);
    styleParagraph(author, t => t.setFontSize(getFontSize('author', layout)).setForegroundColor('#444444'));
    author.setSpacingAfter(3);
  }
  
  // === DESCRIPTION (TRUNCATED) ===
  if (item.description) {
    let descText = item.description;
    
    // Truncate description for smaller layouts to ensure predictable size
    const maxDescChars = {
      2: 400,  // 2-up: longer description
      8: 80    // 8-up: very short description
    };
    
    const maxChars = maxDescChars[layout] || 200;
    if (descText.length > maxChars) {
      descText = truncateAtWord(descText, maxChars);
    }
    
    const desc = cell.appendParagraph(descText);
    styleParagraph(desc, t => t.setFontSize(getFontSize('description', layout)).setForegroundColor('#333333'));
    desc.setSpacingAfter(5);
  }
  
  // === PRODUCT DETAILS TABLE (WITH PRICE AND BARCODE) ===
  createProductDetailsTableWithPriceBarcode(cell, item, layout);
}

// Create mixed layout based on layout assignments
function createMixedLayout(body, items, layoutAssignments, options) {
  if (!items || items.length === 0) {
    console.warn('No items provided to createMixedLayout');
    return;
  }
  
  if (!layoutAssignments || layoutAssignments.length !== items.length) {
    console.warn('Layout assignments must match items length');
    return;
  }
  
  try {
    let currentIndex = 0;
    let isFirstPage = true;
    
    while (currentIndex < items.length) {
      // Add page break between pages (except for the first page)
      if (!isFirstPage) {
        body.appendPageBreak();
      }
      isFirstPage = false;
      
      // Add page banners
      addPageBanners(body, options.websiteName || 'www.woodslane.com.au', options.bannerColor || '#F7981D');
      
      const currentLayout = layoutAssignments[currentIndex];
      const itemsForThisPage = [];
      
      // Collect items for this layout
      for (let i = 0; i < currentLayout && currentIndex < items.length; i++) {
        itemsForThisPage.push(items[currentIndex]);
        currentIndex++;
      }
      
      // Delegate to appropriate layout handler
      switch(currentLayout) {
        case 1:
          if (itemsForThisPage.length > 0) {
            create1UpLayout(body, itemsForThisPage[0], options.showFields, options.bannerColor, options.websiteName, options.utmParams);
          }
          break;
        case 2:
          create2UpLayout(body, itemsForThisPage, options);
          break;
        case 3:
          create3UpLayout(body, itemsForThisPage, options);
          break;
        case 4:
          create4UpLayout(body, itemsForThisPage, options);
          break;
        case 8:
          create8UpLayout(body, itemsForThisPage, options);
          break;
        default:
          console.warn(`Unknown layout type: ${currentLayout}, defaulting to 2-up`);
          create2UpLayout(body, itemsForThisPage, options);
      }
      
      // Add footer banner at the end of each page
      addBanner(body, options.websiteName || 'www.woodslane.com.au', options.bannerColor || '#F7981D', false);
    }
    
  } catch (error) {
    console.error('Error in createMixedLayout:', error.toString());
    // Fallback: create a simple text
    const fallbackText = body.appendParagraph(`Error creating mixed layout: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(12).setForegroundColor('#FF0000'));
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

// Main function to create catalogue document
function createCatalogueDocument(data) {
  try {
    console.log('Creating catalogue document');
    console.log('Data received:', data ? 'Yes' : 'No');
    
    if (!data || !data.items || data.items.length === 0) {
      throw new Error('No items provided');
    }
    
    console.log('Items count:', data.items.length);
    
    // Create new document
    const doc = DocumentApp.create(data.title || 'Catalogue Document');
    const body = doc.getBody();
    
    // Clear default content
    body.clear();
    
    // Process items based on layout type
    if (data.layoutAssignments && data.layoutAssignments.length > 0) {
      // Mixed layout - use the mixed layout handler (handles banners internally)
      createMixedLayout(body, data.items, data.layoutAssignments, {
        showFields: data.showFields || {},
        bannerColor: data.bannerColor,
        websiteName: data.websiteName,
        utmParams: data.utmParams || {}
      });
    } else {
      // Single layout for all items - batch items per page
      const layout = data.layout || 1;
      const itemsPerPage = layout; // 1-up = 1 item, 2-up = 2 items, etc.
      let currentIndex = 0;
      let isFirstPage = true;
      
      while (currentIndex < data.items.length) {
        // Add page break between pages (except for the first page)
        if (!isFirstPage) {
          body.appendPageBreak();
        }
        isFirstPage = false;
        
        // Add page banners
        addPageBanners(body, data.websiteName || 'www.woodslane.com.au', data.bannerColor || '#F7981D');
        
        // Collect items for this page
        const itemsForThisPage = [];
        for (let i = 0; i < itemsPerPage && currentIndex < data.items.length; i++) {
          itemsForThisPage.push(data.items[currentIndex]);
          currentIndex++;
        }
        
        // Create layout based on type
        const options = {
          showFields: data.showFields || {},
          bannerColor: data.bannerColor,
          websiteName: data.websiteName,
          utmParams: data.utmParams || {}
        };
        
        switch(layout) {
          case 1:
            if (itemsForThisPage.length > 0) {
              create1UpLayout(body, itemsForThisPage[0], options.showFields, options.bannerColor, options.websiteName, options.utmParams);
            }
            break;
          case 2:
            create2UpLayout(body, itemsForThisPage, options);
            break;
          case 3:
            create3UpLayout(body, itemsForThisPage, options);
            break;
          case 4:
            create4UpLayout(body, itemsForThisPage, options);
            break;
          case 8:
            create8UpLayout(body, itemsForThisPage, options);
            break;
          default:
            console.warn(`Unknown layout: ${layout}, defaulting to 1-up`);
            if (itemsForThisPage.length > 0) {
              create1UpLayout(body, itemsForThisPage[0], options.showFields, options.bannerColor, options.websiteName, options.utmParams);
            }
        }
        
        // Add footer banner at the end of each page
        addBanner(body, data.websiteName || 'www.woodslane.com.au', data.bannerColor || '#F7981D', false);
      }
    }
    
    // Get document URL
    const documentUrl = doc.getUrl();
    const documentId = doc.getId();
    const documentName = doc.getName();
    
    console.log('Document created successfully:', documentUrl);
    
    return {
      success: true,
      documentId: documentId,
      documentUrl: documentUrl,
      documentName: documentName
    };
    
  } catch (error) {
    console.error('Error creating document:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Handle GET requests (for direct browser access)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      message: 'Google Apps Script is running',
      timestamp: new Date().toISOString(),
      instructions: 'This script is designed to be called via POST requests from the catalogue creator application.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle POST requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = createCatalogueDocument(data);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error in doPost:', error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
