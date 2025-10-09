// Test script to debug HTML output locally
const fs = require('fs');
const path = require('path');

// Mock the layout registry and handlers for testing
const mockLayoutRegistry = {
  getHandler: (layoutType) => {
    if (layoutType === '1-up') {
      return {
        createHtmlExport: (item, index, generateProductUrl, barcodeHtml, bannerColor, websiteName) => {
          return `
        <div class="product-card layout-1up-content">
          <!-- Left Column -->
          <div class="left-column">
            <!-- Book Cover -->
            <div class="book-cover-container">
              <img src="https://cdn.shopify.com/s/files/1/0001/0001/products/hey-warrior.jpg" alt="Hey Warrior" class="book-cover-large">
            </div>
            
            <!-- Author Bio -->
            <div class="author-bio-box">
              <div class="author-bio-title">Author Bio:</div>
              <div class="author-bio-content">Karen Young is a psychologist and founder of heysigmund.com</div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="right-column">
            <!-- Title Section -->
            <div class="title-section">
              <h1 class="product-title-large">
                <a href="https://woodslane.com.au/products/hey-warrior" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">Hey Warrior</a>
              </h1>
              <h2 class="product-subtitle-large">A book for kids about anxiety</h2>
              <div class="product-author-large">By Karen Young</div>
            </div>

            <!-- Description -->
            <div class="product-description-large">
              Kids can do amazing things with the right information. Understanding why anxiety feels the way it does and where the physical symptoms come from is a powerful step in turning anxiety around.
            </div>

            <!-- Product Details Grid -->
            <div class="product-details-grid">
              <div class="detail-item"><strong>Vendor:</strong> HEY SIGMUND</div>
              <div class="detail-item"><strong>Dimensions:</strong> 270 x 210 mm</div>
            </div>

            <!-- Bottom Section -->
            <div class="bottom-section">
              <div class="handle-section">
                <div class="handle-label">Handle (ISBN):</div>
                <div class="handle-value">hey-warrior</div>
              </div>
              <div class="price-section">
                AUD$ 24.99
              </div>
            </div>
          </div>
        </div>
      `;
        }
      };
    }
    return null;
  }
};

// Mock item data
const mockItem = {
  title: "Hey Warrior",
  subtitle: "A book for kids about anxiety",
  author: "Karen Young",
  description: "Kids can do amazing things with the right information. Understanding why anxiety feels the way it does and where the physical symptoms come from is a powerful step in turning anxiety around.",
  vendor: "HEY SIGMUND",
  dimensions: "270 x 210 mm",
  handle: "hey-warrior",
  price: "24.99",
  authorBio: "Karen Young is a psychologist and founder of heysigmund.com",
  imageUrl: "https://cdn.shopify.com/s/files/1/0001/0001/products/hey-warrior.jpg"
};

  // Generate HTML for 1-up layout (completely rewritten)
