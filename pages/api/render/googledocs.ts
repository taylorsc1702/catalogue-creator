import type { NextApiRequest, NextApiResponse } from "next";
import { downloadImageAsBase64 } from "@/lib/image-utils";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

type ItemWithImage = {
  item: Item;
  imageData: {base64: string, width: number, height: number, mimeType: string} | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layout = 4, title = "Product Catalogue", hyperlinkToggle = 'woodslane', bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au' } = req.body as {
      items: Item[]; 
      layout: 1 | 2 | 3 | 4 | 8; 
      title?: string;
      hyperlinkToggle?: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
      bannerColor?: string;
      websiteName?: string;
    };
    
    if (!items?.length) throw new Error("No items provided");

    // Generate the HTML with banner parameters
    const html = await generateGoogleDocsHtml(items, layout, title, hyperlinkToggle, bannerColor, websiteName);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate Google Docs HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

async function generateGoogleDocsHtml(items: Item[], layout: 1 | 2 | 3 | 4 | 8, title: string, hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress', bannerColor: string, websiteName: string) {
  // Download images for all items
  console.log("Downloading images for Google Docs export...");
  const imagePromises = items.map(async (item) => {
      if (item.imageUrl) {
        const imageData = await downloadImageAsBase64(item.imageUrl);
        return { item, imageData };
      }
      return { item, imageData: null };
    });
    
  const itemsWithImages = await Promise.all(imagePromises);
  console.log(`Downloaded ${itemsWithImages.filter(i => i.imageData).length} images successfully`);

  return renderGoogleDocsHtml(itemsWithImages, layout, title, hyperlinkToggle, bannerColor, websiteName);
}

