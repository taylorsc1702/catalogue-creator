import { Item } from './product-card-renderer';

export type CoverData = {
  showFrontCover: boolean;
  showBackCover: boolean;
  frontCoverText1: string;
  frontCoverText2: string;
  backCoverText1: string;
  backCoverText2: string;
  coverImageUrls: string[]; // New: Direct image URLs instead of ISBNs
  hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
  bannerColor: string;
  websiteName: string;
  catalogueName: string;
};

export type ISBNLookupResult = {
  success: boolean;
  imageUrl?: string;
  title?: string;
  author?: string;
  error?: string;
};

// Logo URLs for different brands
export const getLogoUrl = (brand: string): string => {
  const logos = {
    woodslane: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/woodslane-square-logo-transparent_a9785ae1-b798-4ab4-963d-89a4fc3f3fdb.png?v=1755213158',
    woodslanehealth: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/WoodslaneHealth-logo-square_50093948-c033-48aa-8274-694237479a8a.jpg?v=1761655710',
    woodslaneeducation: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/WoodslaneEducation-logos-square_60e40eef-f666-4f6a-a8e0-f07efca5a9dd.jpg?v=1761655806',
    woodslanepress: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/woodslane_PRESS_logo_duo_1.jpg?v=1718778690'
  };
  return logos[brand as keyof typeof logos] || logos.woodslane;
};