function generate1UpHtml() {
  const layout = 1;
  const bannerColor = '#F7981D';
  const websiteName = 'www.woodslane.com.au';
  
  // Two column layout: Left (image/bio/internals), Right (details)
  const productsHtml = `
    <div class="product-card layout-1up">
      <!-- Left Column: Image, Author Bio, Internals -->
      <div class="left-column">
        <div class="product-image">
          <img src="https://cdn.shopify.com/s/files/1/0001/0001/products/hey-warrior.jpg" alt="Hey Warrior" class="book-cover">
        </div>
        <div class="author-bio">
          <div class="author-bio-title">Author Bio:</div>
          <div class="author-bio-content">Karen Young is a psychologist and founder of heysigmund.com. She has written three books about anxiety, parenting, and the neurodevelopment of children.</div>
        </div>
        <div class="internals-section">
          <div class="internals-title">Internals:</div>
          <div class="internals-thumbnails">
            <img src="https://cdn.shopify.com/s/files/1/0001/0001/products/hey-warrior.jpg" alt="Internal 1" class="internal-thumbnail">
            <img src="https://cdn.shopify.com/s/files/1/0001/0001/products/hey-warrior.jpg" alt="Internal 2" class="internal-thumbnail">
            <img src="https://cdn.shopify.com/s/files/1/0001/0001/products/hey-warrior.jpg" alt="Internal 3" class="internal-thumbnail">
          </div>
        </div>
      </div>
      
      <!-- Right Column: All Product Details -->
      <div class="right-column">
        <h3 class="product-title">Hey Warrior</h3>
        <p class="product-subtitle">A book for kids about anxiety</p>
        <p class="product-author">By Karen Young</p>
        <p class="product-description">Kids can do amazing things with the right information. Understanding why anxiety feels the way it does and where the physical symptoms come from is a powerful step in turning anxiety around.</p>
        <div class="product-specs">
          <span class="spec-item">HARDBACK</span>
          <span class="spec-item">36 pages</span>
          <span class="spec-item">270 x 210 mm</span>
        </div>
        <div class="product-meta">
          <div class="meta-item"><strong>Publisher:</strong> HEY SIGMUND</div>
          <div class="meta-item"><strong>Release Date:</strong> 10/2020</div>
        </div>
        <div class="product-price">AUD$ 24.99</div>
      </div>
    </div>
  `;
  
  const pageHtml = `<div class="page layout-1up">
    <!-- Header Banner -->
    <div class="page-header banner header-banner" style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px;">
      ${websiteName}
    </div>
    
    <!-- Content Area -->
    <div class="page-content">
      ${productsHtml}
    </div>
    
    <!-- Footer Banner -->
    <div class="page-footer banner footer-banner" style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px;">
      ${websiteName}
    </div>
  </div>`;
  
  return pageHtml;
}

// Generate HTML for 2-up layout for comparison
function generate2UpHtml() {
  const layout = 2;
  const bannerColor = '#F7981D';
  const websiteName = 'www.woodslane.com.au';
  
  // Simple 2-up content
  const productsHtml = `
    <div class="product-card">
      <div class="product-image">
        <img src="https://cdn.shopify.com/s/files/1/0001/0001/products/hey-warrior.jpg" alt="Hey Warrior" class="book-cover">
      </div>
      <div class="product-info">
        <h3 class="product-title">Hey Warrior</h3>
        <p class="product-subtitle">A book for kids about anxiety</p>
        <p class="product-author">By Karen Young</p>
      </div>
    </div>
    <div class="product-card">
      <div class="product-image">
        <img src="https://cdn.shopify.com/s/files/1/0001/0001/products/hey-warrior.jpg" alt="Hey Warrior" class="book-cover">
      </div>
      <div class="product-info">
        <h3 class="product-title">Hey Warrior</h3>
        <p class="product-subtitle">A book for kids about anxiety</p>
        <p class="product-author">By Karen Young</p>
      </div>
    </div>
  `;
  
  const pageHtml = `<div class="page layout-2">
    <!-- Header Banner -->
    <div class="page-header banner header-banner" style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px;">
      ${websiteName}
    </div>
    
    <!-- Content Area -->
    <div class="page-content">
      ${productsHtml}
    </div>
    
    <!-- Footer Banner -->
    <div class="page-footer banner footer-banner" style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px;">
      ${websiteName}
    </div>
  </div>`;
  
  return pageHtml;
}

