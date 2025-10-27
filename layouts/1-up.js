/**
 * 1-per-page layout handler for Google Apps Script
 */

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
      // Remove "By " prefix if it already exists to avoid duplication
      if (authorText.toLowerCase().startsWith('by ')) {
        authorText = authorText.substring(3).trim();
      }
      authorText = `By ${authorText}`;
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
