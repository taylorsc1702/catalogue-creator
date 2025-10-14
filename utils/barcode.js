/**
 * Barcode generation utilities for Google Apps Script
 */

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
