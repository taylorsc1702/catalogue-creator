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
    const { items, layoutAssignments, showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', utmParams, coverData } = req.body as {
      items: Item[]; 
      layoutAssignments: (1|2|'2-int'|3|4|8)[]; 
      showFields: Record<string, boolean>;
      hyperlinkToggle?: HyperlinkToggle;
      itemBarcodeTypes?: {[key: number]: BarcodeType};
      barcodeType?: BarcodeType;
      bannerColor?: string;
      websiteName?: string;
      utmParams?: UtmParams;
      coverData?: {
        showFrontCover: boolean;
        showBackCover: boolean;
        frontCoverText1: string;
        frontCoverText2: string;
        backCoverText1: string;
        backCoverText2: string;
        coverImageUrls: string[]; // New: Direct image URLs
        catalogueName: string;
      };
    };
    
    if (!items?.length) throw new Error("No items provided");
    if (!layoutAssignments?.length) throw new Error("No layout assignments provided");
    if (items.length !== layoutAssignments.length) throw new Error("Items and layout assignments must be same length");
    
    const html = await renderMixedHtml(items, layoutAssignments, showFields || {}, hyperlinkToggle, itemBarcodeTypes, barcodeType, bannerColor, websiteName, utmParams, coverData);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render mixed layout HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

