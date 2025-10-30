import type { NextApiRequest, NextApiResponse } from "next";
import { downloadImageAsBase64 } from "@/lib/image-utils";
import { renderProductCard, RenderOptions, Item, HyperlinkToggle, BarcodeType, UtmParams, generateProductUrl, generateEAN13Barcode, generateQRCode } from "../../../utils/product-card-renderer";

type ItemWithImages = {
  item: Item;
  imageData: {base64: string, width: number, height: number, mimeType: string} | null;
  additionalImagesData: Array<{base64: string, width: number, height: number, mimeType: string}>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layoutAssignments, title = "Mixed Layout Product Catalogue", showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', utmParams, coverData, appendView } = req.body as {
      items: Item[]; 
      layoutAssignments: (1|2|'2-int'|3|4|8)[]; 
      title?: string;
      showFields?: Record<string, boolean>;
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
        coverImageUrls: string[];
        catalogueName: string;
      };
      appendView?: 'none' | 'list' | 'compact-list' | 'table';
    };
    
    if (!items?.length) throw new Error("No items provided");
    if (!layoutAssignments?.length) throw new Error("No layout assignments provided");
    if (items.length !== layoutAssignments.length) throw new Error("Items and layout assignments must be same length");

    // Generate the HTML with banner parameters
    const html = await generateMixedGoogleDocsHtml(items, layoutAssignments, title, showFields || {}, hyperlinkToggle, itemBarcodeTypes, barcodeType, bannerColor, websiteName, utmParams, coverData, appendView);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate mixed Google Docs HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

async function generateMixedGoogleDocsHtml(
  items: Item[], 
  layoutAssignments: (1|2|'2-int'|3|4|8)[], 
  title: string, 
  showFields: Record<string, boolean>,
  hyperlinkToggle: HyperlinkToggle,
  itemBarcodeTypes: {[key: number]: BarcodeType},
  barcodeType: BarcodeType,
  bannerColor: string, 
  websiteName: string,
  utmParams?: UtmParams,
  coverData?: {
    showFrontCover: boolean;
    showBackCover: boolean;
    frontCoverText1: string;
    frontCoverText2: string;
    backCoverText1: string;
    backCoverText2: string;
    coverImageUrls: string[];
    catalogueName: string;
  },
  appendView?: 'none' | 'list' | 'compact-list' | 'table'
) {
  // Download images for all items
  console.log("Downloading images for mixed Google Docs export...");
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

  return renderMixedGoogleDocsHtml(itemsWithImages, layoutAssignments, title, showFields, hyperlinkToggle, itemBarcodeTypes, barcodeType, bannerColor, websiteName, utmParams, coverData, appendView);
}