function renderGoogleDocsHtml(
  itemsWithImages: ItemWithImage[], 
  layout: 1 | 2 | 3 | 4 | 8, 
  title: string, 
  hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress',
  bannerColor: string,
  websiteName: string
) {
  const perPage = layout;
  const chunks: ItemWithImage[][] = [];
  for (let i = 0; i < itemsWithImages.length; i += perPage) {
    chunks.push(itemsWithImages.slice(i, i + perPage));
  }

  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const generateProductUrl = (handle: string): string => {
    const baseUrls = {
      woodslane: 'https://woodslane.com.au',
      woodslanehealth: 'https://www.woodslanehealth.com.au',
      woodslaneeducation: 'https://www.woodslaneeducation.com.au',
      woodslanepress: 'https://www.woodslanepress.com.au'
    };
    return `${baseUrls[hyperlinkToggle]}/products/${handle}`;
  };

  const pagesHtml = chunks.map((page, pageIndex) => {
    const createProductCard = (itemWithImage: ItemWithImage, index: number) => {
      const item = itemWithImage.item;
      if (!item) return '<div class="product-card empty"></div>';
      
      // Use image data if available, otherwise fallback to URL
      const imageSrc = itemWithImage.imageData 
        ? itemWithImage.imageData.base64 
        : (item.imageUrl || 'https://via.placeholder.com/120x180?text=No+Image');
      
      return `
        <div class="product-card">
          <div class="product-image">
            <img src="${esc(imageSrc)}" 
                 alt="${esc(item.title)}" 
                 class="book-cover">
          </div>
          <div class="product-details">
            <h2 class="product-title"><a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a></h2>
            ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
            ${item.author ? `<div class="product-author">By ${esc(item.author)}</div>` : ""}
            ${item.description ? `<div class="product-description">${esc(item.description)}</div>` : ""}
            <div class="product-specs">
              ${item.binding ? `<span class="spec-item">${esc(item.binding)}</span>` : ""}
              ${item.pages ? `<span class="spec-item">${esc(item.pages)} pages</span>` : ""}
              ${item.dimensions ? `<span class="spec-item">${esc(item.dimensions)}</span>` : ""}
            </div>
            <div class="product-meta">
              ${item.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(item.imprint)}</div>` : ""}
              ${item.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(item.releaseDate)}</div>` : ""}
              ${item.weight ? `<div class="meta-item"><strong>Weight:</strong> ${esc(item.weight)}</div>` : ""}
              ${item.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(item.illustrations)}</div>` : ""}
            </div>
            ${item.price ? `<div class="product-price">AUD$ ${esc(item.price)}</div>` : ""}
            <div class="product-isbn">ISBN: ${esc(item.handle)}</div>
          </div>
        </div>
      `;
    };

    // Create product slots based on layout
    let productsHtml = '';
    
    if (layout === 2) {
      // 2-per-page: only 2 products
      const product1 = createProductCard(page[0], 0);
      const product2 = createProductCard(page[1], 1);
      productsHtml = `${product1}${product2}`;
    } else {
      // 4-per-page: 4 products
      const product1 = createProductCard(page[0], 0);
      const product2 = createProductCard(page[1], 1);
      const product3 = createProductCard(page[2], 2);
      const product4 = createProductCard(page[3], 3);
      productsHtml = `${product1}${product2}${product3}${product4}`;
    }

    return `<div class="page">
      <!-- Header Banner -->
      <div style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8pt 0; font-weight: bold; font-size: 12pt; margin-bottom: 20pt;">
        ${esc(websiteName)}
      </div>
      ${productsHtml}
      <!-- Footer Banner -->
      <div style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8pt 0; font-weight: bold; font-size: 12pt; margin-top: 40pt;">
        ${esc(websiteName)}
      </div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)} - Google Docs Import</title>
  <style>
    /* Google Docs import optimized styles */
    body {
      font-family: 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000000;
      background: white;
      margin: 0;
      padding: 20px;
      max-width: 8.5in;
      margin: 0 auto;
    }
    
    .catalogue-title {
      font-size: 18pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 20pt;
      color: #1a1a1a;
    }
    
    .catalogue-subtitle {
      font-size: 12pt;
      text-align: center;
      margin-bottom: 30pt;
      color: #666666;
    }
    
    .page {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 20pt;
      margin-bottom: 40pt;
      page-break-after: always;
      min-height: 10in;
    }
    
    .page.layout-2 {
      grid-template-rows: 1fr;
      gap: 30pt;
    }
    
    .product-card {
      display: flex;
      gap: 12pt;
      border: 1pt solid #e0e0e0;
      padding: 12pt;
      background: white;
      page-break-inside: avoid;
    }
    
    .product-card.empty {
      visibility: hidden;
    }
    
    .product-image {
      flex-shrink: 0;
      width: 80pt;
    }
    
    .book-cover {
      width: 80pt;
      height: 120pt;
      object-fit: cover;
      border: 1pt solid #cccccc;
    }
    
    .product-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6pt;
    }
    
    .product-title {
      font-size: 12pt;
      font-weight: bold;
      color: #000000;
      margin: 0 0 4pt 0;
      line-height: 1.2;
    }
    
    .product-subtitle {
      font-size: 10pt;
      color: #666666;
      font-style: italic;
      margin: 0 0 4pt 0;
    }
    
    .product-author {
      font-size: 10pt;
      color: #000000;
      font-weight: 500;
      margin: 0 0 6pt 0;
    }
    
    .product-description {
      font-size: 9pt;
      color: #333333;
      line-height: 1.3;
      margin: 0 0 8pt 0;
      text-align: justify;
    }
    
    .product-specs {
      display: flex;
      flex-wrap: wrap;
      gap: 8pt;
      margin: 0 0 6pt 0;
    }
    
    .spec-item {
      font-size: 8pt;
      color: #666666;
      background: #f5f5f5;
      padding: 2pt 6pt;
      border-radius: 3pt;
    }
    
    .product-meta {
      margin: 0 0 8pt 0;
    }
    
    .meta-item {
      font-size: 8pt;
      color: #666666;
      margin: 0 0 2pt 0;
    }
    
    .product-price {
      font-size: 11pt;
      font-weight: bold;
      color: #d63384;
      margin: 0 0 4pt 0;
    }
    
    .product-isbn {
      font-size: 8pt;
      color: #999999;
      font-family: 'Courier New', monospace;
    }
    
    /* Print optimizations */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      .page {
        page-break-after: always;
        margin-bottom: 0;
      }
      
      .product-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="catalogue-title">${esc(title)}</div>
  <div class="catalogue-subtitle">Generated on ${new Date().toLocaleDateString()}</div>
  
  ${pagesHtml}
  
  <div style="text-align: center; margin-top: 20pt; font-size: 9pt; color: #999999;">
    <p>This document was generated by Catalogue Creator</p>
    <p>To import into Google Docs: File → Import → Upload → Select this file</p>
  </div>
</body>
</html>`;
}
