/**
 * Mixed layout handler for Google Apps Script
 * Handles combinations of different layout types (1-up, 2-up, 3-up, 4-up, 8-up)
 */

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
    
    while (currentIndex < items.length) {
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
      
      // Add page break between different layout types (except for the last page)
      if (currentIndex < items.length) {
        body.appendPageBreak();
      }
    }
    
  } catch (error) {
    console.error('Error in createMixedLayout:', error.toString());
    // Fallback: create a simple text
    const fallbackText = body.appendParagraph(`Error creating mixed layout: ${error.message}`);
    styleParagraph(fallbackText, t => t.setFontSize(12).setForegroundColor('#FF0000'));
  }
}
