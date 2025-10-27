/**
 * 8-per-page layout handler for Google Apps Script
 */

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

// Create product card for 8-up layout (reuse from 2-up with different layout parameter)
function createProductCard(cell, item, layout) {
  if (!item) {
    console.warn('No item provided to createProductCard');
    return;
  }
  
  try {
    // Set cell padding
    cell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
    cell.setBackgroundColor('#FFFFFF');
    
    // Create a main content table with 2 rows: content and price/barcode
    const mainTable = cell.appendTable([
      [''], // Row 0: Main content (image, title, description, details)
      ['']  // Row 1: Price and barcode (fixed at bottom)
    ]);
    mainTable.setBorderWidth(0);
    
    const contentCell = mainTable.getRow(0).getCell(0);
    const priceBarcodeCell = mainTable.getRow(1).getCell(0);
    
    // Style cells
    contentCell.setBackgroundColor('#FFFFFF');
    priceBarcodeCell.setBackgroundColor('#FFFFFF');
    contentCell.setPaddingTop(0).setPaddingBottom(5).setPaddingLeft(0).setPaddingRight(0);
    priceBarcodeCell.setPaddingTop(5).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(0);
    
    // === MAIN CONTENT SECTION ===
    
    // Image
    if (item.imageUrl) {
      try {
        const imageBlob = UrlFetchApp.fetch(item.imageUrl).getBlob();
        const image = contentCell.appendImage(imageBlob);
        const size = getImageSize('product', layout);
        image.setWidth(size.width);
        image.setHeight(size.height);
        
        // Add spacing after image
        contentCell.appendParagraph('').setSpacingAfter(5);
      } catch (error) {
        console.warn('Could not load image:', item.imageUrl);
      }
    }
    
    // Title
    const title = contentCell.appendParagraph(item.title);
    styleParagraph(title, t => t.setFontSize(getFontSize('title', layout)).setBold(true).setForegroundColor('#000000'));
    title.setSpacingAfter(3);
    
    // Subtitle
    if (item.subtitle) {
      const subtitle = contentCell.appendParagraph(item.subtitle);
      styleParagraph(subtitle, t => t.setFontSize(getFontSize('subtitle', layout)).setItalic(true).setForegroundColor('#666666'));
      subtitle.setSpacingAfter(3);
    }
    
    // Author
    if (item.author) {
      let authorText = item.author;
      // Remove "By " prefix if it already exists to avoid duplication
      if (authorText.toLowerCase().startsWith('by ')) {
        authorText = authorText.substring(3).trim();
      }
      authorText = `By ${authorText}`;
      const author = contentCell.appendParagraph(authorText);
      styleParagraph(author, t => t.setFontSize(getFontSize('author', layout)).setForegroundColor('#444444'));
      author.setSpacingAfter(3);
    }
    
    // Description (let it scale naturally, no artificial truncation)
    if (item.description) {
      const desc = contentCell.appendParagraph(item.description);
      styleParagraph(desc, t => t.setFontSize(getFontSize('description', layout)).setForegroundColor('#333333'));
      desc.setSpacingAfter(5);
    }
    
    // Product Details Table (for 8-per-page and larger layouts)
    if (layout >= 2) {
      createProductDetailsTable(contentCell, item, layout);
    }
    
    // === PRICE/BARCODE SECTION (FIXED AT BOTTOM) ===
    createPriceBarcodeTable(priceBarcodeCell, item, layout);
    
  } catch (error) {
    console.error('Error in createProductCard:', error.toString());
    // Fallback: create a simple text
    const fallbackText = cell.appendParagraph(`Error creating product card: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(8).setForegroundColor('#FF0000'));
  }
}
