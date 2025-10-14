/**
 * Shared styling utilities for Google Apps Script
 */

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
