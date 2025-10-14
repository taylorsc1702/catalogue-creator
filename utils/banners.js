/**
 * Banner utilities for Google Apps Script
 */

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
