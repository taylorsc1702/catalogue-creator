import type { NextApiRequest, NextApiResponse } from "next";
import { downloadImageAsBase64 } from "@/lib/image-utils";
import { renderProductCard, RenderOptions, Item, HyperlinkToggle, BarcodeType, UtmParams } from "../../../utils/product-card-renderer";


type ItemWithImages = {
  item: Item;
  imageData: {base64: string, width: number, height: number, mimeType: string} | null;
  additionalImagesData: Array<{base64: string, width: number, height: number, mimeType: string}>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layout = 4, title = "Product Catalogue", showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', utmParams } = req.body as {
      items: Item[]; 
      layout: 1 | 2 | 3 | 4 | 8; 
      title?: string;
      showFields?: Record<string, boolean>;
      hyperlinkToggle?: HyperlinkToggle;
      itemBarcodeTypes?: {[key: number]: BarcodeType};
      barcodeType?: BarcodeType;
      bannerColor?: string;
      websiteName?: string;
      utmParams?: UtmParams;
    };
    
    if (!items?.length) throw new Error("No items provided");

    // Generate the HTML with banner parameters
    const html = await generateGoogleDocsHtml(items, layout, title, showFields || {}, hyperlinkToggle, itemBarcodeTypes, barcodeType, bannerColor, websiteName, utmParams);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate Google Docs HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

async function generateGoogleDocsHtml(
  items: Item[], 
  layout: 1 | 2 | 3 | 4 | 8, 
  title: string, 
  showFields: Record<string, boolean>,
  hyperlinkToggle: HyperlinkToggle,
  itemBarcodeTypes: {[key: number]: BarcodeType},
  barcodeType: BarcodeType,
  bannerColor: string, 
  websiteName: string,
  utmParams?: UtmParams
) {
  // Download images for all items
  console.log("Downloading images for Google Docs export...");
  const imagePromises = items.map(async (item) => {
    let imageData = null;
    if (item.imageUrl) {
      imageData = await downloadImageAsBase64(item.imageUrl);
    }
    
    // Download additional images (internals) - max 4
    let additionalImagesData: Array<{ base64: string; width: number; height: number; mimeType: string }> = [];
    if (item.additionalImages && item.additionalImages.length > 0) {
      const internalPromises = item.additionalImages.slice(0, 4).map(url => downloadImageAsBase64(url));
      const internalResults = await Promise.all(internalPromises);
      additionalImagesData = internalResults.filter(img => img !== null) as Array<{ base64: string; width: number; height: number; mimeType: string }>;
    }
    
    return { item, imageData, additionalImagesData };
  });
    
  const itemsWithImages = await Promise.all(imagePromises);
  console.log(`Downloaded ${itemsWithImages.filter(i => i.imageData).length} images successfully`);

  return renderGoogleDocsHtml(itemsWithImages, layout, title, showFields, hyperlinkToggle, itemBarcodeTypes, barcodeType, bannerColor, websiteName, utmParams);
}

