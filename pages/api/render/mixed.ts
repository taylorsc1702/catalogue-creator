import type { NextApiRequest, NextApiResponse } from "next";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layoutAssignments, showFields } = req.body as {
      items: Item[]; 
      layoutAssignments: (1|2|4|8)[]; 
      showFields: Record<string, boolean>;
    };
    
    if (!items?.length) throw new Error("No items provided");
    if (!layoutAssignments?.length) throw new Error("No layout assignments provided");
    if (items.length !== layoutAssignments.length) throw new Error("Items and layout assignments must be same length");
    
    const html = renderMixedHtml(items, layoutAssignments, showFields || {});
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render mixed layout HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

function renderMixedHtml(items: Item[], layoutAssignments: (1|2|4|8)[], show: Record<string, boolean>) {
  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  // Group items by their layout requirements
  const pages: { items: Item[]; layout: 1|2|4|8 }[] = [];
  let currentPage: Item[] = [];
  let currentLayout = layoutAssignments[0];
  let itemsInPage = 0;

  items.forEach((item, i) => {
    const assignedLayout = layoutAssignments[i];
    
    // If layout changes or page is full, start new page
    if (assignedLayout !== currentLayout || itemsInPage >= currentLayout) {
      if (currentPage.length > 0) {
        pages.push({ items: currentPage, layout: currentLayout });
      }
      currentPage = [item];
      currentLayout = assignedLayout;
      itemsInPage = 1;
    } else {
      currentPage.push(item);
      itemsInPage++;
    }
  });

  // Add last page
  if (currentPage.length > 0) {
    pages.push({ items: currentPage, layout: currentLayout });
  }

  const pagesHtml = pages.map(page => {
    const createProductCard = (it: Item) => {
      return [
        '<div class="product-card">',
          '<div class="product-image">',
            `<img src="${esc(it.imageUrl)}" alt="${esc(it.title)}" class="book-cover">`,
          '</div>',
          '<div class="product-details">',
            `<h2 class="product-title">${esc(it.title)}</h2>`,
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

    const layout = page.layout;
    const layoutClass = layout === 2 ? "layout-2" : layout === 1 ? "layout-1" : layout === 8 ? "layout-8" : "";
    const cards = page.items.map(createProductCard).join("");
    
    // Fill empty slots for proper grid layout
    const emptySlots = layout - page.items.length;
    const emptyCards = Array(emptySlots).fill('<div class="product-card empty"></div>').join("");
    
    return `<div class="page ${layoutClass}" data-layout="${layout}">${cards}${emptyCards}</div>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Mixed Layout Product Catalogue</title>
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
  .page { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    grid-template-rows: 1fr 1fr;
    gap: 15mm; 
    page-break-after: always; 
    padding: 0;
    height: 100vh;
  }
  .page.layout-1 {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }
  .page.layout-2 {
    grid-template-rows: 1fr;
    gap: 20mm;
  }
  .page.layout-8 {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 10mm;
  }
  .product-card {
    display: flex;
    gap: 8px;
    margin-bottom: 0;
    page-break-inside: avoid;
    height: fit-content;
  }
  .product-card.empty {
    visibility: hidden;
  }
  .product-image {
    flex-shrink: 0;
    width: 60px;
  }
  .page.layout-1 .product-image {
    width: 200px;
  }
  .page.layout-2 .product-image {
    width: 100px;
  }
  .page.layout-8 .product-image {
    width: 40px;
  }
  .book-cover {
    width: 60px;
    height: 90px;
    object-fit: cover;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .page.layout-1 .book-cover {
    width: 200px;
    height: 300px;
  }
  .page.layout-2 .book-cover {
    width: 100px;
    height: 150px;
  }
  .page.layout-8 .book-cover {
    width: 40px;
    height: 60px;
  }
  .product-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .product-title {
    font-size: 12px;
    font-weight: bold;
    color: #000;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .page.layout-1 .product-title {
    font-size: 24px;
  }
  .page.layout-2 .product-title {
    font-size: 16px;
  }
  .page.layout-8 .product-title {
    font-size: 10px;
  }
  .product-subtitle {
    font-size: 10px;
    color: #666;
    font-style: italic;
    margin-bottom: 2px;
  }
  .page.layout-1 .product-subtitle {
    font-size: 18px;
  }
  .page.layout-2 .product-subtitle {
    font-size: 12px;
  }
  .page.layout-8 .product-subtitle {
    font-size: 8px;
  }
  .product-author {
    font-size: 10px;
    color: #000;
    font-weight: 500;
    margin-bottom: 3px;
  }
  .page.layout-1 .product-author {
    font-size: 16px;
  }
  .page.layout-2 .product-author {
    font-size: 12px;
  }
  .page.layout-8 .product-author {
    font-size: 8px;
  }
  .product-description {
    font-size: 9px;
    color: #333;
    line-height: 1.3;
    margin-bottom: 4px;
    text-align: justify;
  }
  .page.layout-1 .product-description {
    font-size: 14px;
  }
  .page.layout-2 .product-description {
    font-size: 11px;
  }
  .page.layout-8 .product-description {
    font-size: 7px;
  }
  .product-specs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 4px;
  }
  .spec-item {
    font-size: 8px;
    color: #666;
    background: #f5f5f5;
    padding: 2px 4px;
    border-radius: 3px;
  }
  .product-meta {
    margin-bottom: 6px;
  }
  .meta-item {
    font-size: 8px;
    color: #666;
    margin-bottom: 2px;
  }
  .product-price {
    font-size: 11px;
    font-weight: bold;
    color: #d63384;
    margin-bottom: 4px;
  }
  .page.layout-1 .product-price {
    font-size: 20px;
  }
  .page.layout-2 .product-price {
    font-size: 14px;
  }
  .page.layout-8 .product-price {
    font-size: 9px;
  }
  .product-isbn {
    font-size: 8px;
    color: #999;
    font-family: 'Courier New', monospace;
  }
  .page.layout-1 .product-isbn {
    font-size: 12px;
  }
  .page.layout-8 .product-isbn {
    font-size: 7px;
  }
  @media print {
    .page {
      page-break-after: always;
    }
  }
</style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

