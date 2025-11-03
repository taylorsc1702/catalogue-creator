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
    const { items, layoutAssignments, title = "Mixed Layout Product Catalogue", showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', utmParams, coverData, appendView, appendInsertIndex } = req.body as {
      items: Item[]; 
      layoutAssignments: (1|'1L'|2|'2-int'|3|4|8)[]; 
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
      appendInsertIndex?: number | null;
    };
    
    if (!items?.length) throw new Error("No items provided");
    if (!layoutAssignments?.length) throw new Error("No layout assignments provided");
    if (items.length !== layoutAssignments.length) throw new Error("Items and layout assignments must be same length");

    // Generate the HTML with banner parameters
    const html = await generateMixedGoogleDocsHtml(items, layoutAssignments, title, showFields || {}, hyperlinkToggle, itemBarcodeTypes, barcodeType, bannerColor, websiteName, utmParams, coverData, appendView, appendInsertIndex);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate mixed Google Docs HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

async function generateMixedGoogleDocsHtml(
  items: Item[], 
  layoutAssignments: (1|'1L'|2|'2-int'|3|4|8)[], 
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
  appendView?: 'none' | 'list' | 'compact-list' | 'table',
  appendInsertIndex?: number | null
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

  return renderMixedGoogleDocsHtml(itemsWithImages, layoutAssignments, title, showFields, hyperlinkToggle, itemBarcodeTypes, barcodeType, bannerColor, websiteName, utmParams, coverData, appendView, appendInsertIndex);
}