// Generate complete HTML with CSS
function generateCompleteHtml(layoutHtml, layoutName) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Test ${layoutName} Layout</title>
<style>
  @page { 
    size: A4 portrait; 
    margin: 15mm; 
  }
  
  .page { 
    display: grid;
    grid-template-areas: 
      "header header"
      "content content"
      "footer footer";
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr auto;
    page-break-after: always; 
    padding: 0;
    height: 100vh;
    gap: 10mm;
  }
  
  .page-header {
    grid-area: header;
  }
  
  .page-content {
    grid-area: content;
    display: grid;
    gap: 15mm;
    overflow: hidden;
  }
  
  .page-footer {
    grid-area: footer;
  }
  
  /* 1-up layout inherits from base .page class */
  .product-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 0;
    page-break-inside: avoid;
    max-height: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }
  
  
  .book-cover-large {
    width: 200px;
    height: 300px;
    object-fit: cover;
    border-radius: 8px;
    background: #F8F9FA;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  .product-title-large {
    font-size: 24px;
    font-weight: 700;
    color: #2C3E50;
    margin: 0 0 4px 0;
  }
  
  .product-subtitle-large {
    font-size: 18px;
    font-weight: 500;
    color: #7F8C8D;
    font-style: italic;
    margin: 0 0 8px 0;
  }
  
  .product-author-large {
    font-size: 16px;
    color: #667eea;
    font-weight: 600;
    margin-bottom: 16px;
  }
  
  .page.layout-1up .page-content {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    padding: 20px;
  }
  
  .page.layout-1up .product-card {
    display: flex;
    flex-direction: row;
    gap: 24px;
    max-height: 100%;
    overflow: hidden;
    padding: 20px;
  }
  
  .page.layout-1up .left-column {
    flex-shrink: 0;
    width: 250px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .page.layout-1up .product-image {
    width: 100%;
  }
  
  .page.layout-1up .book-cover {
    width: 100%;
    height: auto;
    max-height: 350px;
    object-fit: contain;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  .page.layout-1up .author-bio {
    background: #E3F2FD;
    padding: 12px;
    border-radius: 6px;
    font-size: 11px;
    line-height: 1.4;
  }
  
  .page.layout-1up .author-bio-title {
    font-weight: 600;
    margin-bottom: 6px;
    color: #1565C0;
  }
  
  .page.layout-1up .author-bio-content {
    color: #333;
  }
  
  .page.layout-1up .internals-section {
    background: #F5F5F5;
    padding: 12px;
    border-radius: 6px;
  }
  
  .page.layout-1up .internals-title {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 11px;
    color: #495057;
  }
  
  .page.layout-1up .internals-thumbnails {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .page.layout-1up .internal-thumbnail {
    width: 35px;
    height: 50px;
    object-fit: cover;
    border-radius: 3px;
    border: 1px solid #DEE2E6;
  }
  
  .page.layout-1up .right-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    overflow: hidden;
  }
  
  .page.layout-1up .product-title {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
    line-height: 1.3;
  }
  
  .page.layout-1up .product-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
    font-style: italic;
  }
  
  .page.layout-1up .product-author {
    font-size: 13px;
    color: #444;
    font-weight: 500;
    margin: 0;
  }
  
  .page.layout-1up .product-description {
    font-size: 12px;
    line-height: 1.5;
    color: #333;
    margin: 0;
    max-height: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .page.layout-2 .page-content {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }
  
  .page.layout-2 .product-card {
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
    max-height: 100%;
    overflow: hidden;
  }
  
  .book-cover {
    width: 120px;
    height: 180px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  .product-title {
    font-size: 16px;
    line-height: 1.3;
    margin-bottom: 6px;
  }
  
  .product-subtitle {
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  .product-author {
    font-size: 12px;
    margin-bottom: 6px;
  }
  
  .author-bio {
    background: #E3F2FD;
    padding: 12px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.4;
    color: #1565C0;
    margin-top: 8px;
  }
  
  .internals-section {
    margin-top: 12px;
  }
  
  .internals-title {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 12px;
    color: #495057;
  }
  
  .internals-thumbnails {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .internal-thumbnail {
    width: 30px;
    height: 45px;
    object-fit: cover;
    border-radius: 3px;
    border: 1px solid #DEE2E6;
  }
  
  .banner {
    page-break-inside: avoid;
  }
  
  @media print {
    .banner {
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
  }
</style>
</head>
<body>
  <div class="noprint">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    <span style="color: #666;">Use A4 paper, 15mm margins, hide headers/footers for best results.</span>
  </div>
  
  ${layoutHtml}
</body>
</html>`;
}

// Generate test files
const html1Up = generate1UpHtml();
const html2Up = generate2UpHtml();

const completeHtml1Up = generateCompleteHtml(html1Up, '1-up');
const completeHtml2Up = generateCompleteHtml(html2Up, '2-up');

// Write test files
fs.writeFileSync('test-1up.html', completeHtml1Up);
fs.writeFileSync('test-2up.html', completeHtml2Up);

console.log('Test files generated:');
console.log('- test-1up.html (1-up layout)');
console.log('- test-2up.html (2-up layout for comparison)');
console.log('');
console.log('Open these files in your browser to see the difference!');
console.log('The 1-up should show horizontal banners, not vertical sidebars.');
