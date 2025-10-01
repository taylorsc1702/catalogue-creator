import type { NextApiRequest, NextApiResponse } from "next";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

const SITE = process.env.SITE_BASE_URL || "https://b27202-c3.myshopify.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layout = 4, showFields, hyperlinkToggle = 'woodslane' } = req.body as {
      items: Item[]; 
      layout: 1 | 2 | 3 | 4 | 8; 
      showFields?: Record<string, boolean>;
      hyperlinkToggle?: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
    };
    if (!items?.length) throw new Error("No items provided");
    const html = renderHtml(items, layout, showFields || {}, hyperlinkToggle);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

function renderHtml(items: Item[], layout: 1 | 2 | 3 | 4 | 8, show: Record<string, boolean>, hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress') {
  const cols = layout === 1 ? "1fr" : layout === 2 ? "1fr 1fr" : layout === 3 ? "1fr 1fr 1fr" : layout === 4 ? "1fr 1fr" : "1fr 1fr 1fr 1fr";
  const perPage = layout;

  const generateProductUrl = (handle: string): string => {
    const baseUrls = {
      woodslane: 'https://woodslane.com.au',
      woodslanehealth: 'https://www.woodslanehealth.com.au',
      woodslaneeducation: 'https://www.woodslaneeducation.com.au',
      woodslanepress: 'https://www.woodslanepress.com.au'
    };
    return `${baseUrls[hyperlinkToggle]}/products/${handle}`;
  };

  const chunks: Item[][] = [];
  for (let i = 0; i < items.length; i += perPage) chunks.push(items.slice(i, i + perPage));

  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const pagesHtml = chunks.map(page => {
    const createProductCard = (it: Item) => {
      return [
        '<div class="product-card">',
          '<div class="product-image">',
            `<img src="${esc(it.imageUrl)}" alt="${esc(it.title)}" class="book-cover">`,
          '</div>',
          '<div class="product-details">',
            `<h2 class="product-title"><a href="${generateProductUrl(it.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(it.title)}</a></h2>`,
            it.subtitle ? `<div class="product-subtitle">${esc(it.subtitle)}</div>` : "",
            it.author ? `<div class="product-author">By ${esc(it.author)}</div>` : "",
            it.description ? `<div class="product-description">${esc(it.description)}</div>` : "",
            '<div class="product-specs">',
              it.binding ? `<span class="spec-item">${esc(it.binding)}</span>` : "",
              it.pages ? `<span class="spec-item">${esc(it.pages)} pages</span>` : "",
              it.dimensions ? `<span class="spec-item">${esc(it.dimensions)}</span>` : "",
            '</div>',
            '<div class="product-meta">',
              it.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(it.imprint)}</div>` : "",
              it.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(it.releaseDate)}</div>` : "",
              it.weight ? `<div class="meta-item"><strong>Weight:</strong> ${esc(it.weight)}</div>` : "",
              it.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(it.illustrations)}</div>` : "",
            '</div>',
            it.price ? `<div class="product-price">AUD$ ${esc(it.price)}</div>` : "",
            `<div class="product-isbn">ISBN: ${esc(it.handle)}</div>`,
            show.authorBio && it.authorBio ? `<div class="author-bio">${esc(it.authorBio)}</div>` : "",
          '</div>',
        '</div>',
      ].join("");
    };

    // Create product slots based on layout
    let productsHtml = '';
    
    if (layout === 2) {
      // 2-per-page: only 2 products
      const product1 = page[0] ? createProductCard(page[0]) : '<div class="product-card empty"></div>';
      const product2 = page[1] ? createProductCard(page[1]) : '<div class="product-card empty"></div>';
      productsHtml = `${product1}${product2}`;
    } else if (layout === 3) {
      // 3-per-page: 3 products
      const product1 = page[0] ? createProductCard(page[0]) : '<div class="product-card empty"></div>';
      const product2 = page[1] ? createProductCard(page[1]) : '<div class="product-card empty"></div>';
      const product3 = page[2] ? createProductCard(page[2]) : '<div class="product-card empty"></div>';
      productsHtml = `${product1}${product2}${product3}`;
    } else {
      // 4-per-page: 4 products
      const product1 = page[0] ? createProductCard(page[0]) : '<div class="product-card empty"></div>';
      const product2 = page[1] ? createProductCard(page[1]) : '<div class="product-card empty"></div>';
      const product3 = page[2] ? createProductCard(page[2]) : '<div class="product-card empty"></div>';
      const product4 = page[3] ? createProductCard(page[3]) : '<div class="product-card empty"></div>';
      productsHtml = `${product1}${product2}${product3}${product4}`;
    }

    const layoutClass = layout === 2 ? " layout-2" : layout === 3 ? " layout-3" : "";
    return `<div class="page${layoutClass}">${productsHtml}</div>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Professional Product Catalogue</title>
<style>
  @page { 
    size: A4; 
    margin: 15mm; 
  }
  * { 
    box-sizing: border-box; 
    margin: 0;
    padding: 0;
  }
  body { 
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    color: #333;
    line-height: 1.4;
    background: white;
    font-size: 12px;
  }
  .noprint { 
    margin-bottom: 20px; 
    text-align: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  .noprint button {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    margin-right: 16px;
  }
  .page { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    grid-template-rows: 1fr 1fr;
    gap: 15mm; 
    page-break-after: always; 
    padding: 0;
    height: 100vh;
  }
  .page.layout-2 {
    grid-template-rows: 1fr;
    grid-template-columns: 1fr 1fr;
    gap: 20mm;
    padding: 15mm;
    align-items: start;
    height: 100vh;
    box-sizing: border-box;
  }
  .page.layout-3 {
    grid-template-rows: 1fr;
    grid-template-columns: 1fr 1fr 1fr; /* 3 columns */
    gap: 15mm;
    padding: 15mm; /* Even margins */
    align-items: start;
    height: 100vh; /* Ensure page height */
    box-sizing: border-box; /* Include padding in height */
  }
  .product-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 0;
    page-break-inside: avoid;
    height: fit-content;
  }
  .page.layout-2 .product-card {
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
    max-height: 100%;
    overflow: hidden;
  }
  .page.layout-3 .product-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    max-height: 100%;
    overflow: hidden;
  }
  .product-card.empty {
    visibility: hidden;
  }
  .product-image {
    flex-shrink: 0;
    width: 60px;
  }
  .page.layout-2 .product-image {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 12px;
  }
  .page.layout-3 .product-image {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 10px;
  }
  .book-cover {
    width: 60px;
    height: 90px;
    object-fit: cover;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .page.layout-2 .book-cover {
    width: 120px;
    height: 180px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .page.layout-3 .book-cover {
    width: 80px;
    height: 120px;
    box-shadow: 0 3px 8px rgba(0,0,0,0.12);
  }
  .product-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .page.layout-2 .product-details {
    width: 100%;
    gap: 8px;
  }
  .product-title {
    font-size: 12px;
    font-weight: bold;
    color: #000;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .page.layout-2 .product-title {
    font-size: 16px;
    line-height: 1.3;
    margin-bottom: 6px;
  }
  .page.layout-3 .product-title {
    font-size: 14px;
    line-height: 1.2;
    margin-bottom: 4px;
  }
  .product-subtitle {
    font-size: 10px;
    color: #666;
    font-style: italic;
    margin-bottom: 2px;
  }
  .page.layout-2 .product-subtitle {
    font-size: 13px;
    margin-bottom: 6px;
  }
  .page.layout-3 .product-subtitle {
    font-size: 11px;
    margin-bottom: 4px;
  }
  .product-author {
    font-size: 10px;
    color: #000;
    font-weight: 500;
    margin-bottom: 3px;
  }
  .page.layout-2 .product-author {
    font-size: 12px;
    margin-bottom: 6px;
  }
  .page.layout-3 .product-author {
    font-size: 11px;
    margin-bottom: 4px;
  }
  .product-description {
    font-size: 9px;
    color: #333;
    line-height: 1.3;
    margin-bottom: 4px;
    text-align: justify;
  }
  .page.layout-2 .product-description {
    font-size: 11px;
    line-height: 1.5;
    margin-bottom: 8px;
    max-height: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 12;
    -webkit-box-orient: vertical;
  }
  .page.layout-3 .product-description {
    font-size: 10px;
    line-height: 1.4;
    margin-bottom: 6px;
    max-height: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 8;
    -webkit-box-orient: vertical;
  }
  .product-specs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 4px;
  }
  .spec-item {
    font-size: 9px;
    color: #666;
    background: #f8f9fa;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .product-meta {
    margin-bottom: 4px;
  }
  .meta-item {
    font-size: 9px;
    color: #666;
    margin-bottom: 1px;
  }
  .meta-item strong {
    color: #000;
  }
  .product-price {
    font-size: 13px;
    font-weight: bold;
    color: #d63384;
    margin: 4px 0;
  }
  .product-isbn {
    font-size: 9px;
    color: #666;
    font-family: monospace;
    margin-top: auto;
  }
  .author-bio {
    font-size: 9px;
    color: #333;
    font-style: italic;
    margin-top: 4px;
    line-height: 1.2;
  }
  
  /* 2-per-page layout specific styles */
  .page.layout-2 .product-price {
    font-size: 16px;
    margin: 8px 0;
  }
  .page.layout-3 .product-price {
    font-size: 14px;
    margin: 6px 0;
  }
  .page.layout-2 .product-isbn {
    font-size: 11px;
  }
  .page.layout-3 .product-isbn {
    font-size: 10px;
  }
  .page.layout-2 .product-specs {
    gap: 10px;
    margin-bottom: 10px;
  }
  .page.layout-2 .spec-item {
    font-size: 11px;
    padding: 4px 8px;
  }
  .page.layout-3 .product-specs {
    gap: 8px;
    margin-bottom: 8px;
  }
  .page.layout-3 .spec-item {
    font-size: 10px;
    padding: 3px 6px;
  }
  .page.layout-2 .product-meta {
    margin-bottom: 10px;
  }
  .page.layout-2 .meta-item {
    font-size: 11px;
    margin-bottom: 4px;
  }
  
  @media print { 
    .noprint { 
      display: none !important; 
    }
    .page {
      gap: 15mm;
    }
    .product-card {
      margin-bottom: 20mm;
    }
  }
</style>
</head>
<body>
  <div class="noprint">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    <span style="color: #666;">Use A4 paper, 15mm margins, hide headers/footers for best results.</span>
  </div>
  ${pagesHtml}
</body>
</html>`;
}
