/**
 * Simplified Google Apps Script for Catalogue Creator
 * This version removes all potential getChild issues
 */

// Main function to create catalogue document
function createCatalogueDocument(data) {
  try {
    console.log('Creating catalogue document');
    console.log('Data received:', data ? 'Yes' : 'No');
    
    if (!data) {
      throw new Error('No data received');
    }
    
    console.log('Items count:', data.items ? data.items.length : 0);
    
    // Extract parameters
    const {
      items,
      layout = 4,
      title = "Product Catalogue",
      showFields = {},
      bannerColor = '#F7981D',
      websiteName = 'www.woodslane.com.au',
      utmParams = {}
    } = data;
    
    if (!items || items.length === 0) {
      throw new Error('No items provided');
    }
    
    // Create new document
    const doc = DocumentApp.create(title + ' - ' + new Date().toISOString().split('T')[0]);
    const body = doc.getBody();
    
    // Clear default content
    body.clear();
    
    // Set document margins (in points: 72 points = 1 inch)
    body.setMarginTop(72);
    body.setMarginBottom(72);
    body.setMarginLeft(72);
    body.setMarginRight(72);
    
    // Add title
    const titleParagraph = body.appendParagraph(title);
    titleParagraph.setHeading(DocumentApp.ParagraphHeading.TITLE);
    titleParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    titleParagraph.editAsText().setFontSize(18).setBold(true);
    
    // Add subtitle
    const subtitleParagraph = body.appendParagraph(`Generated on ${new Date().toLocaleDateString()}`);
    subtitleParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    subtitleParagraph.editAsText().setFontSize(12).setForegroundColor('#666666');
    
    // Add spacing
    body.appendParagraph('').setSpacingAfter(40);
    
    // Add banner
    addBanner(body, websiteName, bannerColor, true);
    
    // Add products based on layout
    if (layout === 1) {
      // 1-up layout
      if (items[0]) {
        addProduct(body, items[0], showFields);
      }
    } else {
      // Multi-item layout
      items.forEach((item, index) => {
        if (index > 0 && index % layout === 0) {
          body.appendPageBreak();
        }
        addProduct(body, item, showFields);
      });
    }
    
    // Add footer banner
    addBanner(body, websiteName, bannerColor, false);
    
    console.log('Document created successfully:', doc.getUrl());
    
    return {
      success: true,
      documentId: doc.getId(),
      documentUrl: doc.getUrl(),
      documentName: doc.getName()
    };
    
  } catch (error) {
    console.error('Error creating document:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Add banner (header or footer)
function addBanner(body, websiteName, bannerColor, isHeader) {
  const bannerParagraph = body.appendParagraph(websiteName);
  bannerParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  // Style the banner text
  const bannerText = bannerParagraph.editAsText();
  bannerText.setFontSize(12);
  bannerText.setBold(true);
  bannerText.setForegroundColor('#FFFFFF');
  bannerText.setBackgroundColor(bannerColor);
  
  // Add spacing
  if (isHeader) {
    bannerParagraph.setSpacingAfter(20);
  } else {
    bannerParagraph.setSpacingBefore(20);
  }
}

// Add a single product
function addProduct(body, item, showFields) {
  // Product title
  const title = body.appendParagraph(item.title);
  title.editAsText().setFontSize(16).setBold(true);
  title.setSpacingAfter(10);
  
  // Subtitle
  if (item.subtitle) {
    const subtitle = body.appendParagraph(item.subtitle);
    subtitle.editAsText().setFontSize(14).setItalic(true).setForegroundColor('#666666');
    subtitle.setSpacingAfter(10);
  }
  
  // Author
  if (item.author) {
    const author = body.appendParagraph(`By ${item.author}`);
    author.editAsText().setFontSize(12).setForegroundColor('#444444');
    author.setSpacingAfter(10);
  }
  
  // Description
  if (item.description) {
    const description = body.appendParagraph(item.description);
    description.editAsText().setFontSize(11).setForegroundColor('#333333');
    description.setSpacingAfter(10);
  }
  
  // Product details
  if (item.price) {
    const price = body.appendParagraph(`Price: AUD$ ${item.price}`);
    price.editAsText().setFontSize(12).setBold(true).setForegroundColor('#d63384');
    price.setSpacingAfter(5);
  }
  
  if (item.sku) {
    const sku = body.appendParagraph(`SKU: ${item.sku}`);
    sku.editAsText().setFontSize(10).setForegroundColor('#999999');
    sku.setSpacingAfter(10);
  }
  
  // Author Bio
  if (showFields.authorBio && item.authorBio) {
    const bioTitle = body.appendParagraph('Author Bio:');
    bioTitle.editAsText().setBold(true).setFontSize(12).setForegroundColor('#1565C0');
    bioTitle.setSpacingAfter(5);
    
    const bioContent = body.appendParagraph(htmlToPlainText(item.authorBio));
    bioContent.editAsText().setFontSize(11);
    bioContent.setSpacingAfter(15);
  }
  
  // Add spacing between products
  body.appendParagraph('').setSpacingAfter(20);
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

// Web app function to handle HTTP requests
function doPost(e) {
  try {
    console.log('doPost called');
    
    if (!e.postData || !e.postData.contents) {
      throw new Error('No POST data received');
    }
    
    const data = JSON.parse(e.postData.contents);
    console.log('Parsed data successfully');
    
    const result = createCatalogueDocument(data);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('doPost error:', error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function testCreateDocument() {
  const testData = {
    items: [
      {
        title: "Test Book",
        subtitle: "A Test Subtitle",
        author: "Test Author",
        description: "This is a test description for the book.",
        price: "29.99",
        sku: "TEST1234567890",
        authorBio: "<p>This is a test author bio with <strong>HTML formatting</strong>.</p>"
      }
    ],
    layout: 1,
    title: "Test Catalogue",
    showFields: { authorBio: true },
    bannerColor: "#F7981D",
    websiteName: "www.woodslane.com.au"
  };
  
  const result = createCatalogueDocument(testData);
  console.log('Test result:', result);
}
