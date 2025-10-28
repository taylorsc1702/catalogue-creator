import type { NextApiRequest, NextApiResponse } from "next";

type ISBNLookupResponse = {
  success: boolean;
  imageUrl?: string;
  title?: string;
  author?: string;
  error?: string;
};

type ShopifyProduct = {
  title: string;
  vendor: string;
  tags: string[];
  images: Array<{ src: string }>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ISBNLookupResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { isbn } = req.body as { isbn: string };
    
    if (!isbn || !isbn.trim()) {
      return res.status(400).json({ success: false, error: 'ISBN is required' });
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

    if (!shopifyResponse.ok) {
      console.log('Shopify API error:', shopifyResponse.status, shopifyResponse.statusText);
      console.log('Falling back to Open Library API...');
    } else {

    const shopifyData = await shopifyResponse.json();
    const products = shopifyData.products || [];
    console.log(`Found ${products.length} products in Shopify`);

    // Search for products that might contain this ISBN
    // ISBNs can be in tags, title, or other fields
    const matchingProduct = products.find((product: ShopifyProduct) => {
      const searchText = `${product.title} ${product.vendor} ${(product.tags || []).join(' ')}`.toLowerCase();
      const found = searchText.includes(cleanISBN.toLowerCase()) || 
             searchText.includes(isbn.toLowerCase());
      if (found) {
        console.log('Found matching product:', product.title, 'for ISBN:', isbn);
      }
      return found;
    });

    if (matchingProduct && matchingProduct.images && matchingProduct.images.length > 0) {
      return res.status(200).json({
        success: true,
        imageUrl: matchingProduct.images[0].src,
        title: matchingProduct.title,
        author: matchingProduct.vendor
      });
    }

    // If not found in Shopify, try Open Library API as fallback
    try {
      const openLibraryResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`);
      
      if (openLibraryResponse.ok) {
        const openLibraryData = await openLibraryResponse.json();
        const bookData = openLibraryData[`ISBN:${cleanISBN}`];
        
        if (bookData && bookData.cover && bookData.cover.medium) {
          return res.status(200).json({
            success: true,
            imageUrl: bookData.cover.medium,
            title: bookData.title,
            author: bookData.authors?.[0]?.name || 'Unknown Author'
          });
        }
      }
    } catch (openLibraryError) {
      console.log('Open Library lookup failed:', openLibraryError);
    }

    // If no image found anywhere
    return res.status(404).json({
      success: false,
      error: 'No book found with this ISBN'
    });

  } catch (error) {
    console.error('ISBN lookup error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
