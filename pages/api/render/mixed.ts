import type { NextApiRequest, NextApiResponse } from "next";
import {
  Item,
  HyperlinkToggle,
  BarcodeType,
  UtmParams,
  RenderOptions,
  esc,
  renderProductCard
} from "../../../utils/product-card-renderer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layoutAssignments, showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', utmParams } = req.body as {
      items: Item[]; 
      layoutAssignments: (1|2|3|4|8)[]; 
      showFields: Record<string, boolean>;
      hyperlinkToggle?: HyperlinkToggle;
      itemBarcodeTypes?: {[key: number]: BarcodeType};
      barcodeType?: BarcodeType;
      bannerColor?: string;
      websiteName?: string;
      utmParams?: UtmParams;
    };
    
    if (!items?.length) throw new Error("No items provided");
    if (!layoutAssignments?.length) throw new Error("No layout assignments provided");
    if (items.length !== layoutAssignments.length) throw new Error("Items and layout assignments must be same length");
    
    const html = renderMixedHtml(items, layoutAssignments, showFields || {}, hyperlinkToggle, itemBarcodeTypes, barcodeType, bannerColor, websiteName, utmParams);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render mixed layout HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

function renderMixedHtml(items: Item[], layoutAssignments: (1|2|3|4|8)[], showFields: Record<string, boolean>, hyperlinkToggle: HyperlinkToggle, itemBarcodeTypes?: {[key: number]: BarcodeType}, barcodeType?: BarcodeType, bannerColor?: string, websiteName?: string, utmParams?: UtmParams) {
  const options: RenderOptions = {
    showFields,
    hyperlinkToggle,
    itemBarcodeTypes,
    barcodeType: barcodeType || "None",
    utmParams
  };

  // Group items by their layout requirements
  const pages: { items: Item[]; layout: 1|2|3|4|8 }[] = [];
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

  const pagesHtml = pages.map((page) => {
    const createProductCard = (it: Item) => {
      // Find the global index of this item
      const globalIndex = items.findIndex(item => item.handle === it.handle);
      
      // Use the shared renderer with the page's layout
      return renderProductCard(it, page.layout, globalIndex, options);
    };

    const layout = page.layout;
    const layoutClass = layout === 2 ? "layout-2" : layout === 3 ? "layout-3" : layout === 1 ? "layout-1" : layout === 8 ? "layout-8" : "";
    const cards = page.items.map((item) => createProductCard(item)).join("");
    
    // Fill empty slots for proper grid layout
    const emptySlots = layout - page.items.length;
    const emptyCards = Array(emptySlots).fill('<div class="product-card empty"></div>').join("");
    
    return `<div class="page ${layoutClass}" data-layout="${layout}">
      <!-- Header Banner -->
      <div class="page-header" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
      
      <!-- Content Area -->
      <div class="page-content">
        ${cards}${emptyCards}
      </div>
      
      <!-- Footer Banner -->
      <div class="page-footer" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
    </div>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Mixed Layout Product Catalogue</title>
<style>
  @page { 
    size: A4 portrait; 
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
    grid-template-areas: 
      "header header"
      "content content"
      "footer footer";
    grid-template-rows: auto 1fr auto;
    gap: 10mm;
    page-break-after: always; 
    padding: 0;
    height: 100vh;
  }
  
  .page-header, .page-footer {
    width: 100% !important;
    margin: 0 !important;
    position: relative !important;
    left: 0 !important;
    right: 0 !important;
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
  .page.layout-1 .page-content {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }
  
  .page.layout-2 .page-content {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
    gap: 20mm;
  }
  
  .page.layout-3 .page-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: 8mm;
  }
  
  .page.layout-4 .page-content {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  
  .page.layout-8 .page-content {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 10mm;
  }
  .product-card {
    display: flex;
    gap: 8px;
    margin-bottom: 0;
    page-break-inside: avoid;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
    box-sizing: border-box;
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
    width: 175px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .page.layout-3 .product-image {
    width: 80px;
  }
  .page.layout-8 .product-image {
    width: 40px;
  }
  .book-cover {
    width: 60px;
    height: 90px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .page.layout-1 .book-cover {
    width: 200px;
    height: 300px;
  }
  .page.layout-2 .book-cover {
    width: 175px;
    height: 263px;
  }
  .page.layout-3 .book-cover {
    width: 80px;
    height: 120px;
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
    font-family: 'Calibri', sans-serif;
  }
  .page.layout-3 .product-title {
    font-size: 14px;
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
    font-family: 'Calibri', sans-serif;
  }
  .page.layout-3 .product-subtitle {
    font-size: 11px;
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
    font-family: 'Calibri', sans-serif;
  }
  .page.layout-3 .product-author {
    font-size: 11px;
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
    font-family: 'Calibri', sans-serif;
  }
  .page.layout-3 .product-description {
    font-size: 10px;
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
  .page.layout-2 .meta-item {
    font-size: 12px;
    font-family: 'Calibri', sans-serif;
  }
  .page.layout-2 .spec-item {
    font-size: 12px;
    font-family: 'Calibri', sans-serif;
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
  .page.layout-3 .product-price {
    font-size: 13px;
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
  
  /* 1-up layout specific styles */
  .page.layout-1 .product-card {
    position: relative;
    flex-direction: row;
    gap: 20px;
    padding: 15px;
  }
  
  .page.layout-1 .left-column {
    flex-shrink: 0;
    width: 250px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .page.layout-1 .right-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 60px;
  }
  
  .page.layout-1 .author-bio {
    background: #E3F2FD;
    padding: 10px;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1.3;
    margin-top: 16px;
  }
  
  .page.layout-1 .author-bio.truncated {
    max-height: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .page.layout-1 .author-bio.full {
    max-height: none;
    overflow: visible;
  }
  
  .page.layout-1 .author-bio-title {
    font-weight: 600;
    margin-bottom: 6px;
    font-size: 10px;
    color: #495057;
  }
  
  .page.layout-1 .author-bio-content {
    color: #333;
  }
  
  .page.layout-1 .author-bio.truncated .author-bio-content {
    display: -webkit-box;
    -webkit-line-clamp: 8;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .page.layout-1 .author-bio.full .author-bio-content {
    display: block;
    -webkit-line-clamp: none;
    -webkit-box-orient: initial;
    overflow: visible;
  }
  
  .page.layout-1 .internals-section {
    background: #F5F5F5;
    padding: 10px;
    border-radius: 6px;
    margin-top: auto;
  }
  
  .page.layout-1 .internals-title {
    font-weight: 600;
    margin-bottom: 6px;
    font-size: 10px;
    color: #495057;
  }
  
  .page.layout-1 .internals-thumbnails {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    width: 375px;
  }
  
  .page.layout-1 .internal-thumbnail {
    width: 47px;
    height: 66px;
    object-fit: contain;
    border-radius: 3px;
    border: 1px solid #DEE2E6;
  }
  
  .page.layout-1 .product-image {
    width: 200px;
  }
  
  .page.layout-1 .book-cover {
    width: 200px;
    height: 300px;
  }
  
  .page.layout-1 .product-title {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.2;
    margin-bottom: 4px;
  }
  
  .page.layout-1 .product-subtitle {
    font-size: 14px;
    color: #666;
    font-style: italic;
    margin-bottom: 4px;
  }
  
  .page.layout-1 .product-author {
    font-size: 14px;
    color: #333;
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .page.layout-1 .product-description {
    font-size: 12px;
    color: #444;
    line-height: 1.4;
    margin-bottom: 12px;
  }
  
  .page.layout-1 .product-meta {
    font-size: 10px;
  }
  
  .page.layout-1 .product-price {
    font-size: 16px;
    font-weight: bold;
    color: #d63384;
    margin-bottom: 8px;
  }
  
  .barcode-bottom-right {
    position: absolute;
    bottom: 15mm;
    right: 15mm;
    text-align: right;
  }
  
  .barcode-bottom-right .barcode img {
    max-width: 150px;
    height: auto;
  }
  
  /* 3-up layout specific styles */
  .page.layout-3 .product-card.layout-3-row {
    display: grid !important;
  }
  
  .layout-3-row {
    display: grid;
    grid-template-columns: 100px 1fr 100px;
    gap: 10px;
    padding: 10px;
    border: 1px solid #e0e0e0;
    background: #ffffff;
    min-height: 180px;
    max-width: 100%;
    overflow: hidden;
  }
  
  .product-image-3up {
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  
  .product-content-3up {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 8px;
  }
  
  .product-details-3up {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 8px;
    color: #666;
  }
  
  .product-details-3up .barcode {
    margin-top: auto;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }
  
  .detail-value {
    font-size: 8px;
    color: #666;
    margin-bottom: 2px;
  }
  
  .product-description-3up {
    font-size: 8px;
    color: #333;
    line-height: 1.2;
    margin-bottom: 4px;
    text-align: justify;
    border: 1px solid #e0e0e0;
    background: #f9f9f9;
    padding: 4px;
    max-height: 80px;
    overflow: hidden;
  }
  
  .barcode {
    margin-top: auto;
    text-align: center;
    flex-shrink: 0;
  }
  
  .qr-code {
    width: 30px;
    height: 30px;
  }
  
  .ean13-barcode {
    width: 75px;
    height: 30px;
  }
  
  @media screen {
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    body {
      padding: 20px;
    }
  }
  
  .barcode-text {
    font-size: 8px;
    text-align: center;
    margin-top: 2px;
    color: #666;
  }
  
  /* Layout 4: Special 4-up layout with larger image and reorganized content */
  .layout-4-special {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    border: 1px solid #e0e0e0;
    background: #ffffff;
    min-height: 140px;
    max-width: 100%;
    overflow: hidden;
  }
  
  .layout-4-special .top-section {
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }
  
  .product-image-4up {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .book-cover-4up {
    width: 88px;
    height: 132px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .title-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .product-title-4up {
    font-size: 11px;
    font-weight: bold;
    color: #000;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-subtitle-4up {
    font-size: 10px;
    font-style: italic;
    color: #666;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-author-4up {
    font-size: 10px;
    color: #444;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .description-section {
    margin-top: 3px;
  }
  
  .product-description-4up {
    font-size: 10px;
    color: #333;
    line-height: 1.2;
    text-align: justify;
    font-family: 'Calibri', sans-serif;
  }
  
  .bottom-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 3px;
  }
  
  .product-details-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  
  .product-specs-4up {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  
  .spec-item-4up {
    font-size: 9px;
    color: #666;
    background: #f5f5f5;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-meta-4up {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  
  .meta-item-4up {
    font-size: 9px;
    color: #666;
    margin-bottom: 0px;
    font-family: 'Calibri', sans-serif;
  }
  
  .barcode-section-right {
    flex-shrink: 0;
    text-align: center;
    margin-left: 6px;
  }
  
  .barcode-section-right .barcode img {
    max-width: 50px;
    height: auto;
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