async function renderMixedGoogleDocsHtml(
  itemsWithImages: ItemWithImages[], 
  layoutAssignments: (1|'1L'|2|'2-int'|3|4|8)[], 
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
  appendView?: 'none' | 'list' | 'compact-list' | 'table',
  appendInsertIndex?: number | null
) {
  const options: RenderOptions = {
    showFields,
    hyperlinkToggle,
    itemBarcodeTypes,
    barcodeType: barcodeType || "None",
    utmParams
  };

  // Group items by their layout requirements
  const pages: { items: ItemWithImages[]; layout: 1|'1L'|2|'2-int'|3|4|8 }[] = [];
  let currentPage: ItemWithImages[] = [];
  let currentLayout = layoutAssignments[0];
  let itemsInPage = 0;

  itemsWithImages.forEach((itemWithImages, i) => {
    const assignedLayout = layoutAssignments[i];
    
    // If layout changes or page is full, start new page
    const currentLayoutNum = currentLayout === '2-int' ? 2 : (currentLayout === '1L' ? 1 : (typeof currentLayout === 'number' ? currentLayout : 1));
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

  const pageHtmlArray = pages.map((page) => {
    const createProductCard = (itemWithImages: ItemWithImages) => {
      const item = itemWithImages.item;
      if (!item) return '<div class="product-card empty"></div>';
      
      // Find the global index of this item
      const globalIndex = itemsWithImages.findIndex(i => i.item.handle === item.handle);
      
      // Use the shared renderer with the page's layout
      return renderProductCard(item, page.layout, globalIndex, options);
    };

    const layout = page.layout;
    const layoutClass = layout === 1 ? "layout-1" : layout === '1L' ? "layout-1L" : layout === 2 || layout === '2-int' ? "layout-2" : layout === 3 ? "layout-3" : layout === 4 ? "layout-4" : layout === 8 ? "layout-8" : "";
    const cards = page.items.map((itemWithImages) => createProductCard(itemWithImages)).join("");
    
    // Fill empty slots for proper grid layout
    const emptySlots = (layout === '2-int' ? 2 : layout === '1L' ? 1 : (typeof layout === 'number' ? layout : 1)) - page.items.length;
    const emptyCards = Array(emptySlots).fill('<div class="product-card empty"></div>').join("");
    
    return `<div class="page ${layoutClass}" data-layout="${layout}">
      <!-- Header Banner -->
      <div class="page-header" style="background-color: ${bannerColor || '#F7981D'} !important; color: #ffffff !important; text-align: center; padding: 6pt 0; font-weight: 600; font-size: 10.5pt; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
      
      <!-- Content Area -->
      <div class="page-content">
        ${cards}${emptyCards}
      </div>
      
      <!-- Footer Banner -->
      <div class="page-footer" style="background-color: ${bannerColor || '#F7981D'} !important; color: #ffffff !important; text-align: center; padding: 6pt 0; font-weight: 600; font-size: 10.5pt; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
    </div>`;
  });

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
      <div class="page-header" style="background-color:${bannerColor || '#F7981D'};color:#fff;text-align:center;padding:6pt 0;font-weight:600;font-size:10.5pt;">${esc(websiteName || 'www.woodslane.com.au')}</div>
      <div class="page-content" style="display:block;">
        <table style="width:100%;border-collapse:collapse;font-size:7.5pt;box-shadow:0 1.5pt 6pt rgba(0,0,0,0.1)">
          <thead style="background:#667eea;color:#fff">
            <tr>
              <th style="padding:7.5pt 6pt;text-align:left;width:30pt">#</th>
              <th style="padding:7.5pt 6pt;text-align:left;width:83pt">ISBN</th>
              <th style="padding:7.5pt 6pt;text-align:left;width:53pt">Image</th>
              <th style="padding:7.5pt 6pt;text-align:left;width:113pt">Author</th>
              <th style="padding:7.5pt 6pt;text-align:left;">Title</th>
              <th style="padding:7.5pt 6pt;text-align:left;width:60pt">Price</th>
              <th style="padding:7.5pt 6pt;text-align:left;width:113pt">Publisher</th>
              <th style="padding:7.5pt 6pt;text-align:left;width:91pt">Barcode</th>
              <th style="padding:7.5pt 6pt;text-align:center;width:45pt">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${itemsWithImages.map(({item}, idx) => {
              const idObj = (item as unknown as { isbn13?: string; sku?: string });
              const isbnVal = idObj.isbn13 || item.sku || '';
              return `
              <tr style=\"border-bottom:0.75pt solid #e9ecef\">
                <td style=\"padding:6pt 4.5pt;text-align:center;color:#667eea;font-weight:600\">${idx + 1}</td>
                <td style=\"padding:6pt 4.5pt;font-family:'Courier New',monospace;color:#666\">${esc(isbnVal)}</td>
                <td style=\"padding:6pt 4.5pt;text-align:center\"><img src=\"${esc(appendedImageDataUrls[idx])}\" style=\"width:30pt;height:45pt;object-fit:cover;border:0.75pt solid #ddd;border-radius:3pt\"/></td>
                <td style=\"padding:6pt 4.5pt\">${esc(item.author || '-')}</td>
                <td style=\"padding:6pt 4.5pt\">${esc(item.title)}</td>
                <td style=\"padding:6pt 4.5pt;color:#d63384;font-weight:600;text-align:right\">${item.price ? 'AUD$ '+esc(item.price) : '-'}</td>
                <td style=\"padding:6pt 4.5pt;color:#666\">${esc(item.imprint || '-')}</td>
                <td style=\"padding:6pt 4.5pt;text-align:center\">${appendedBarcodeDataUrls[idx] ? `<img src=\\\"${appendedBarcodeDataUrls[idx]}\\\" style=\\\"max-width:83pt;height:auto\\\"/>` : ''}</td>
                <td style=\"padding:6pt 4.5pt\"><div style=\"width:38pt;height:23pt;border:1.5pt solid #333;border-radius:3pt;margin:0 auto\"></div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="page-footer" style="background-color:${bannerColor || '#F7981D'};color:#fff;text-align:center;padding:6pt 0;font-weight:600;font-size:10.5pt;">${esc(websiteName || 'www.woodslane.com.au')}</div>
    </div>`;

  const appendedCompactListHtml = () => `
    <div class="page layout-table" data-layout="compact-list">
      <div class="page-header" style="background-color:${bannerColor || '#F7981D'};color:#fff;text-align:center;padding:6pt 0;font-weight:600;font-size:10.5pt;">${esc(websiteName || 'www.woodslane.com.au')}</div>
      <div class="page-content" style="display:block;">
        <table style="width:100%;border-collapse:collapse;font-size:6pt;box-shadow:0 1.5pt 4.5pt rgba(0,0,0,0.1)">
          <thead style="background:#667eea;color:#fff">
            <tr>
              <th style="padding:6pt 4.5pt;text-align:left;width:23pt">#</th>
              <th style="padding:6pt 4.5pt;text-align:left;width:76pt">ISBN</th>
              <th style="padding:6pt 4.5pt;text-align:left;width:91pt">Author</th>
              <th style="padding:6pt 4.5pt;text-align:left;width:113pt">Title</th>
              <th style="padding:6pt 4.5pt;text-align:right;width:45pt">Price</th>
              <th style="padding:6pt 4.5pt;text-align:left;width:83pt">Publisher</th>
              <th style="padding:6pt 4.5pt;text-align:center;width:76pt">Barcode</th>
              <th style="padding:6pt 4.5pt;text-align:center;width:34pt">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${itemsWithImages.map(({item}, idx) => {
              const idObj = (item as unknown as { isbn13?: string; sku?: string });
              const isbnVal = idObj.isbn13 || item.sku || '';
              return `
              <tr style=\"border-bottom:0.75pt solid #e9ecef\">
                <td style=\"padding:4.5pt;text-align:center;color:#667eea;font-weight:600\">${idx + 1}</td>
                <td style=\"padding:4.5pt;font-family:'Courier New',monospace;color:#666\">${esc(isbnVal)}</td>
                <td style=\"padding:4.5pt\">${esc(item.author || '-')}</td>
                <td style=\"padding:4.5pt\">${esc(item.title)}</td>
                <td style=\"padding:4.5pt;color:#d63384;font-weight:600;text-align:right\">${item.price ? 'AUD$ '+esc(item.price) : '-'}</td>
                <td style=\"padding:4.5pt;color:#666\">${esc(item.imprint || '-')}</td>
                <td style=\"padding:4.5pt;text-align:center\">${appendedBarcodeDataUrls[idx] ? `<img src=\\\"${appendedBarcodeDataUrls[idx]}\\\" style=\\\"max-width:72pt;height:auto\\\"/>` : ''}</td>
                <td style=\"padding:4.5pt;text-align:center\"><div style=\"width:30pt;height:19pt;border:1.5pt solid #333;border-radius:2.25pt;margin:0 auto\"></div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="page-footer" style="background-color:${bannerColor || '#F7981D'};color:#fff;text-align:center;padding:6pt 0;font-weight:600;font-size:10.5pt;">${esc(websiteName || 'www.woodslane.com.au')}</div>
    </div>`;

  const simpleTable = () => `
    <div class="page layout-table" data-layout="table">
      <div class="page-header" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 6pt 0; font-weight: 600; font-size: 10.5pt; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
      <div class="page-content" style="display:block;">
        <table class="grid-table" style="width:100%; border-collapse:collapse; font-size: 8.25pt; border:1.5pt solid #666;">
          <thead class="table-header">
            <tr>
              <th style="text-align:left; padding:4.5pt; border:1.5pt solid #666; background:#f8f9fa;">Title</th>
              <th style="text-align:left; padding:4.5pt; border:1.5pt solid #666; background:#f8f9fa;">Author</th>
              <th style="text-align:left; padding:4.5pt; border:1.5pt solid #666; background:#f8f9fa;">ISBN</th>
              <th style="text-align:left; padding:4.5pt; border:1.5pt solid #666; background:#f8f9fa;">Price</th>
              <th style="text-align:left; padding:4.5pt; border:1.5pt solid #666; background:#f8f9fa;">Disc</th>
              <th style="text-align:left; padding:4.5pt; border:1.5pt solid #666; background:#f8f9fa;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${itemsWithImages.map(({item}) => {
              const idObj = (item as unknown as { isbn13?: string; sku?: string });
              const isbnVal = idObj.isbn13 || item.sku || '';
              return `
              <tr>
                <td style=\"padding:4.5pt; border:0.75pt solid #999;\">${esc(item.title || '')}</td>
                <td style=\"padding:4.5pt; border:0.75pt solid #999;\">${esc(item.author || '')}</td>
                <td style=\"padding:4.5pt; border:0.75pt solid #999;\">${esc(isbnVal)}</td>
                <td style=\"padding:4.5pt; border:0.75pt solid #999;\">${esc(item.price || '')}</td>
                <td style=\"padding:4.5pt; border:0.75pt solid #999;\">${esc(item.imidis || '')}</td>
                <td style=\"padding:4.5pt; border:0.75pt solid #999;\"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="page-footer" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 6pt 0; font-weight: 600; font-size: 10.5pt; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
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

  let mergedPagesHtml = '';
  if (appendedPagesHtml) {
    const insertAt = typeof appendInsertIndex === 'number' && appendInsertIndex >= 0 && appendInsertIndex <= pageHtmlArray.length
      ? appendInsertIndex
      : pageHtmlArray.length;
    const before = pageHtmlArray.slice(0, insertAt).join("");
    const after = pageHtmlArray.slice(insertAt).join("");
    mergedPagesHtml = `${before}${appendedPagesHtml}${after}`;
  } else {
    mergedPagesHtml = pageHtmlArray.join("");
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  @page { 
    size: A4 portrait; 
    margin: 56.69pt 42.52pt 56.69pt 42.52pt; 
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
    background: white !important;
    font-size: 9pt;
  }
  
  /* Ensure text colors are explicit - no background color inheritance on text elements */
  p, div, span, h1, h2, h3, h4, h5, h6, a, li, td, th {
    background-color: transparent !important;
  }
  
  /* Product cards should have white background */
  .product-card {
    background-color: #ffffff !important;
  }
  
  /* Ensure text in product cards has proper colors */
  .product-card * {
    background-color: transparent !important;
  }
  
  .page { 
    display: block;
    page-break-after: always; 
    padding: 0;
    height: 740pt; /* Fixed A4 page height: 297mm - margins = ~740pt */
    max-height: 740pt;
    margin-bottom: 28.35pt;
    overflow: hidden;
    background: white !important;
  }
  
  .page-header, .page-footer {
    width: 100% !important;
    margin: 0 !important;
    position: relative !important;
    left: 0 !important;
    right: 0 !important;
    background-color: inherit !important;
  }
  
  .page-header {
    margin-bottom: 21.26pt;
    height: auto;
  }
  
  .page-footer {
    margin-top: 21.26pt;
    height: auto;
  }
  
  .page-content {
    display: block;
    overflow: hidden;
    height: calc(100% - 100pt); /* Account for header/footer */
    max-height: calc(100% - 100pt);
  }
  
  /* Use flexbox for layout compatibility with Google Docs instead of CSS Grid */
  .page.layout-1 .page-content {
    display: block;
    width: 100%;
    height: calc(100% - 100pt);
    max-height: calc(100% - 100pt);
  }
  
  .page.layout-2 .page-content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
    gap: 21.26pt;
    height: calc(100% - 100pt);
    max-height: calc(100% - 100pt);
  }
  
  .page.layout-2 .page-content > .product-card {
    flex: 0 0 calc(50% - 10.63pt);
    max-width: calc(50% - 10.63pt);
    max-height: calc(100% - 21.26pt);
    overflow: hidden;
  }
  
  .page.layout-1L .page-content {
    display: block;
    width: 100%;
    height: calc(100% - 100pt);
    max-height: calc(100% - 100pt);
  }
  
  /* Layout-3: Stack 3 items vertically with proper spacing */
  .page.layout-3 .page-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 6pt;
    height: calc(100% - 100pt);
    max-height: calc(100% - 100pt);
    overflow-y: hidden;
  }
  
  .page.layout-3 .page-content > .product-card {
    flex: 0 0 auto;
    max-height: calc((100% - 12pt) / 3);
    overflow: hidden;
  }
  
  .page.layout-4 .page-content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
    gap: 21.26pt;
    height: calc(100% - 100pt);
    max-height: calc(100% - 100pt);
    overflow: hidden;
  }
  
  .page.layout-4 .page-content > .product-card {
    flex: 0 0 calc(50% - 10.63pt);
    max-width: calc(50% - 10.63pt);
    max-height: calc((100% - 21.26pt) / 2);
    overflow: hidden;
  }
  
  .page.layout-8 .page-content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
    gap: 14.17pt;
    height: calc(100% - 100pt);
    max-height: calc(100% - 100pt);
    overflow: hidden;
  }
  
  .page.layout-8 .page-content > .product-card {
    flex: 0 0 calc(25% - 10.63pt);
    max-width: calc(25% - 10.63pt);
    max-height: calc((100% - 14.17pt) / 2);
    overflow: hidden;
  }
  
  .product-card {
    display: flex;
    gap: 6pt;
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
  
  /* 1-up layout: Full layout with internals at bottom */
  .layout-1-full {
    display: flex;
    flex-direction: column;
    gap: 15pt;
    padding: 11pt;
    height: 100%;
  }
  
  .layout-1-full .main-content {
    display: flex;
    flex-direction: row;
    gap: 15pt;
    flex: 1;
  }
  
  .layout-1-full .left-column {
    flex-shrink: 0;
    width: 189pt;
    display: flex;
    flex-direction: column;
    gap: 12pt;
  }
  
  .layout-1-full .right-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 9pt;
    min-width: 0;
    overflow: hidden;
  }
  
  .internals-section-full {
    margin-top: auto;
    padding-top: 15pt;
    border-top: 1.5pt solid #e0e0e0;
  }
  
  /* 1L layout: Move internals section closer to bottom of page */
  .layout-1L .internals-section-full {
    margin-top: 7.1pt; /* Reduced spacing from content above (~10px) */
    padding-top: 7.1pt; /* Reduced top padding (~10px) */
    padding-bottom: 0; /* No bottom padding */
    margin-bottom: 0; /* No bottom margin */
  }
  
  .internals-title {
    font-size: 10.5pt;
    font-weight: bold;
    color: #1565C0;
    margin-bottom: 9pt;
    text-align: center;
  }
  
  .internals-thumbnails-full {
    display: flex;
    justify-content: center;
    gap: 11pt;
    flex-wrap: wrap;
  }
  
  .internal-thumbnail-full {
    width: 91pt;
    height: 121pt;
    object-fit: contain;
    border: 0.75pt solid #ddd;
    border-radius: 3pt;
    box-shadow: 0 1.5pt 3pt rgba(0,0,0,0.1);
  }
  
  .product-details-row {
    display: flex;
    gap: 15pt;
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
    max-width: 91pt;
    height: auto;
  }
  
  .layout-1-full .author-bio {
    background: #E3F2FD;
    padding: 7.5pt;
    border-radius: 4.5pt;
    font-size: 7.5pt;
    line-height: 1.3;
    margin-top: 12pt;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .layout-1-full .author-bio.truncated {
    max-height: 151pt;
    overflow: hidden;
  }
  
  .layout-1-full .author-bio.full {
    max-height: none;
    overflow: visible;
  }
  
  .layout-1-full .author-bio-title {
    font-weight: 600;
    margin-bottom: 4.5pt;
    font-size: 7.5pt;
    color: #1565C0;
  }
  
  .layout-1-full .author-bio-content {
    color: #333;
    flex: 1;
  }
  
  /* Page layout 1 specific styles */
  .page.layout-1 .product-image {
    width: 100%;
  }
  
  .page.layout-1 .book-cover {
    width: 100%;
    height: auto;
    max-height: 227pt;
    object-fit: contain;
    border-radius: 3pt;
    border: 0.75pt solid #ddd;
  }
  
  .page.layout-1 .product-title {
    font-size: 15pt;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.2;
    margin-bottom: 3pt;
  }
  
  .page.layout-1 .product-subtitle {
    font-size: 10.5pt;
    color: #666;
    font-style: italic;
    margin-bottom: 3pt;
  }
  
  .page.layout-1 .product-author {
    font-size: 10.5pt;
    color: #333;
    font-weight: 500;
    margin-bottom: 6pt;
  }
  
  .page.layout-1 .product-description {
    font-size: 9pt;
    color: #444;
    line-height: 1.4;
    margin-bottom: 9pt;
  }
  
  .page.layout-1 .product-meta {
    font-size: 9pt;
    display: block !important;
    visibility: visible !important;
    margin-bottom: 6pt;
  }
  
  .page.layout-1 .meta-item {
    font-size: 9pt;
    color: #666;
    margin-bottom: 1.5pt;
    display: block !important;
    visibility: visible !important;
  }
  
  .page.layout-1 .product-price {
    font-size: 12pt;
    font-weight: bold;
    color: #d63384;
    margin-bottom: 6pt;
  }
  
  /* 2-up vertical layout specific styles */
  .layout-2-vertical {
    display: flex;
    flex-direction: column;
    gap: 6pt;
    padding: 6pt;
    border: 0.75pt solid #e0e0e0;
    background: #ffffff;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
  }
  
  .product-image-2up {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 6pt;
  }
  
  .book-cover-2up {
    width: 159pt;
    height: 239pt;
    object-fit: contain;
    border: 0.75pt solid #ddd;
    border-radius: 3pt;
    box-shadow: 0 1.5pt 3pt rgba(0,0,0,0.1);
  }
  
  .product-content-2up {
    display: flex;
    flex-direction: column;
    gap: 3pt;
    flex: 1;
    overflow: hidden;
  }
  
  .layout-2-vertical .product-title {
    font-size: 13.5pt;
    font-weight: bold;
    color: #000;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .product-subtitle {
    font-size: 10.5pt;
    font-style: italic;
    color: #666;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .product-author {
    font-size: 10.5pt;
    color: #444;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .product-description {
    font-size: 9.75pt;
    color: #333;
    line-height: 1.3;
    margin: 3pt 0;
    text-align: justify;
    font-family: 'Calibri', sans-serif;
    max-height: 45pt;
    overflow: hidden;
  }
  
  .layout-2-vertical .product-specs {
    display: flex;
    flex-wrap: wrap;
    gap: 3pt;
    margin-bottom: 3pt;
  }
  
  .layout-2-vertical .spec-item {
    font-size: 9pt;
    color: #666;
    background: #f5f5f5;
    padding: 1.5pt 3pt;
    border-radius: 2.25pt;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .product-meta {
    margin-bottom: 3pt;
    display: block !important;
    visibility: visible !important;
  }
  
  .layout-2-vertical .meta-item {
    font-size: 9pt;
    color: #666;
    margin-bottom: 0.75pt;
    font-family: 'Calibri', sans-serif;
    display: block !important;
    visibility: visible !important;
  }
  
  .layout-2-vertical .product-price {
    font-size: 10.5pt;
    font-weight: bold;
    color: #d63384;
    margin-bottom: 3pt;
    font-family: 'Calibri', sans-serif;
  }
  
  .layout-2-vertical .barcode {
    margin-top: auto;
    text-align: center;
    flex-shrink: 0;
  }
  
  .layout-2-vertical .barcode img {
    max-width: 67pt;
    height: auto;
  }
  
  .page.layout-2 .product-image {
    width: 132pt;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .page.layout-2 .book-cover {
    width: 132pt;
    height: 199pt;
    object-fit: contain;
    border-radius: 3pt;
    border: 0.75pt solid #ddd;
    box-shadow: 0 1.5pt 3pt rgba(0,0,0,0.1);
  }
  
  .page.layout-2 .product-title {
    font-size: 12pt;
    font-family: 'Calibri', sans-serif;
  }
  
  .page.layout-2 .product-subtitle {
    font-size: 9pt;
    font-family: 'Calibri', sans-serif;
  }
  
  .page.layout-2 .product-author {
    font-size: 9pt;
    font-family: 'Calibri', sans-serif;
  }
  
  .page.layout-2 .product-description {
    font-size: 8.25pt;
    font-family: 'Calibri', sans-serif;
  }
  
  .page.layout-2 .product-meta {
    display: block !important;
    visibility: visible !important;
    margin-bottom: 3pt;
  }
  
  .page.layout-2 .meta-item {
    font-size: 9pt;
    font-family: 'Calibri', sans-serif;
    display: block !important;
    visibility: visible !important;
    color: #666;
    margin-bottom: 0.75pt;
  }
  
  .page.layout-2 .spec-item {
    font-size: 9pt;
    font-family: 'Calibri', sans-serif;
  }
  
  .page.layout-2 .product-price {
    font-size: 10.5pt;
    font-family: 'Calibri', sans-serif;
  }
  
  /* 3-up layout specific styles - use flexbox instead of grid for Google Docs compatibility */
  .layout-3-row {
    display: flex;
    flex-direction: row;
    gap: 7.5pt;
    padding: 7.5pt;
    border: 0.75pt solid #e0e0e0;
    background: #ffffff;
    height: 100%;
    max-height: 100%;
    max-width: 100%;
    overflow: hidden;
  }
  
  /* Ensure layout-3 product cards fit properly */
  .page.layout-3 .layout-3-row {
    height: 100%;
    max-height: calc((100% - 12pt) / 3);
    min-height: 0;
  }
  
  .product-image-3up {
    flex-shrink: 0;
    width: 160pt;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  
  .product-image-3up .book-cover {
    width: 156pt;
    height: 207pt;
    object-fit: contain;
    border: 0.75pt solid #ddd;
    border-radius: 3pt;
    box-shadow: 0 1.5pt 3pt rgba(0,0,0,0.1);
  }
  
  .product-content-3up {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 90%;
  }
  
  .product-content-3up .product-title {
    font-size: 10.5pt;
    font-weight: bold;
    color: #000;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-content-3up .product-subtitle {
    font-size: 9pt;
    font-style: italic;
    color: #666;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-content-3up .product-author {
    font-size: 9pt;
    color: #444;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-description-3up {
    font-size: 8.25pt;
    color: #333;
    line-height: 1.3;
    margin-top: 4.5pt;
    padding: 4.5pt;
    border: 0.75pt solid #e0e0e0;
    background: #ffffff;
    max-height: 91pt;
    overflow: hidden;
    text-align: justify;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-details-3up {
    flex-shrink: 0;
    width: 76pt;
    display: flex;
    flex-direction: column;
    gap: 1.5pt;
    font-size: 7.5pt;
    color: #333;
    border: 0.75pt solid #e0e0e0;
    padding: 4.5pt;
    background: #ffffff;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-details-3up .detail-value {
    padding: 1.5pt 3pt;
    border-bottom: 0.75pt solid #f0f0f0;
    line-height: 1.3;
  }
  
  .product-details-3up .detail-value:last-child {
    border-bottom: none;
  }
  
  .product-details-3up .barcode {
    margin-top: 6pt;
    padding: 0;
  }
  
  .product-details-3up .barcode img {
    max-width: 100%;
    height: auto;
  }
  
  .page.layout-3 .product-image {
    width: 60pt;
  }
  
  .page.layout-3 .book-cover {
    width: 156pt;
    height: 207pt;
    object-fit: contain;
    border-radius: 3pt;
    border: 0.75pt solid #ddd;
    box-shadow: 0 1.5pt 3pt rgba(0,0,0,0.1);
  }
  
  .page.layout-3 .product-title {
    font-size: 10.5pt;
  }
  
  .page.layout-3 .product-subtitle {
    font-size: 8.25pt;
  }
  
  .page.layout-3 .product-author {
    font-size: 8.25pt;
  }
  
  .page.layout-3 .product-description {
    font-size: 7.5pt;
  }
  
  .page.layout-3 .product-price {
    font-size: 9.75pt;
  }
  
  /* Layout 4: Special 4-up layout with larger image and reorganized content */
  .layout-4-special {
    display: flex;
    flex-direction: column;
    gap: 4.5pt;
    padding: 4.5pt;
    border: 0.75pt solid #e0e0e0;
    background: #ffffff;
    min-height: 106pt;
    max-width: 100%;
    overflow: hidden;
  }
  
  .layout-4-special .top-section {
    display: flex;
    gap: 4.5pt;
    align-items: flex-start;
  }
  
  .product-image-4up {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .book-cover-4up {
    width: 67pt;
    height: 100pt;
    object-fit: contain;
    border: 0.75pt solid #ddd;
    border-radius: 3pt;
    box-shadow: 0 1.5pt 3pt rgba(0,0,0,0.1);
  }
  
  .title-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5pt;
  }
  
  .product-title-4up {
    font-size: 10pt;
    font-weight: bold;
    color: #000;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-subtitle-4up {
    font-size: 9pt;
    font-style: italic;
    color: #666;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-author-4up {
    font-size: 9pt;
    color: #444;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .description-section {
    margin-top: 2.25pt;
  }
  
  .product-description-4up {
    font-size: 9pt;
    color: #333;
    line-height: 1.2;
    text-align: justify;
    font-family: 'Calibri', sans-serif;
  }
  
  .bottom-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 2.25pt;
  }
  
  .product-details-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2.25pt;
  }
  
  .product-specs-4up {
    display: flex;
    flex-wrap: wrap;
    gap: 2.25pt;
  }
  
  .spec-item-4up {
    font-size: 8.25pt;
    color: #666;
    background: #f5f5f5;
    padding: 1.5pt 3pt;
    border-radius: 2.25pt;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-meta-4up {
    display: flex;
    flex-direction: column;
    gap: 0.75pt;
  }
  
  .meta-item-4up {
    font-size: 8.25pt;
    color: #666;
    margin-bottom: 0pt;
    font-family: 'Calibri', sans-serif;
  }
  
  .barcode-section-right {
    flex-shrink: 0;
    text-align: center;
    margin-left: 4.5pt;
  }
  
  .barcode-section-right .barcode img {
    max-width: 63pt;
    height: auto;
  }
  
  /* Common styles */
  .product-image {
    flex-shrink: 0;
    width: 45pt;
  }
  
  .book-cover {
    width: 45pt;
    height: 68pt;
    object-fit: contain;
    border: 0.75pt solid #ddd;
    border-radius: 3pt;
    box-shadow: 0 1.5pt 3pt rgba(0,0,0,0.1);
  }
  
  .product-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3pt;
    justify-content: space-between;
  }
  
  .product-title {
    font-size: 9pt;
    font-weight: bold;
    color: #000;
    line-height: 1.2;
    margin-bottom: 1.5pt;
  }
  
  .product-subtitle {
    font-size: 7.5pt;
    color: #666;
    font-style: italic;
    margin-bottom: 1.5pt;
  }
  
  .product-author {
    font-size: 7.5pt;
    color: #000;
    font-weight: 500;
    margin-bottom: 2.25pt;
  }
  
  .product-description {
    font-size: 6.75pt;
    color: #333;
    line-height: 1.3;
    margin-bottom: 3pt;
    text-align: justify;
  }
  
  .product-specs {
    display: flex;
    flex-wrap: wrap;
    gap: 6pt;
    margin-bottom: 3pt;
  }
  
  .spec-item {
    font-size: 6pt;
    color: #666;
    background: #f5f5f5;
    padding: 1.5pt 3pt;
    border-radius: 2.25pt;
  }
  
  .product-meta {
    margin-bottom: 4.5pt;
  }
  
  .meta-item {
    font-size: 6pt;
    color: #666;
    margin-bottom: 1.5pt;
  }
  
  .product-price {
    font-size: 8.25pt;
    font-weight: bold;
    color: #d63384;
    margin-bottom: 3pt;
  }
  
  .barcode {
    margin-top: auto;
    text-align: center;
    flex-shrink: 0;
    display: block !important;
    visibility: visible !important;
  }
  
  .barcode img {
    display: block !important;
    visibility: visible !important;
    max-width: 100%;
    height: auto;
  }
  
  .qr-code {
    width: 23pt;
    height: 23pt;
    display: block !important;
    visibility: visible !important;
  }
  
  .ean13-barcode {
    width: 57pt;
    height: 23pt;
    display: block !important;
    visibility: visible !important;
  }
  
  .barcode-text {
    font-size: 6pt;
    text-align: center;
    margin-top: 1.5pt;
    color: #666;
    display: block !important;
    visibility: visible !important;
  }
  
  .barcode-fallback {
    font-size: 6pt;
    color: #666;
    text-align: center;
    padding: 3pt;
    border: 1.5pt dashed #ccc;
    background: #f9f9f9;
    margin-top: 3pt;
    display: block !important;
    visibility: visible !important;
  }
  
  /* Internal image styles for 2-int layout */
  .internal-image-section {
    display: flex;
    justify-content: center;
    gap: 6pt;
    margin: 6pt 0;
  }
  
  .internal-preview-image {
    width: 76pt;
    height: 100pt;
    object-fit: cover;
    border: 0.75pt solid #ddd;
    border-radius: 3pt;
    box-shadow: 0 0.75pt 2.25pt rgba(0,0,0,0.1);
  }
  
  .page.layout-4 .product-image {
    width: 45pt;
  }
  
  .page.layout-8 .product-image {
    width: 30pt;
  }
  
  .page.layout-8 .book-cover {
    width: 30pt;
    height: 45pt;
  }
  
  .page.layout-8 .product-title {
    font-size: 7.5pt;
  }
  
  .page.layout-8 .product-subtitle {
    font-size: 6pt;
  }
  
  .page.layout-8 .product-author {
    font-size: 6pt;
  }
  
  .page.layout-8 .product-description {
    font-size: 5.25pt;
  }
  
  .page.layout-8 .product-price {
    font-size: 6.75pt;
  }
  
  /* Internal images orientation handling */
  .internal-preview-image.image-portrait,
  .internal-thumbnail-full.image-portrait {
    object-fit: contain;
  }
  
  .internal-preview-image.image-landscape {
    object-fit: cover;
    width: 100pt;
    height: 76pt;
    max-width: 100pt;
    max-height: 76pt;
  }
  
  /* Landscape vs Portrait Image Detection */
  .book-cover.image-portrait {
    /* Portrait images - taller than wide */
    object-fit: contain;
  }
  
  .book-cover.image-landscape {
    /* Landscape images - wider than tall */
    object-fit: cover;
    width: 100%;
    max-width: 100%;
  }
  
  .book-cover-2up.image-portrait,
  .book-cover-4up.image-portrait {
    object-fit: contain;
  }
  
  .book-cover-2up.image-landscape,
  .book-cover-4up.image-landscape {
    object-fit: cover;
    width: 100%;
    height: auto;
  }
  
  /* Adjust container for landscape images */
  .product-image-2up .image-landscape {
    width: 100%;
    height: auto;
    max-height: 199pt;
  }
  
  .product-image-4up .image-landscape {
    width: 100%;
    height: auto;
    max-height: 100pt;
  }
  
  .page.layout-1 .product-image .image-landscape {
    max-height: 227pt;
    width: 100%;
  }
  
  /* Cover Styles */
  ${coverCSS}
  
  @media print {
    .page {
      page-break-after: always;
    }
  }
</style>
<script>
  // Detect image orientation and apply classes
  (function() {
    function detectImageOrientation() {
      const images = document.querySelectorAll('img.book-cover, img.book-cover-large, img.book-cover-2up, img.book-cover-4up, img.internal-thumbnail-full, img.internal-preview-image');
      images.forEach(img => {
        // Skip if already processed
        if (img.classList.contains('image-portrait') || img.classList.contains('image-landscape')) {
          return;
        }
        
        if (img.complete && img.naturalWidth && img.naturalHeight) {
          // Image already loaded
          if (img.naturalWidth > img.naturalHeight) {
            img.classList.add('image-landscape');
          } else {
            img.classList.add('image-portrait');
          }
        } else {
          // Wait for image to load
          img.addEventListener('load', function() {
            if (this.naturalWidth > this.naturalHeight) {
              this.classList.add('image-landscape');
            } else {
              this.classList.add('image-portrait');
            }
          }, { once: true });
        }
      });
    }
    
    // Run on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', detectImageOrientation);
    } else {
      detectImageOrientation();
    }
    
    // Also run after a short delay to catch dynamically loaded images
    setTimeout(detectImageOrientation, 100);
  })();
</script>
</head>
<body>
  ${frontCoverHtml}
  ${mergedPagesHtml}
  ${backCoverHtml}
</body>
</html>`;
}
