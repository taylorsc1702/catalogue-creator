import { Item } from './product-card-renderer';

export type CoverData = {
  showFrontCover: boolean;
  showBackCover: boolean;
  frontCoverText1: string;
  frontCoverText2: string;
  backCoverText1: string;
  backCoverText2: string;
  frontCoverIsbns: string[];
  backCoverIsbns: string[];
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
    .cover-page {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px;
      box-sizing: border-box;
      page-break-after: always;
      background: white;
    }
    
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    
    .cover-logo {
      flex-shrink: 0;
    }
    
    .logo-image {
      max-width: 200px;
      max-height: 200px;
      object-fit: contain;
    }
    
    .cover-text-content {
      flex: 1;
      margin-left: 40px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .cover-text-1, .cover-text-2 {
      font-size: 18px;
      line-height: 1.6;
      color: #333;
      font-family: 'Calibri', sans-serif;
    }
    
    .cover-text-1 {
      font-size: 26px;
      font-weight: 600;
    }
    
    .cover-text-2 {
      font-size: 20px;
      font-weight: 400;
    }
    
    .cover-title {
      text-align: center;
      margin: 40px 0;
    }
    
    .cover-title h1 {
      font-size: 48px;
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
    }
    
    .featured-books-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 30px;
      max-width: 400px;
    }
    
    .featured-book-image {
      width: 100%;
      height: 200px;
      object-fit: contain;
      border: 2px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .featured-book-placeholder {
      width: 100%;
      height: 200px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9f9f9;
      color: #666;
      font-size: 14px;
      font-family: 'Calibri', sans-serif;
    }
    
    .cover-footer {
      padding: 20px;
      border-radius: 8px;
      color: white;
    }
    
    .footer-content {
      text-align: center;
    }
    
    .website-url {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
      font-family: 'Calibri', sans-serif;
    }
    
    .contact-info {
      font-size: 16px;
      font-family: 'Calibri', sans-serif;
    }
    
    .phone, .email {
      margin-bottom: 5px;
    }
    
    @media print {
      .cover-page {
        page-break-after: always;
        height: 100vh;
      }
    }
  `;
}