async function renderMixedGoogleDocsHtml(
  itemsWithImages: ItemWithImages[], 
  layoutAssignments: (1|2|'2-int'|3|4|8)[], 
  title: string,
  showFields: Record<string, boolean>,
  hyperlinkToggle: HyperlinkToggle,
  itemBarcodeTypes: {[key: number]: BarcodeType},
  barcodeType: BarcodeType,
  bannerColor: string, 
  websiteName: string,
  utmParams?: UtmParams,
  coverData?: {
    showFrontCover: boolean;
    showBackCover: boolean;
    frontCoverText1: string;
    frontCoverText2: string;
    backCoverText1: string;
    backCoverText2: string;
    coverImageUrls: string[];
    catalogueName: string;
  },
  appendView?: 'none' | 'list' | 'compact-list' | 'table'
) {
  const options: RenderOptions = {
    showFields,
    hyperlinkToggle,
    itemBarcodeTypes,
    barcodeType: barcodeType || "None",
    utmParams
  };

  // Group items by their layout requirements
  const pages: { items: ItemWithImages[]; layout: 1|2|'2-int'|3|4|8 }[] = [];
  let currentPage: ItemWithImages[] = [];
  let currentLayout = layoutAssignments[0];
  let itemsInPage = 0;

  itemsWithImages.forEach((itemWithImages, i) => {
    const assignedLayout = layoutAssignments[i];
    
    // If layout changes or page is full, start new page
    const currentLayoutNum = currentLayout === '2-int' ? 2 : currentLayout;
    if (assignedLayout !== currentLayout || itemsInPage >= currentLayoutNum) {
      if (currentPage.length > 0) {
        pages.push({ items: currentPage, layout: currentLayout });
      }
      currentPage = [itemWithImages];
      currentLayout = assignedLayout;
      itemsInPage = 1;
    } else {
      currentPage.push(itemWithImages);
      itemsInPage++;
    }
  });

  // Add last page
  if (currentPage.length > 0) {
    pages.push({ items: currentPage, layout: currentLayout });
  }

  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const pagesHtml = pages.map((page) => {
    const createProductCard = (itemWithImages: ItemWithImages) => {
      const item = itemWithImages.item;
      if (!item) return '<div class="product-card empty"></div>';
      
      // Find the global index of this item
      const globalIndex = itemsWithImages.findIndex(i => i.item.handle === item.handle);
      
      // Use the shared renderer with the page's layout
      return renderProductCard(item, page.layout, globalIndex, options);
    };

    const layout = page.layout;
    const layoutClass = layout === 1 ? "layout-1" : layout === 2 || layout === '2-int' ? "layout-2" : layout === 3 ? "layout-3" : layout === 4 ? "layout-4" : layout === 8 ? "layout-8" : "";
    const cards = page.items.map((itemWithImages) => createProductCard(itemWithImages)).join("");
    
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

  // Build optional appended pages
  const renderListRows = (_compact: boolean) => itemsWithImages.map(({item}, idx) => {
      const idObj = (item as unknown as { isbn13?: string; sku?: string });
      const isbnVal = idObj.isbn13 || item.sku || '';
      return `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(item.title || '')}</td>
        <td>${esc(item.author || '')}</td>
        <td>${esc(isbnVal)}</td>
        <td>${esc(item.price ? `AUD$ ${item.price}` : '')}</td>
      </tr>`;
    }).join('');

  // Precompute image and barcode data URLs for appended views
  const appendedImageDataUrls = itemsWithImages.map(({ imageData }) => imageData ? `data:${imageData.mimeType};base64,${imageData.base64}` : 'https://via.placeholder.com/40x60?text=No+Image');
  const appendedBarcodeDataUrls = itemsWithImages.map(({ item }, idx) => {
    const itemType = (itemBarcodeTypes && itemBarcodeTypes[idx]) || (barcodeType || 'None');
    const url = generateProductUrl(item.handle, hyperlinkToggle, utmParams);
    const idObj = (item as unknown as { isbn13?: string; sku?: string });
    let ean13 = idObj.isbn13 || item.sku || item.handle.replace(/[^0-9]/g, '');
    if (!ean13) ean13 = ''.padStart(13, '0');
    if (ean13.length < 13) ean13 = ean13.padStart(13, '0');
    if (ean13.length > 13) ean13 = ean13.substring(0, 13);
    return itemType === 'EAN-13' ? generateEAN13Barcode(ean13) : (itemType === 'QR Code' ? generateQRCode(url) : '');
  });

  const appendedListHtml = () => `
    <div class="page layout-table" data-layout="list">
      <div class="page-header" style="background-color:${bannerColor || '#F7981D'};color:#fff;text-align:center;padding:8px 0;font-weight:600;font-size:14px;">${esc(websiteName || 'www.woodslane.com.au')}</div>
      <div class="page-content" style="display:block;">
        <table style="width:100%;border-collapse:collapse;font-size:10pt;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
          <thead style="background:#667eea;color:#fff">
            <tr>
              <th style="padding:10px 8px;text-align:left;width:40px">#</th>
              <th style="padding:10px 8px;text-align:left;width:110px">ISBN</th>
              <th style="padding:10px 8px;text-align:left;width:70px">Image</th>
              <th style="padding:10px 8px;text-align:left;width:150px">Author</th>
              <th style="padding:10px 8px;text-align:left;">Title</th>
              <th style="padding:10px 8px;text-align:left;width:80px">Price</th>
              <th style="padding:10px 8px;text-align:left;width:150px">Publisher</th>
              <th style="padding:10px 8px;text-align:left;width:120px">Barcode</th>
              <th style="padding:10px 8px;text-align:center;width:60px">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${itemsWithImages.map(({item}, idx) => {
              const idObj = (item as unknown as { isbn13?: string; sku?: string });
              const isbnVal = idObj.isbn13 || item.sku || '';
              return `
              <tr style=\"border-bottom:1px solid #e9ecef\">
                <td style=\"padding:8px 6px;text-align:center;color:#667eea;font-weight:600\">${idx + 1}</td>
                <td style=\"padding:8px 6px;font-family:'Courier New',monospace;color:#666\">${esc(isbnVal)}</td>
                <td style=\"padding:8px 6px;text-align:center\"><img src=\"${esc(appendedImageDataUrls[idx])}\" style=\"width:40px;height:60px;object-fit:cover;border:1px solid #ddd;border-radius:4px\"/></td>
                <td style=\"padding:8px 6px\">${esc(item.author || '-')}</td>
                <td style=\"padding:8px 6px\">${esc(item.title)}</td>
                <td style=\"padding:8px 6px;color:#d63384;font-weight:600;text-align:right\">${item.price ? 'AUD$ '+esc(item.price) : '-'}</td>
                <td style=\"padding:8px 6px;color:#666\">${esc(item.imprint || '-')}</td>
                <td style=\"padding:8px 6px;text-align:center\">${appendedBarcodeDataUrls[idx] ? `<img src=\\\"${appendedBarcodeDataUrls[idx]}\\\" style=\\\"max-width:110px;height:auto\\\"/>` : ''}</td>
                <td style=\"padding:8px 6px\"><div style=\"width:50px;height:30px;border:2px solid #333;border-radius:4px;margin:0 auto\"></div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="page-footer" style="background-color:${bannerColor || '#F7981D'};color:#fff;text-align:center;padding:8px 0;font-weight:600;font-size:14px;">${esc(websiteName || 'www.woodslane.com.au')}</div>
    </div>`;

  const appendedCompactListHtml = () => `
    <div class="page layout-table" data-layout="compact-list">
      <div class="page-header" style="background-color:${bannerColor || '#F7981D'};color:#fff;text-align:center;padding:8px 0;font-weight:600;font-size:14px;">${esc(websiteName || 'www.woodslane.com.au')}</div>
      <div class="page-content" style="display:block;">
        <table style="width:100%;border-collapse:collapse;font-size:8pt;box-shadow:0 2px 6px rgba(0,0,0,0.1)">
          <thead style="background:#667eea;color:#fff">
            <tr>
              <th style="padding:8px 6px;text-align:left;width:30px">#</th>
              <th style="padding:8px 6px;text-align:left;width:100px">ISBN</th>
              <th style="padding:8px 6px;text-align:left;width:120px">Author</th>
              <th style="padding:8px 6px;text-align:left;width:150px">Title</th>
              <th style="padding:8px 6px;text-align:right;width:60px">Price</th>
              <th style="padding:8px 6px;text-align:left;width:110px">Publisher</th>
              <th style="padding:8px 6px;text-align:center;width:100px">Barcode</th>
              <th style="padding:8px 6px;text-align:center;width:45px">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${itemsWithImages.map(({item}, idx) => {
              const idObj = (item as unknown as { isbn13?: string; sku?: string });
              const isbnVal = idObj.isbn13 || item.sku || '';
              return `
              <tr style=\"border-bottom:1px solid #e9ecef\">\n                <td style=\"padding:6px;text-align:center;color:#667eea;font-weight:600\">${idx + 1}</td>\n                <td style=\"padding:6px;font-family:'Courier New',monospace;color:#666\">${esc(isbnVal)}</td>\n                <td style=\"padding:6px\">${esc(item.author || '-')}</td>\n                <td style=\"padding:6px\">${esc(item.title)}</td>\n                <td style=\"padding:6px;color:#d63384;font-weight:600;text-align:right\">${item.price ? 'AUD$ '+esc(item.price) : '-'}</td>\n                <td style=\"padding:6px;color:#666\">${esc(item.imprint || '-')}</td>\n                <td style=\"padding:6px;text-align:center\">${appendedBarcodeDataUrls[idx] ? `<img src=\\\"${appendedBarcodeDataUrls[idx]}\\\" style=\\\"max-width:95px;height:auto\\\"/>` : ''}</td>\n                <td style=\"padding:6px;text-align:center\"><div style=\"width:40px;height:25px;border:2px solid #333;border-radius:3px;margin:0 auto\"></div></td>\n              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="page-footer" style="background-color:${bannerColor || '#F7981D'};color:#fff;text-align:center;padding:8px 0;font-weight:600;font-size:14px;">${esc(websiteName || 'www.woodslane.com.au')}</div>
    </div>`;

  const simpleTable = () => `
    <div class="page layout-table" data-layout="table">
      <div class="page-header" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
      <div class="page-content" style="display:block;">
        <table class="grid-table" style="width:100%; border-collapse:collapse; font-size: 11px;">
          <thead class="table-header">
            <tr>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Title</th>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Author</th>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">ISBN</th>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Price</th>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Disc</th>
              <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${itemsWithImages.map(({item}) => {
              const idObj = (item as unknown as { isbn13?: string; sku?: string });
              const isbnVal = idObj.isbn13 || item.sku || '';
              return `
              <tr>
                <td style=\"padding:6px; border-bottom:1px solid #eee;\">${esc(item.title || '')}</td>
                <td style=\"padding:6px; border-bottom:1px solid #eee;\">${esc(item.author || '')}</td>
                <td style=\"padding:6px; border-bottom:1px solid #eee;\">${esc(isbnVal)}</td>
                <td style=\"padding:6px; border-bottom:1px solid #eee;\">${esc(item.price ? `AUD$ ${item.price}` : '')}</td>
                <td style=\"padding:6px; border-bottom:1px solid #eee;\">${esc(item.imidis || '')}</td>
                <td style=\"padding:6px; border-bottom:1px solid #eee;\"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="page-footer" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
    </div>`;

  const appendedPagesHtml = appendView === 'list'
    ? appendedListHtml()
    : appendView === 'compact-list'
      ? appendedCompactListHtml()
      : appendView === 'table'
        ? simpleTable()
        : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
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
    min-height: 100vh;
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
  
  /* Include all the updated layout CSS from mixed.ts */
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
  
  .layout-1-full .author-bio {
    background: #E3F2FD;
    padding: 10px;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1.3;
    margin-top: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .layout-1-full .author-bio.truncated {
    max-height: 200px;
    overflow: hidden;
  }
  
  .layout-1-full .author-bio.full {
    max-height: none;
    overflow: visible;
  }
  
  .layout-1-full .author-bio-title {
    font-weight: 600;
    margin-bottom: 6px;
    font-size: 10px;
    color: #1565C0;
  }
  
  .layout-1-full .author-bio-content {
    color: #333;
    flex: 1;
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
    max-width: 88px; /* 80px * 1.1 = 88px (10% bigger) */
    height: auto;
  }
  
  /* 3-up layout specific styles */
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
    max-width: 55px; /* 50px * 1.1 = 55px (10% bigger) */
    height: auto;
  }
  
  /* Common styles */
  .product-image {
    flex-shrink: 0;
    width: 60px;
  }
  
  .book-cover {
    width: 60px;
    height: 90px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .product-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    justify-content: space-between;
  }
  
  .product-title {
    font-size: 12px;
    font-weight: bold;
    color: #000;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  
  .product-subtitle {
    font-size: 10px;
    color: #666;
    font-style: italic;
    margin-bottom: 2px;
  }
  
  .product-author {
    font-size: 10px;
    color: #000;
    font-weight: 500;
    margin-bottom: 3px;
  }
  
  .product-description {
    font-size: 9px;
    color: #333;
    line-height: 1.3;
    margin-bottom: 4px;
    text-align: justify;
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
  
  .barcode-text {
    font-size: 8px;
    text-align: center;
    margin-top: 2px;
    color: #666;
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
  
  /* Internal image styles for 2-int layout */
  .internal-image-section {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 8px 0;
  }
  
  .internal-preview-image {
    width: 72px; /* 60px * 1.2 = 72px (20% bigger) */
    height: 96px; /* 80px * 1.2 = 96px (20% bigger) */
    object-fit: cover;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  /* Cover Styles */
  ${coverCSS}
  
  @media print {
    .page {
      page-break-after: always;
    }
  }
</style>
</head>
<body>
  ${frontCoverHtml}
  ${pagesHtml}
  ${appendedPagesHtml}
  ${backCoverHtml}
</body>
</html>`;
}
