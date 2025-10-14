/**
 * Table creation utilities for Google Apps Script
 */

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

// Create price and barcode table
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