function renderGoogleDocsHtml(
  itemsWithImages: ItemWithImages[], 
  layout: 1 | 2 | 3 | 4 | 8, 
  title: string,
  showFields: Record<string, boolean>,
  hyperlinkToggle: HyperlinkToggle,
  itemBarcodeTypes: {[key: number]: BarcodeType},
  barcodeType: BarcodeType,
  bannerColor: string,
  websiteName: string,
  utmParams?: UtmParams
) {
  const perPage = layout;
  const chunks: ItemWithImages[][] = [];
  for (let i = 0; i < itemsWithImages.length; i += perPage) {
    chunks.push(itemsWithImages.slice(i, i + perPage));
  }

  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const pagesHtml = chunks.map((page, pageIndex) => {
    const createProductCard = (itemWithImages: ItemWithImages, localIndex: number) => {
      const item = itemWithImages.item;
      if (!item) return '<div class="product-card empty"></div>';
      
      const globalIndex = pageIndex * perPage + localIndex;
      
      // Create render options
      const options: RenderOptions = {
        showFields,
        hyperlinkToggle,
        itemBarcodeTypes,
        barcodeType: barcodeType || "None",
        utmParams
      };
      
      // Use the shared renderer
      return renderProductCard(item, layout, globalIndex, options);
    };

    // Create product slots based on layout
    const cards = page.map((itemWithImages, localIndex) => createProductCard(itemWithImages, localIndex)).join("");
    
    // Fill empty slots for proper grid layout
    const emptySlots = layout - page.length;
    const emptyCards = Array(emptySlots).fill('<div class="product-card empty"></div>').join("");

    const layoutClass = layout === 1 ? "layout-1" : layout === 2 ? "layout-2" : layout === 3 ? "layout-3" : layout === 4 ? "layout-4" : "layout-8";
    return `<div class="page ${layoutClass}">
      <!-- Header Banner -->
      <div class="page-header" style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8pt 0; font-weight: bold; font-size: 12pt;">
        ${esc(websiteName)}
      </div>
      
      <!-- Content Area -->
      <div class="page-content">
        ${cards}${emptyCards}
      </div>
      
      <!-- Footer Banner -->
      <div class="page-footer" style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8pt 0; font-weight: bold; font-size: 12pt;">
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
    /* Google Docs import optimized styles - matches HTML export */
    body {
      font-family: 'Arial', 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #333;
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
      grid-template-areas: 
        "header"
        "content"
        "footer";
      grid-template-rows: auto 1fr auto;
      gap: 15pt;
      margin-bottom: 40pt;
      page-break-after: always;
      min-height: 10in;
    }
    
    .page-header {
      grid-area: header;
    }
    
    .page-content {
      grid-area: content;
      display: grid;
      gap: 20pt;
      overflow: hidden;
    }
    
    .page-footer {
      grid-area: footer;
    }
    
    /* Layout-specific grid configurations */
    .page.layout-1 .page-content {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
    }
    
    .page.layout-2 .page-content {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr;
      gap: 30pt;
    }
    
    .page.layout-3 .page-content {
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: 1fr;
      gap: 20pt;
    }
    
    .page.layout-4 .page-content {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 20pt;
    }
    
    .page.layout-8 .page-content {
      grid-template-columns: 1fr 1fr 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 15pt;
    }
    
    /* Product card base styles */
    .product-card {
      display: flex;
      gap: 12pt;
      border: 1pt solid #e0e0e0;
      padding: 12pt;
      background: white;
      page-break-inside: avoid;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
      box-sizing: border-box;
    }
    
    .product-card.empty {
      visibility: hidden;
    }
    
    /* 1-up layout: Two-column layout */
    .page.layout-1 .product-card {
      flex-direction: row;
      gap: 20pt;
      padding: 15pt;
    }
    
    .page.layout-1 .left-column {
      flex-shrink: 0;
      width: 200pt;
      display: flex;
      flex-direction: column;
      gap: 16pt;
    }
    
    .page.layout-1 .right-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12pt;
      min-width: 0;
      overflow: hidden;
    }
    
    .page.layout-1 .product-image {
      width: 100%;
    }
    
    .page.layout-1 .book-cover {
      width: 100%;
      height: auto;
      max-height: 250pt;
      object-fit: contain;
      border-radius: 4pt;
      border: 1pt solid #ddd;
    }
    
    .page.layout-1 .author-bio {
      background: #E3F2FD;
      padding: 10pt;
      border-radius: 6pt;
      font-size: 9pt;
      line-height: 1.3;
    }
    
    .page.layout-1 .author-bio-title {
      font-weight: 600;
      margin-bottom: 6pt;
      color: #1565C0;
    }
    
    .page.layout-1 .author-bio-content {
      color: #333;
    }
    
    .page.layout-1 .internals-section {
      background: #F5F5F5;
      padding: 10pt;
      border-radius: 6pt;
    }
    
    .page.layout-1 .internals-title {
      font-weight: 600;
      margin-bottom: 6pt;
      font-size: 9pt;
      color: #495057;
    }
    
    .page.layout-1 .internals-thumbnails {
      display: flex;
      gap: 6pt;
      flex-wrap: wrap;
    }
    
    .page.layout-1 .internal-thumbnail {
      width: 39pt;
      height: 55pt;
      object-fit: cover;
      border-radius: 3pt;
      border: 1pt solid #DEE2E6;
    }
    
    .page.layout-1 .product-title {
      font-size: 18pt;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
      line-height: 1.3;
    }
    
    .page.layout-1 .product-subtitle {
      font-size: 13pt;
      color: #666;
      margin: 0;
      font-style: italic;
    }
    
    .page.layout-1 .product-author {
      font-size: 12pt;
      color: #444;
      font-weight: 500;
      margin: 0;
    }
    
    .page.layout-1 .product-description {
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
      margin: 0;
      max-height: 120pt;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .page.layout-1 .product-meta {
      font-size: 9pt;
    }
    
    .page.layout-1 .meta-item {
      margin-bottom: 4pt;
    }
    
    .page.layout-1 .product-price {
      font-size: 14pt;
      font-weight: bold;
      color: #d63384;
    }
    
    /* Other layouts: Standard vertical card */
    .product-card {
      flex-direction: column;
    }
    
    .product-image {
      flex-shrink: 0;
      width: 80pt;
    }
    
    .page.layout-2 .product-image {
      width: 100pt;
    }
    
    .page.layout-3 .product-image {
      width: 80pt;
    }
    
    .page.layout-8 .product-image {
      width: 40pt;
    }
    
    .book-cover {
      width: 80pt;
      height: 120pt;
      object-fit: cover;
      border: 1pt solid #cccccc;
    }
    
    .page.layout-2 .book-cover {
      width: 175pt;
      height: 263pt;
    }
    
    .page.layout-3 .book-cover {
      width: 80pt;
      height: 120pt;
    }
    
    .page.layout-8 .book-cover {
      width: 40pt;
      height: 60pt;
    }
    
    .product-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6pt;
    }
    
    .product-title {
      font-size: 11pt;
      font-weight: bold;
      color: #000000;
      margin: 0 0 4pt 0;
      line-height: 1.2;
    }
    
    .page.layout-2 .product-title {
      font-size: 14pt;
      font-family: 'Calibri', sans-serif;
    }
    
    .page.layout-3 .product-title {
      font-size: 12pt;
    }
    
    .page.layout-8 .product-title {
      font-size: 9pt;
    }
    
    .product-subtitle {
      font-size: 9pt;
      color: #666666;
      font-style: italic;
      margin: 0 0 4pt 0;
    }
    
    .page.layout-2 .product-subtitle {
      font-size: 11pt;
      font-family: 'Calibri', sans-serif;
    }
    
    .page.layout-3 .product-subtitle {
      font-size: 10pt;
    }
    
    .page.layout-8 .product-subtitle {
      font-size: 7pt;
    }
    
    .product-author {
      font-size: 9pt;
      color: #000000;
      font-weight: 500;
      margin: 0 0 6pt 0;
    }
    
    .page.layout-2 .product-author {
      font-size: 11pt;
      font-family: 'Calibri', sans-serif;
    }
    
    .page.layout-3 .product-author {
      font-size: 10pt;
    }
    
    .page.layout-8 .product-author {
      font-size: 7pt;
    }
    
    .product-description {
      font-size: 8pt;
      color: #333333;
      line-height: 1.3;
      margin: 0 0 8pt 0;
      text-align: justify;
    }
    
    .page.layout-2 .product-description {
      font-size: 10pt;
      font-family: 'Calibri', sans-serif;
    }
    
    .page.layout-3 .product-description {
      font-size: 9pt;
    }
    
    .page.layout-8 .product-description {
      font-size: 6pt;
    }
    
    .product-specs {
      display: flex;
      flex-wrap: wrap;
      gap: 8pt;
      margin: 0 0 6pt 0;
    }
    
    .spec-item {
      font-size: 7pt;
      color: #666666;
      background: #f5f5f5;
      padding: 2pt 6pt;
      border-radius: 3pt;
    }
    
    .product-meta {
      margin: 0 0 8pt 0;
    }
    
    .page.layout-2 .meta-item {
      font-size: 12pt;
      font-family: 'Calibri', sans-serif;
    }
    .page.layout-2 .spec-item {
      font-size: 12pt;
      font-family: 'Calibri', sans-serif;
    }
    
    .product-price {
      font-size: 10pt;
      font-weight: bold;
      color: #d63384;
      margin: 0 0 4pt 0;
    }
    
    .page.layout-2 .product-price {
      font-size: 12pt;
    }
    
    .page.layout-3 .product-price {
      font-size: 11pt;
    }
    
    .page.layout-8 .product-price {
      font-size: 8pt;
    }
    
    .barcode {
      margin-top: 8pt;
      text-align: center;
    }
    
    .qr-code {
      width: 30pt;
      height: 30pt;
    }
    
    .ean13-barcode {
      width: 75pt;
      height: 30pt;
    }
    
    /* Layout 4: Special 4-up layout with larger image and reorganized content */
    .layout-4-special {
      display: flex;
      flex-direction: column;
      gap: 6pt;
      padding: 6pt;
      border: 1pt solid #e0e0e0;
      background: #ffffff;
      min-height: 140pt;
      max-width: 100%;
      overflow: hidden;
    }
    
    .layout-4-special .top-section {
      display: flex;
      gap: 6pt;
      align-items: flex-start;
    }
    
    .product-image-4up {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .book-cover-4up {
      width: 88pt;
      height: 132pt;
      object-fit: contain;
      border: 1pt solid #ddd;
      border-radius: 4pt;
      box-shadow: 0 2pt 4pt rgba(0,0,0,0.1);
    }
    
    .title-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2pt;
    }
    
    .product-title-4up {
      font-size: 11pt;
      font-weight: bold;
      color: #000;
      margin: 0;
      line-height: 1.2;
      font-family: 'Calibri', sans-serif;
    }
    
    .product-subtitle-4up {
      font-size: 10pt;
      font-style: italic;
      color: #666;
      margin: 0;
      line-height: 1.2;
      font-family: 'Calibri', sans-serif;
    }
    
    .product-author-4up {
      font-size: 10pt;
      color: #444;
      margin: 0;
      line-height: 1.2;
      font-family: 'Calibri', sans-serif;
    }
    
    .description-section {
      margin-top: 3pt;
    }
    
    .product-description-4up {
      font-size: 10pt;
      color: #333;
      line-height: 1.2;
      text-align: justify;
      font-family: 'Calibri', sans-serif;
    }
    
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 3pt;
    }
    
    .product-details-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3pt;
    }
    
    .product-specs-4up {
      display: flex;
      flex-wrap: wrap;
      gap: 3pt;
    }
    
    .spec-item-4up {
      font-size: 9pt;
      color: #666;
      background: #f5f5f5;
      padding: 2pt 4pt;
      border-radius: 3pt;
      font-family: 'Calibri', sans-serif;
    }
    
    .product-meta-4up {
      display: flex;
      flex-direction: column;
      gap: 1pt;
    }
    
    .meta-item-4up {
      font-size: 9pt;
      color: #666;
      margin-bottom: 0pt;
      font-family: 'Calibri', sans-serif;
    }
    
    .barcode-section-right {
      flex-shrink: 0;
      text-align: center;
      margin-left: 6pt;
    }
    
    .barcode-section-right .barcode img {
      max-width: 50pt;
      height: auto;
    }
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
    <p>To import into Google Docs: File → Open → Upload → Select this file</p>
  </div>
</body>
</html>`;
}
