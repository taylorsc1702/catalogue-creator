/**
 * 4-per-page layout handler for Google Apps Script
 */

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

// Create product card for 4-up layout
function createProductCard(cell, item, layout) {
  if (!item) {
    console.warn('No item provided to createProductCard');
    return;
  }
  
  try {
    // Set cell padding
    cell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
    cell.setBackgroundColor('#FFFFFF');
    
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
      // Remove "By " prefix if it already exists to avoid duplication
      if (authorText.toLowerCase().startsWith('by ')) {
        authorText = authorText.substring(3).trim();
      }
      authorText = `By ${authorText}`;
      const author = cell.appendParagraph(authorText);
      styleParagraph(author, t => t.setFontSize(getFontSize('author', layout)).setForegroundColor('#444444'));
      author.setSpacingAfter(3);
    }
    
    // === DESCRIPTION (TRUNCATED FOR PREDICTABLE SIZE) ===
    if (item.description) {
      let descText = item.description;
      
      // Truncate description to 150 chars for 4-up to ensure it fits on page
      const maxChars = 150;
      if (descText.length > maxChars) {
        descText = truncateAtWord(descText, maxChars);
      }
      
      const desc = cell.appendParagraph(descText);
      styleParagraph(desc, t => t.setFontSize(getFontSize('description', layout)).setForegroundColor('#333333'));
      desc.setSpacingAfter(5);
    }
    
    // === PRODUCT DETAILS TABLE (WITH PRICE AND BARCODE) ===
    createProductDetailsTableWithPriceBarcode(cell, item, layout);
    
  } catch (error) {
    console.error('Error in createProductCard:', error.toString());
    // Fallback: create a simple text
    const fallbackText = cell.appendParagraph(`Error creating product card: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(8).setForegroundColor('#FF0000'));
  }
}
