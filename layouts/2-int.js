/**
 * 2-per-page layout handler with internal image for Google Apps Script
 */

// Create 2-int layout (1 row, 2 columns with internal image above barcode)
function create2IntLayout(body, items, options) {
  if (!items || items.length === 0) {
    console.warn('No items provided to create2IntLayout');
    return;
  }
  
  try {
    // Create a 1x2 grid table
    const table = body.appendTable([['', '']]); // 1 row, 2 columns
    table.setBorderWidth(0);
    
    // Fill the grid with items (up to 2 items)
    for (let c = 0; c < 2; c++) {
      const cell = table.getRow(0).getCell(c);
      if (c < items.length) {
        createProductCardWithInternal(cell, items[c], 2);
      }
    }
    
  } catch (error) {
    console.error('Error in create2IntLayout:', error.toString());
    // Fallback: create a simple text
    const fallbackText = body.appendParagraph(`Error creating 2-int layout: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(12).setForegroundColor('#FF0000'));
  }
}

// Create product card for 2-int layout with internal image above barcode
function createProductCardWithInternal(cell, item, layout) {
  if (!item) {
    console.warn('No item provided to createProductCardWithInternal');
    return;
  }
  
  try {
    // Set cell padding
    cell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
    cell.setBackgroundColor('#FFFFFF');
    
    // Create a main content table with 3 rows: content, internal image, and price/barcode
    const mainTable = cell.appendTable([
      [''], // Row 0: Main content (image, title, description, details)
      [''], // Row 1: Internal image (if available)
      ['']  // Row 2: Price and barcode (fixed at bottom)
    ]);
    mainTable.setBorderWidth(0);
    
    const contentCell = mainTable.getRow(0).getCell(0);
    const internalImageCell = mainTable.getRow(1).getCell(0);
    const priceBarcodeCell = mainTable.getRow(2).getCell(0);
    
    // Style cells
    contentCell.setBackgroundColor('#FFFFFF');
    internalImageCell.setBackgroundColor('#FFFFFF');
    priceBarcodeCell.setBackgroundColor('#FFFFFF');
    contentCell.setPaddingTop(0).setPaddingBottom(5).setPaddingLeft(0).setPaddingRight(0);
    internalImageCell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(0).setPaddingRight(0);
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
    
    // Product Details Table (for 2-per-page and larger layouts)
    if (layout >= 2) {
      createProductDetailsTable(contentCell, item, layout);
    }
    
    // === INTERNAL IMAGES SECTION (up to 2 images side by side) ===
    if (item.additionalImages && item.additionalImages.length > 0) {
      try {
        // Create a table to display two images side by side
        const internalImagesTable = internalImageCell.appendTable();
        internalImagesTable.setBorderWidth(0);
        
        const internalRow = internalImagesTable.appendTableRow();
        
        // Add up to 2 internal images
        const imagesToShow = item.additionalImages.slice(0, 2);
        imagesToShow.forEach((imageUrl, index) => {
          const internalCell = internalRow.appendTableCell();
          internalCell.setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
          internalCell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(2).setPaddingRight(2);
          
          try {
            const internalImageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
            const internalImage = internalCell.appendImage(internalImageBlob);
            
            // Set internal image size (smaller than main image)
            const internalSize = getImageSize('internal', layout);
            internalImage.setWidth(internalSize.width);
            internalImage.setHeight(internalSize.height);
            
            // Center the internal image
            const internalImageParagraph = internalCell.getChild(0);
            if (internalImageParagraph && internalImageParagraph.getType() === DocumentApp.ElementType.PARAGRAPH) {
              internalImageParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
            }
          } catch (error) {
            console.warn('Could not load internal image:', imageUrl);
            // Add placeholder text
            const placeholder = internalCell.appendParagraph('[Internal Image]');
            styleParagraph(placeholder, t => t.setFontSize(8).setItalic(true).setForegroundColor('#999999'));
            placeholder.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          }
        });
        
        // Add spacing after internal images
        internalImageCell.appendParagraph('').setSpacingAfter(3);
      } catch (error) {
        console.warn('Could not create internal images table:', error);
        // Fallback: add placeholder text
        const placeholder = internalImageCell.appendParagraph('[Internal Images]');
        styleParagraph(placeholder, t => t.setFontSize(8).setItalic(true).setForegroundColor('#999999'));
        placeholder.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
    
    // === PRICE/BARCODE SECTION (FIXED AT BOTTOM) ===
    createPriceBarcodeTable(priceBarcodeCell, item, layout);
    
  } catch (error) {
    console.error('Error in createProductCardWithInternal:', error.toString());
    // Fallback: create a simple text
    const fallbackText = cell.appendParagraph(`Error creating product card: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(8).setForegroundColor('#FF0000'));
  }
}

// Helper function to get internal image size
function getInternalImageSize(layout) {
  const sizes = {
    2: { width: 60, height: 80 },   // 2-int layout
    3: { width: 45, height: 60 },   // 3-int layout (if needed)
    4: { width: 35, height: 47 },   // 4-int layout (if needed)
    8: { width: 20, height: 27 }    // 8-int layout (if needed)
  };
  return sizes[layout] || sizes[2];
}
