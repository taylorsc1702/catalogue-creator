/**
 * Main router for Google Apps Script layout handlers
 * This file orchestrates the creation of Google Docs with different layouts
 */

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
    
    // Add banners for each page
    data.items.forEach((item, index) => {
      if (index > 0) {
        body.appendPageBreak();
      }
      
      // Add page banners
      addPageBanners(body, data.websiteName || 'www.woodslane.com.au', data.bannerColor || '#F7981D');
      
      // Create layout based on type
      if (data.layoutAssignments && data.layoutAssignments.length > 0) {
        // Mixed layout
        createMixedLayout(body, [item], [data.layoutAssignments[index] || 1], {
          showFields: data.showFields || {},
          bannerColor: data.bannerColor,
          websiteName: data.websiteName,
          utmParams: data.utmParams || {}
        });
      } else {
        // Single layout for all items
        const layout = data.layout || 1;
        switch(layout) {
          case 1:
            create1UpLayout(body, item, data.showFields || {}, data.bannerColor, data.websiteName, data.utmParams || {});
            break;
          case 2:
            create2UpLayout(body, [item], {
              showFields: data.showFields || {},
              bannerColor: data.bannerColor,
              websiteName: data.websiteName,
              utmParams: data.utmParams || {}
            });
            break;
          case 3:
            create3UpLayout(body, [item], {
              showFields: data.showFields || {},
              bannerColor: data.bannerColor,
              websiteName: data.websiteName,
              utmParams: data.utmParams || {}
            });
            break;
          case 4:
            create4UpLayout(body, [item], {
              showFields: data.showFields || {},
              bannerColor: data.bannerColor,
              websiteName: data.websiteName,
              utmParams: data.utmParams || {}
            });
            break;
          case 8:
            create8UpLayout(body, [item], {
              showFields: data.showFields || {},
              bannerColor: data.bannerColor,
              websiteName: data.websiteName,
              utmParams: data.utmParams || {}
            });
            break;
          default:
            console.warn(`Unknown layout: ${layout}, defaulting to 1-up`);
            create1UpLayout(body, item, data.showFields || {}, data.bannerColor, data.websiteName, data.utmParams || {});
        }
      }
      
      // Add footer banner at the end of each page
      addBanner(body, data.websiteName || 'www.woodslane.com.au', data.bannerColor || '#F7981D', false);
    });
    
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