// Server-side ISBN lookup (direct implementation)
export async function lookupISBN(isbn: string): Promise<ISBNLookupResult> {
  try {
    console.log('Looking up ISBN:', isbn);
    
    if (!isbn || !isbn.trim()) {
      return { success: false, error: 'ISBN is required' };
    }

    // Clean the ISBN (remove spaces, hyphens, etc.)
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    // Try to find the book in Shopify by ISBN
    const shopifyResponse = await fetch(`https://woodslane.myshopify.com/admin/api/2023-10/products.json?limit=250&fields=id,title,vendor,images,handle,tags`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
        'Content-Type': 'application/json',
      },
    });

    if (shopifyResponse.ok) {
      const shopifyData = await shopifyResponse.json();
      const products = shopifyData.products || [];
      console.log(`Found ${products.length} products in Shopify`);

      // Search for products that might contain this ISBN
      const matchingProduct = products.find((product: any) => {
        const searchText = `${product.title} ${product.vendor} ${(product.tags || []).join(' ')}`.toLowerCase();
        const found = searchText.includes(cleanISBN.toLowerCase()) || 
               searchText.includes(isbn.toLowerCase());
        if (found) {
          console.log('Found matching product:', product.title, 'for ISBN:', isbn);
        }
        return found;
      });

      if (matchingProduct && matchingProduct.images && matchingProduct.images.length > 0) {
        return {
          success: true,
          imageUrl: matchingProduct.images[0].src,
          title: matchingProduct.title,
          author: matchingProduct.vendor
        };
      }
    } else {
      console.log('Shopify API error:', shopifyResponse.status, shopifyResponse.statusText);
      console.log('Falling back to Open Library API...');
    }

    // If not found in Shopify, try Open Library API as fallback
    try {
      const openLibraryResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`);
      
      if (openLibraryResponse.ok) {
        const openLibraryData = await openLibraryResponse.json();
        const bookData = openLibraryData[`ISBN:${cleanISBN}`];
        
        if (bookData && bookData.cover && bookData.cover.medium) {
          return {
            success: true,
            imageUrl: bookData.cover.medium,
            title: bookData.title,
            author: bookData.authors?.[0]?.name || 'Unknown Author'
          };
        }
      }
    } catch (openLibraryError) {
      console.log('Open Library lookup failed:', openLibraryError);
    }

    // If no image found anywhere
    return {
      success: false,
      error: 'No book found with this ISBN'
    };
  } catch (error) {
    console.error('ISBN lookup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };
  }
}

// Generate front cover HTML
export function generateFrontCoverHTML(coverData: CoverData, isbnResults: ISBNLookupResult[]): string {
  if (!coverData.showFrontCover) return '';

  console.log('Generating front cover with ISBN results:', isbnResults);
  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const logoUrl = getLogoUrl(coverData.hyperlinkToggle);
  
  // Generate featured book images
  const featuredBooks = isbnResults.slice(0, 4).map((result, index) => {
    console.log(`Processing ISBN ${index + 1}:`, result);
    if (result.success && result.imageUrl) {
      return `<img src="${esc(result.imageUrl)}" alt="${esc(result.title || 'Book')}" class="featured-book-image" />`;
    } else {
      return `<div class="featured-book-placeholder">ISBN ${index + 1}</div>`;
    }
  }).join('');

  return `
    <div class="cover-page front-cover">
      <div class="cover-header">
        <div class="cover-logo">
          <img src="${esc(logoUrl)}" alt="Logo" class="logo-image" />
        </div>
        <div class="cover-text-content">
          ${coverData.frontCoverText1 ? `<div class="cover-text-1">${esc(coverData.frontCoverText1)}</div>` : ''}
          ${coverData.frontCoverText2 ? `<div class="cover-text-2">${esc(coverData.frontCoverText2)}</div>` : ''}
        </div>
      </div>
      
      <div class="cover-title">
        <h1>${esc(coverData.catalogueName || 'Product Catalogue')}</h1>
      </div>
      
      <div class="cover-featured-books">
        <div class="featured-books-grid">
          ${featuredBooks}
        </div>
      </div>
      
      <div class="cover-footer" style="background-color: ${coverData.bannerColor};">
        <div class="footer-content">
          <div class="website-url">${esc(coverData.websiteName)}</div>
          <div class="contact-info">
            <div class="phone">Phone: (02) 8445 2300</div>
            <div class="email">Email: Info@woodslane.com.au</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Generate back cover HTML
export function generateBackCoverHTML(coverData: CoverData, isbnResults: ISBNLookupResult[]): string {
  if (!coverData.showBackCover) return '';

  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const logoUrl = getLogoUrl(coverData.hyperlinkToggle);
  
  // Generate featured book images
  const featuredBooks = isbnResults.slice(0, 4).map((result, index) => {
    if (result.success && result.imageUrl) {
      return `<img src="${esc(result.imageUrl)}" alt="${esc(result.title || 'Book')}" class="featured-book-image" />`;
    } else {
      return `<div class="featured-book-placeholder">ISBN ${index + 1}</div>`;
    }
  }).join('');

  return `
    <div class="cover-page back-cover">
      <div class="cover-header">
        <div class="cover-logo">
          <img src="${esc(logoUrl)}" alt="Logo" class="logo-image" />
        </div>
        <div class="cover-text-content">
          ${coverData.backCoverText1 ? `<div class="cover-text-1">${esc(coverData.backCoverText1)}</div>` : ''}
          ${coverData.backCoverText2 ? `<div class="cover-text-2">${esc(coverData.backCoverText2)}</div>` : ''}
        </div>
      </div>
      
      <div class="cover-title">
        <h1>${esc(coverData.catalogueName || 'Product Catalogue')}</h1>
      </div>
      
      <div class="cover-featured-books">
        <div class="featured-books-grid">
          ${featuredBooks}
        </div>
      </div>
      
      <div class="cover-footer" style="background-color: ${coverData.bannerColor};">
        <div class="footer-content">
          <div class="website-url">${esc(coverData.websiteName)}</div>
          <div class="contact-info">
            <div class="phone">Phone: (02) 8445 2300</div>
            <div class="email">Email: Info@woodslane.com.au</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Generate cover CSS
export function generateCoverCSS(): string {
  return `
    @page { 
      size: A4 portrait; 
      margin: 20mm 15mm 20mm 15mm; 
    }
    
    * { 
      box-sizing: border-box; 
      margin: 0;
      padding: 0;
    }
    
    body { 
      font-family: 'Calibri', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      color: #333;
      line-height: 1.4;
      background: white;
      font-size: 12px;
    }
    
    /* Force portrait orientation in browser display */
    @media screen {
      .cover-page { 
        width: 210mm;  /* A4 portrait width */
        min-height: 297mm;  /* A4 portrait height */
        margin: 0 auto;  /* Center the page */
        box-shadow: 0 0 10px rgba(0,0,0,0.1);  /* Add subtle shadow for visual separation */
      }
      
      body {
        padding: 20px 0;  /* Add vertical padding for centered pages */
        background: #f5f5f5;  /* Light gray background to show page boundaries */
      }
    }
    
    .cover-page {
      width: 100%;
      max-width: 8.5in;
      min-height: 11in;
      max-height: 11in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 15px;
      box-sizing: border-box;
      page-break-after: always;
      background: white;
      overflow: hidden;
      margin: 0 auto;
    }
    
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      flex-shrink: 0;
    }
    
    .cover-logo {
      flex-shrink: 0;
      max-width: 120px;
      max-height: 120px;
    }
    
    .logo-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .cover-text-content {
      flex: 1;
      margin-right: 0;
      margin-left: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-align: right;
    }
    
    .cover-text-1, .cover-text-2 {
      font-size: 14px;
      line-height: 1.3;
      color: #333;
      font-family: 'Calibri', sans-serif;
    }
    
    .cover-text-1 {
      font-size: 18px;
      font-weight: 600;
    }
    
    .cover-text-2 {
      font-size: 16px;
      font-weight: 400;
    }
    
    .cover-title {
      text-align: center;
      margin: 0 0 15px 0;
      flex-shrink: 0;
    }
    
    .cover-title h1 {
      font-size: 28px;
      font-weight: bold;
      color: #333;
      margin: 0;
      font-family: 'Calibri', sans-serif;
    }
    
    .cover-featured-books {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }
    
    .featured-books-grid {
      display: grid;
      gap: 10px;
      max-width: 250px;
      max-height: 250px;
      width: 100%;
      height: 100%;
    }
    
    /* Dynamic grid layouts based on number of images */
    .featured-books-grid.single-image {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
      max-width: 400px;
      max-height: 600px;
    }
    
    .featured-books-grid.two-images {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr;
      max-width: 450px;
      max-height: 300px;
    }
    
    .featured-books-grid.three-images {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      max-width: 250px;
      max-height: 250px;
    }
    
    .featured-books-grid.three-images .featured-book-image:nth-child(3),
    .featured-books-grid.three-images .featured-book-placeholder:nth-child(3) {
      grid-column: 1 / -1;
      justify-self: center;
      max-width: 60%;
    }
    
    .featured-books-grid.four-images {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      max-width: 250px;
      max-height: 250px;
    }
    
    .featured-book-image {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .featured-book-placeholder {
      width: 100%;
      height: 100%;
      border: 1px dashed #ccc;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9f9f9;
      color: #666;
      font-size: 10px;
      font-family: 'Calibri', sans-serif;
    }
    
    .cover-footer {
      padding: 6px 10px;
      border-radius: 4px;
      color: white;
      flex-shrink: 0;
    }
    
    .footer-content {
      text-align: center;
    }
    
    .website-url {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 3px;
      font-family: 'Calibri', sans-serif;
      line-height: 1.2;
    }
    
    .contact-info {
      font-size: 9px;
      font-family: 'Calibri', sans-serif;
      line-height: 1.2;
    }
    
    .phone, .email {
      margin-bottom: 2px;
    }
    
    /* Print-specific styles */
    @media print {
      .cover-page {
        page-break-after: always;
        page-break-inside: avoid;
        width: 8.5in;
        height: 11in;
        max-width: 8.5in;
        max-height: 11in;
        overflow: hidden;
        margin: 0;
        padding: 15px;
      }
      
      .cover-header {
        margin-bottom: 15px;
      }
      
      .cover-logo {
        max-width: 120px;
        max-height: 120px;
      }
      
      .cover-text-1 {
        font-size: 18px;
      }
      
      .cover-text-2 {
        font-size: 16px;
      }
      
      .cover-title h1 {
        font-size: 28px;
      }
      
      .featured-books-grid {
        max-width: 250px;
        max-height: 250px;
        gap: 10px;
      }
      
      .featured-books-grid.single-image {
        max-width: 360px;
        max-height: 560px;
      }
      
      .featured-books-grid.two-images {
        max-width: 420px;
        max-height: 270px;
      }
      
      .featured-books-grid.three-images {
        max-width: 220px;
        max-height: 220px;
      }
      
      .featured-books-grid.four-images {
        max-width: 220px;
        max-height: 220px;
      }
      
      .cover-footer {
        padding: 6px 10px;
      }
      
      .website-url {
        font-size: 12px;
      }
      
      .contact-info {
        font-size: 9px;
      }
    }
  `;
}

// Generate cover HTML based on number of images (1, 2, 3, or 4)
// This function is used for BOTH front and back covers - they share the same logic:
// - URL-based images with dynamic layouts (single-image, two-images, three-images, four-images)
// - Increased sizes: 100% larger for 1 image, 50% larger for 2 images
// - Right-aligned text positioning
// - Same CSS styling and grid layouts
export function generateCoverHTML(data: CoverData): string {
  const { coverImageUrls, frontCoverText1, frontCoverText2, catalogueName, bannerColor, websiteName } = data;
  
  if (!coverImageUrls || coverImageUrls.length === 0) {
    return '';
  }
  
  const imageCount = coverImageUrls.length;
  const logoUrl = getLogoUrl(data.hyperlinkToggle);
  
  // Generate featured book images - only create containers for valid URLs
  const validUrls = coverImageUrls.filter(url => url && url.trim());
  const featuredBooks = validUrls.map((url, index) => {
    return `<img src="${url}" alt="Cover Image ${index + 1}" class="featured-book-image" />`;
  }).join('');
  
  // Determine grid class based on number of valid images
  const validImageCount = validUrls.length;
  let gridClass = 'four-images'; // default
  
  switch (validImageCount) {
    case 1:
      gridClass = 'single-image';
      break;
    case 2:
      gridClass = 'two-images';
      break;
    case 3:
      gridClass = 'three-images';
      break;
    case 4:
    default:
      gridClass = 'four-images';
      break;
  }
  
  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  
  return `
    <div class="cover-page">
      <div class="cover-header">
        <div class="cover-logo">
          <img src="${esc(logoUrl)}" alt="Logo" class="logo-image" />
        </div>
        <div class="cover-text-content">
          ${frontCoverText1 ? `<div class="cover-text-1">${esc(frontCoverText1)}</div>` : ''}
          ${frontCoverText2 ? `<div class="cover-text-2">${esc(frontCoverText2)}</div>` : ''}
        </div>
      </div>
      
      <div class="cover-title">
        <h1>${esc(catalogueName || 'Product Catalogue')}</h1>
      </div>
      
      <div class="cover-featured-books">
        <div class="featured-books-grid ${gridClass}">
          ${featuredBooks}
        </div>
      </div>
      
      <div class="cover-footer" style="background-color: ${bannerColor};">
        <div class="footer-content">
          <div class="website-url">${esc(websiteName)}</div>
          <div class="contact-info">
            <div class="phone">Phone: (02) 8445 2300</div>
            <div class="email">Email: Info@woodslane.com.au</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