async function renderMixedHtml(items: Item[], layoutAssignments: (1|2|'2-int'|3|4|8)[], showFields: Record<string, boolean>, hyperlinkToggle: HyperlinkToggle, itemBarcodeTypes?: {[key: number]: BarcodeType}, barcodeType?: BarcodeType, bannerColor?: string, websiteName?: string, utmParams?: UtmParams, coverData?: {
  showFrontCover: boolean;
  showBackCover: boolean;
  frontCoverText1: string;
  frontCoverText2: string;
  backCoverText1: string;
  backCoverText2: string;
  coverImageUrls: string[]; // New: Direct image URLs
  catalogueName: string;
}) {
  const options: RenderOptions = {
    showFields,
    hyperlinkToggle,
    itemBarcodeTypes,
    barcodeType: barcodeType || "None",
    utmParams
  };

  // Group items by their layout requirements
  const pages: { items: Item[]; layout: 1|2|'2-int'|3|4|8 }[] = [];
  let currentPage: Item[] = [];
  let currentLayout = layoutAssignments[0];
  let itemsInPage = 0;

  items.forEach((item, i) => {
    const assignedLayout = layoutAssignments[i];
    
    // If layout changes or page is full, start new page
    const currentLayoutNum = currentLayout === '2-int' ? 2 : currentLayout;
    if (assignedLayout !== currentLayout || itemsInPage >= currentLayoutNum) {
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
    const layoutClass = layout === 1 ? "layout-1" : layout === 2 || layout === '2-int' ? "layout-2" : layout === 3 ? "layout-3" : layout === 4 ? "layout-4" : layout === 8 ? "layout-8" : "";
    const cards = page.items.map((item) => createProductCard(item)).join("");
    
    // Fill empty slots for proper grid layout
    const emptySlots = (layout === '2-int' ? 2 : layout) - page.items.length;
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

  // Generate covers if requested
  let frontCoverHtml = '';
  let backCoverHtml = '';
  let coverCSS = '';
  
  if (coverData) {
    // Import cover generation functions
    const { generateCoverHTML, generateCoverCSS } = await import('../../../utils/cover-generator');
    
    // Generate cover CSS
    coverCSS = generateCoverCSS();
    
    // Generate cover HTML using direct image URLs
    if (coverData.showFrontCover && coverData.coverImageUrls && coverData.coverImageUrls.length > 0) {
      frontCoverHtml = generateCoverHTML({
        ...coverData,
        hyperlinkToggle,
        bannerColor: bannerColor || '#F7981D',
        websiteName: websiteName || 'www.woodslane.com.au'
      });
    }
    
    // Generate back cover HTML using the same URLs
    if (coverData.showBackCover && coverData.coverImageUrls && coverData.coverImageUrls.length > 0) {
      backCoverHtml = generateCoverHTML({
        ...coverData,
        frontCoverText1: coverData.backCoverText1,
        frontCoverText2: coverData.backCoverText2,
        hyperlinkToggle,
        bannerColor: bannerColor || '#F7981D',
        websiteName: websiteName || 'www.woodslane.com.au'
      });
    }
  }

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
  
  /* 2-up vertical layout specific styles */
  .layout-2-vertical {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border: 1px solid #e0e0e0;
    background: #ffffff;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
  }
  
  .product-image-2up {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .book-cover-2up {
    width: 175px;
    height: 263px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .product-content-2up {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    overflow: hidden;
  }
  
  .layout-2-vertical .product-title {
    font-size: 16px;
    font-weight: bold;
    color: #000;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .product-subtitle {
    font-size: 12px;
    font-style: italic;
    color: #666;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .product-author {
    font-size: 12px;
    color: #444;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .product-description {
    font-size: 11px;
    color: #333;
    line-height: 1.3;
    margin: 4px 0;
    text-align: justify;
    font-family: 'Calibri', sans-serif;
    max-height: 60px;
    overflow: hidden;
  }
  
  .layout-2-vertical .product-specs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 4px;
  }
  
  .layout-2-vertical .spec-item {
    font-size: 12px;
    color: #666;
    background: #f5f5f5;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .product-meta {
    margin-bottom: 4px;
  }
  
  .layout-2-vertical .meta-item {
    font-size: 12px;
    color: #666;
    margin-bottom: 1px;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .product-price {
    font-size: 14px;
    font-weight: bold;
    color: #d63384;
    margin-bottom: 4px;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .barcode {
    margin-top: auto;
    text-align: center;
    flex-shrink: 0;
  }
  
  .layout-2-vertical .barcode img {
    max-width: 80px;
    height: auto;
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
  
  /* 1-up layout: Full layout with internals at bottom */
  .layout-1-full {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 15px;
    height: 100%;
  }
  
  .layout-1-full .main-content {
    display: flex;
    flex-direction: row;
    gap: 20px;
    flex: 1;
  }
  
  .layout-1-full .left-column {
    flex-shrink: 0;
    width: 250px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .layout-1-full .right-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    overflow: hidden;
  }
  
  .internals-section-full {
    margin-top: auto;
    padding-top: 20px;
    border-top: 2px solid #e0e0e0;
  }
  
  .internals-title {
    font-size: 14px;
    font-weight: bold;
    color: #1565C0;
    margin-bottom: 12px;
    text-align: center;
  }
  
  .internals-thumbnails-full {
    display: flex;
    justify-content: center;
    gap: 15px;
    flex-wrap: wrap;
  }
  
  .internal-thumbnail-full {
    width: 120px;
    height: 160px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .product-details-row {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }
  
  .product-details-row .product-meta {
    flex: 1;
  }
  
  .barcode-right {
    flex-shrink: 0;
    text-align: center;
  }
  
  .barcode-right .barcode img {
    max-width: 120px;
    height: auto;
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
    font-size: 12px;
  }
  
  .page.layout-1 .product-price {
    font-size: 16px;
    font-weight: bold;
    color: #d63384;
    margin-bottom: 8px;
  }
  
  /* 3-up layout specific styles */
  .page.layout-3 .product-card.layout-3-row {
    display: grid !important;
  }
  
  .layout-3-row {
    display: grid;
    grid-template-columns: 176px 1fr 100px;
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
  
  .product-image-3up .book-cover {
    width: 172px;
    height: 228px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .product-content-3up {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 90%;
  }
  
  .product-content-3up .product-title {
    font-size: 14px;
    font-weight: bold;
    color: #000;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-content-3up .product-subtitle {
    font-size: 12px;
    font-style: italic;
    color: #666;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-content-3up .product-author {
    font-size: 12px;
    color: #444;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-description-3up {
    font-size: 11px;
    color: #333;
    line-height: 1.3;
    margin-top: 6px;
    padding: 6px;
    border: 1px solid #e0e0e0;
    background: #fafafa;
    max-height: 120px;
    overflow: hidden;
    text-align: justify;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-details-3up {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 10px;
    color: #333;
    border: 1px solid #e0e0e0;
    padding: 6px;
    background: #ffffff;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-details-3up .detail-value {
    padding: 2px 4px;
    border-bottom: 1px solid #f0f0f0;
    line-height: 1.3;
  }
  
  .product-details-3up .detail-value:last-child {
    border-bottom: none;
  }
  
  .product-details-3up .barcode {
    margin-top: 8px;
    padding: 0;
  }
  
  .product-details-3up .barcode img {
    max-width: 100%;
    height: auto;
  }
  
  .barcode-fallback {
    font-size: 8px;
    color: #666;
    text-align: center;
    padding: 4px;
    border: 1px dashed #ccc;
    background: #f9f9f9;
    margin-top: 4px;
  }
  
  .barcode-debug {
    font-size: 7px;
    color: #999;
    text-align: center;
    margin-top: 2px;
    font-family: monospace;
  }
  
  .barcode-text {
    font-size: 10px;
    color: #000;
    text-align: center;
    margin-top: 4px;
    font-family: monospace;
    font-weight: bold;
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
  
  /* Internal image styles for 2-int layout */
  .internal-image-section {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 8px 0;
  }
  
  .internal-preview-image {
    width: 60px;
    height: 80px;
    object-fit: cover;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  @media print {
    .page {
      page-break-after: always;
    }
  }
  
  /* Cover Styles */
  ${coverCSS}
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
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
    }
    
    .footer-content {
      text-align: center;
    }
    
    .website-url {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 6px;
      font-family: 'Calibri', sans-serif;
      line-height: 1.2;
    }
    
    .contact-info {
      font-size: 12px;
      font-family: 'Calibri', sans-serif;
      line-height: 1.2;
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
</style>
</head>
<body>
  ${frontCoverHtml}
  ${pagesHtml}
  ${backCoverHtml}
</body>
</html>`;
}

