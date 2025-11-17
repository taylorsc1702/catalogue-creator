import type { NextApiRequest, NextApiResponse } from "next";
import {
  Item,
  HyperlinkToggle,
  BarcodeType,
  UtmParams,
  RenderOptions,
  esc,
  renderProductCard,
  generateProductUrl,
  generateEAN13Barcode,
  generateQRCode
} from "../../../utils/product-card-renderer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layoutAssignments, showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', pageHeaders, utmParams, coverData, appendView, appendInsertIndex, itemInternalsCount1L, internalsCount1L, urlPages } = req.body as {
      items: Item[]; 
      layoutAssignments: (1|'1L'|2|'2-int'|3|4|8)[]; 
      showFields: Record<string, boolean>;
      hyperlinkToggle?: HyperlinkToggle;
      itemBarcodeTypes?: {[key: number]: BarcodeType};
      barcodeType?: BarcodeType;
      bannerColor?: string;
      websiteName?: string;
      pageHeaders?: string[]; // Optional array of custom header text for each page (by page index)
      utmParams?: UtmParams;
      itemInternalsCount1L?: {[key: number]: number}; // Per-item internals count for 1L layout (1-4)
      internalsCount1L?: number; // Default number of internals to display for 1L layout (1-4)
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
      appendView?: 'none' | 'list' | 'compact-list' | 'table';
      appendInsertIndex?: number | null;
      urlPages?: Array<{url: string; title?: string; pageIndex?: number | null}>;
    };
    
    if (!items?.length) throw new Error("No items provided");
    if (!layoutAssignments?.length) throw new Error("No layout assignments provided");
    if (items.length !== layoutAssignments.length) throw new Error("Items and layout assignments must be same length");
    
    const html = await renderMixedHtml(items, layoutAssignments, showFields || {}, hyperlinkToggle, itemBarcodeTypes, barcodeType, bannerColor, websiteName, pageHeaders, utmParams, coverData, appendView, appendInsertIndex, itemInternalsCount1L, internalsCount1L, urlPages);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render mixed layout HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

async function renderMixedHtml(items: Item[], layoutAssignments: (1|'1L'|2|'2-int'|3|4|8)[], showFields: Record<string, boolean>, hyperlinkToggle: HyperlinkToggle, itemBarcodeTypes?: {[key: number]: BarcodeType}, barcodeType?: BarcodeType, bannerColor?: string, websiteName?: string, pageHeaders?: string[], utmParams?: UtmParams, coverData?: {
  showFrontCover: boolean;
  showBackCover: boolean;
  frontCoverText1: string;
  frontCoverText2: string;
  backCoverText1: string;
  backCoverText2: string;
  coverImageUrls: string[]; // New: Direct image URLs
  catalogueName: string;
}, appendView?: 'none' | 'list' | 'compact-list' | 'table', appendInsertIndex?: number | null, itemInternalsCount1L?: {[key: number]: number}, internalsCount1L?: number, urlPages?: Array<{url: string; title?: string; pageIndex?: number | null}>) {
  const options: RenderOptions & { itemInternalsCount1L?: {[key: number]: number}; internalsCount1L?: number } = {
    showFields,
    hyperlinkToggle,
    itemBarcodeTypes,
    barcodeType: barcodeType || "None",
    utmParams,
    itemInternalsCount1L: itemInternalsCount1L,
    internalsCount1L: internalsCount1L || 2
  };

  // Group items by their layout requirements
  const pages: { items: Item[]; layout: 1|'1L'|2|'2-int'|3|4|8 }[] = [];
  let currentPage: Item[] = [];
  let currentLayout = layoutAssignments[0];
  let itemsInPage = 0;

  items.forEach((item, i) => {
    const assignedLayout = layoutAssignments[i];
    
    // If layout changes or page is full, start new page
    const currentLayoutNum = currentLayout === '2-int' ? 2 : currentLayout === '1L' ? 1 : typeof currentLayout === 'number' ? currentLayout : 1;
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

  const pageHtmlArray = pages.map((page, pageIndex) => {
    const createProductCard = (it: Item) => {
      // Find the global index of this item
      const globalIndex = items.findIndex(item => item.handle === it.handle);
      
      // Use the shared renderer with the page's layout
      return renderProductCard(it, page.layout, globalIndex, options);
    };

    const layout = page.layout;
    const layoutClass = layout === 1 ? "layout-1" : layout === '1L' ? "layout-1L" : layout === 2 || layout === '2-int' ? "layout-2" : layout === 3 ? "layout-3" : layout === 4 ? "layout-4" : layout === 8 ? "layout-8" : "";
    const cards = page.items.map((item) => createProductCard(item)).join("");
    
    // Fill empty slots for proper grid layout
    const emptySlots = (layout === '2-int' ? 2 : layout === '1L' ? 1 : typeof layout === 'number' ? layout : 1) - page.items.length;
    const emptyCards = Array(emptySlots).fill('<div class="product-card empty"></div>').join("");
    
    // Use custom header for this page if provided, otherwise use default websiteName
    const pageHeaderText = (pageHeaders && pageHeaders[pageIndex] !== undefined && pageHeaders[pageIndex] !== null && pageHeaders[pageIndex] !== '') 
      ? pageHeaders[pageIndex] 
      : (websiteName || 'www.woodslane.com.au');
    
    return `<div class="page ${layoutClass}" data-layout="${layout}">
      <!-- Header Banner -->
      <div class="page-header" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
        ${esc(pageHeaderText)}
      </div>
      
      <!-- Content Area -->
      <div class="page-content">
        ${cards}${emptyCards}
      </div>
      
      <!-- Footer Banner -->
      <div class="page-footer" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px; width: 100%; margin: 0; position: relative; left: 0; right: 0;">
        ${esc(pageHeaderText)}
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
  const renderListRows = (_compact: boolean) => items.map((it, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(it.title || '')}</td>
        <td>${esc(it.author || '')}</td>
        <td>${esc(((it as unknown) as {isbn13?: string}).isbn13 || it.sku || '')}</td>
        <td>${esc(it.price ? `AUD$ ${it.price}` : '')}</td>
      </tr>
    `).join('');

  // Precompute barcode data URLs for appended views
  const appendedBarcodeDataUrls = items.map((it, idx) => {
    const itemType = (itemBarcodeTypes && itemBarcodeTypes[idx]) || (barcodeType || 'None');
    const url = generateProductUrl(it.handle, hyperlinkToggle, utmParams);
    const idObj = (it as unknown as { isbn13?: string; sku?: string });
    let ean13 = idObj.isbn13 || it.sku || it.handle.replace(/[^0-9]/g, '');
    if (!ean13) ean13 = ''.padStart(13, '0');
    if (ean13.length < 13) ean13 = ean13.padStart(13, '0');
    if (ean13.length > 13) ean13 = ean13.substring(0, 13);
    return itemType === 'EAN-13' ? generateEAN13Barcode(ean13) : (itemType === 'QR Code' ? generateQRCode(url) : '');
  });

  // Generate URL page HTML
  const generateUrlPageHtml = (urlPage: {url: string; title?: string}) => {
    // Check if URL is an image by file extension
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(urlPage.url);
    
    let pageTitle = urlPage.title || '';
    try {
      if (!pageTitle) {
        const urlObj = new URL(urlPage.url);
        pageTitle = urlObj.hostname.replace('www.', '');
      }
    } catch {
      pageTitle = urlPage.url;
    }
    const qrCodeUrl = generateQRCode(urlPage.url);
    
    if (isImage) {
      // Display image directly in A4 format
      return `
        <div class="page url-page" style="page-break-after: always;">
          <div class="page-header" style="background-color: ${bannerColor || '#F7981D'}; color: white; padding: 12px 15mm; text-align: center; font-weight: 600; font-size: 14px;">
            ${esc(websiteName || 'www.woodslane.com.au')}
          </div>
          <div class="page-content" style="padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(297mm - 100px - 80px); text-align: center; overflow: hidden;">
            <img 
              src="${esc(urlPage.url)}" 
              alt="${esc(pageTitle)}" 
              style="width: 100%; height: auto; max-height: calc(297mm - 100px - 80px); object-fit: contain; display: block;"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
            />
            <div style="display: none; padding: 40px 15mm; text-align: center;">
              <p style="font-size: 16px; color: #dc3545; margin-bottom: 20px;">Failed to load image</p>
              <p style="font-size: 14px; color: #666; margin-bottom: 20px; word-break: break-all;">
                <a href="${esc(urlPage.url)}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">
                  ${esc(urlPage.url)}
                </a>
              </p>
              ${qrCodeUrl ? `
                <div style="margin-bottom: 20px;">
                  <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; border: 2px solid #ddd; border-radius: 8px; padding: 10px; background: white;" />
                </div>
              ` : ''}
            </div>
          </div>
          <div class="page-footer" style="background-color: ${bannerColor || '#F7981D'}; color: white; padding: 12px 15mm; text-align: center; font-weight: 600; font-size: 14px;">
            ${esc(websiteName || 'www.woodslane.com.au')}
          </div>
        </div>
      `;
    }
    
    // Non-image URL: show QR code and link
    return `
      <div class="page url-page" style="page-break-after: always;">
        <div class="page-header" style="background-color: ${bannerColor || '#F7981D'}; color: white; padding: 12px 15mm; text-align: center; font-weight: 600; font-size: 14px;">
          ${esc(websiteName || 'www.woodslane.com.au')}
        </div>
        <div class="page-content" style="padding: 40px 15mm; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(297mm - 100px - 80px); text-align: center;">
          <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 20px;">${esc(pageTitle)}</h1>
          <p style="font-size: 16px; color: #666; margin-bottom: 40px; max-width: 500px; word-break: break-all;">
            <a href="${esc(urlPage.url)}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">
              ${esc(urlPage.url)}
            </a>
          </p>
          ${qrCodeUrl ? `
            <div style="margin-bottom: 30px;">
              <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; border: 2px solid #ddd; border-radius: 8px; padding: 10px; background: white;" />
            </div>
          ` : ''}
          <p style="font-size: 14px; color: #999; margin-top: 20px;">
            Scan the QR code or click the link above to visit this page
          </p>
        </div>
        <div class="page-footer" style="background-color: ${bannerColor || '#F7981D'}; color: white; padding: 12px 15mm; text-align: center; font-weight: 600; font-size: 14px;">
          ${esc(websiteName || 'www.woodslane.com.au')}
        </div>
      </div>
    `;
  };

  const appendedListHtml = () => `
    <div class="page layout-table" data-layout="list" style="page-break-after: always;">
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
            ${items.map((it, idx) => `
              <tr style=\"border-bottom:1px solid #e9ecef\">
                <td style=\"padding:8px 6px;text-align:center;color:#667eea;font-weight:600\">${idx + 1}</td>
                <td style=\"padding:8px 6px;font-family:'Courier New',monospace;color:#666\">${esc(it.handle)}</td>
                <td style=\"padding:8px 6px;text-align:center\"><img src=\"${esc(it.imageUrl || 'https://via.placeholder.com/40x60?text=No+Image')}\" style=\"width:40px;height:60px;object-fit:cover;border:1px solid #ddd;border-radius:4px\"/></td>
                <td style=\"padding:8px 6px\">${esc(it.author || '-')}</td>
                <td style=\"padding:8px 6px\">${esc(it.title)}</td>
                <td style=\"padding:8px 6px;color:#000000;font-weight:600;text-align:right\">${it.price ? 'AUD$ '+esc(it.price) : '-'}</td>
                <td style=\"padding:8px 6px;color:#666\">${esc(it.imprint || '-')}</td>
                <td style=\"padding:8px 6px;text-align:center\">${appendedBarcodeDataUrls[idx] ? `<img src=\\\"${appendedBarcodeDataUrls[idx]}\\\" style=\\\"max-width:110px;height:auto\\\"/>` : ''}</td>
                <td style=\"padding:8px 6px\"><div style=\"width:50px;height:30px;border:2px solid #333;border-radius:4px;margin:0 auto\"></div></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="page-footer" style="background-color:${bannerColor || '#F7981D'};color:#fff;text-align:center;padding:8px 0;font-weight:600;font-size:14px;">${esc(websiteName || 'www.woodslane.com.au')}</div>
    </div>`;

  const appendedCompactListHtml = () => `
    <div class="page layout-table" data-layout="compact-list" style="page-break-after: always;">
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
            ${items.map((it, idx) => `
              <tr style=\"border-bottom:1px solid #e9ecef\">
                <td style=\"padding:6px;text-align:center;color:#667eea;font-weight:600\">${idx + 1}</td>
                <td style=\"padding:6px;font-family:'Courier New',monospace;color:#666\">${esc(it.handle)}</td>
                <td style=\"padding:6px\">${esc(it.author || '-')}</td>
                <td style=\"padding:6px\">${esc(it.title)}</td>
                <td style=\"padding:6px;color:#000000;font-weight:600;text-align:right\">${it.price ? 'AUD$ '+esc(it.price) : '-'}</td>
                <td style=\"padding:6px;color:#666\">${esc(it.imprint || '-')}</td>
                <td style=\"padding:6px;text-align:center\">${appendedBarcodeDataUrls[idx] ? `<img src=\\\"${appendedBarcodeDataUrls[idx]}\\\" style=\\\"max-width:95px;height:auto\\\"/>` : ''}</td>
                <td style=\"padding:6px;text-align:center\"><div style=\"width:40px;height:25px;border:2px solid #333;border-radius:3px;margin:0 auto\"></div></td>
              </tr>`).join('')}
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
        <table class="grid-table" style="width:100%; border-collapse:collapse; font-size: 11px; border:2px solid #666;">
          <thead class="table-header">
            <tr>
              <th style="text-align:left; padding:6px; border:2px solid #666; background:#f8f9fa;">Title</th>
              <th style="text-align:left; padding:6px; border:2px solid #666; background:#f8f9fa;">Author</th>
              <th style="text-align:left; padding:6px; border:2px solid #666; background:#f8f9fa;">ISBN</th>
              <th style="text-align:left; padding:6px; border:2px solid #666; background:#f8f9fa;">Price</th>
              <th style="text-align:left; padding:6px; border:2px solid #666; background:#f8f9fa;">Disc</th>
              <th style="text-align:left; padding:6px; border:2px solid #666; background:#f8f9fa;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => {
              const idObj = (it as unknown as { isbn13?: string; sku?: string });
              const isbnVal = idObj.isbn13 || it.sku || '';
              return `
              <tr>
                <td style=\"padding:6px; border:1px solid #999;\">${esc(it.title || '')}</td>
                <td style=\"padding:6px; border:1px solid #999;\">${esc(it.author || '')}</td>
                <td style=\"padding:6px; border:1px solid #999;\">${esc(isbnVal)}</td>
                <td style=\"padding:6px; border:1px solid #999;\">${esc(it.price || '')}</td>
                <td style=\"padding:6px; border:1px solid #999;\">${esc(it.imidis || '')}</td>
                <td style=\"padding:6px; border:1px solid #999;\"></td>
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

  // Generate URL pages if requested - sorted by pageIndex
  const urlPagesSorted = (urlPages || [])
    .map((p, idx) => ({ ...p, originalIndex: idx }))
    .filter(p => p.url.trim() && p.pageIndex !== null && p.pageIndex !== undefined)
    .sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));
  
  // Insert URL pages into pageHtmlArray at their specified indices
  const pagesWithUrlPages: (string | {type: 'URL_PAGE'; url: string; title?: string})[] = [];
  let urlPageIndex = 0;
  
  for (let i = 0; i < pageHtmlArray.length; i++) {
    // Check if any URL page should be inserted before this page
    while (urlPageIndex < urlPagesSorted.length && urlPagesSorted[urlPageIndex].pageIndex === i) {
      pagesWithUrlPages.push({
        type: 'URL_PAGE',
        url: urlPagesSorted[urlPageIndex].url,
        title: urlPagesSorted[urlPageIndex].title
      });
      urlPageIndex++;
    }
    pagesWithUrlPages.push(pageHtmlArray[i]);
  }
  
  // Add any remaining URL pages at the end
  while (urlPageIndex < urlPagesSorted.length) {
    pagesWithUrlPages.push({
      type: 'URL_PAGE',
      url: urlPagesSorted[urlPageIndex].url,
      title: urlPagesSorted[urlPageIndex].title
    });
    urlPageIndex++;
  }
  
  // Convert URL page objects to HTML
  const pagesWithUrlPagesHtml = pagesWithUrlPages.map(p => {
    if (typeof p === 'object' && 'type' in p && p.type === 'URL_PAGE') {
      return generateUrlPageHtml(p);
    }
    return p as string;
  });

  // Merge pages with optional appended view at desired index
  let mergedPagesHtml = '';
  if (appendedPagesHtml) {
    const insertAt = typeof appendInsertIndex === 'number' && appendInsertIndex >= 0 && appendInsertIndex <= pagesWithUrlPagesHtml.length
      ? appendInsertIndex
      : pagesWithUrlPagesHtml.length; // default to end
    const before = pagesWithUrlPagesHtml.slice(0, insertAt).join("");
    const after = pagesWithUrlPagesHtml.slice(insertAt).join("");
    mergedPagesHtml = `${before}${appendedPagesHtml}${after}`;
  } else {
    mergedPagesHtml = pagesWithUrlPagesHtml.join("");
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
  width: 206px; /* align with 3-up image size */
  height: 274px;
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
    color: #000000;
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
  width: 210px;
  height: 316px;
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
  font-size: 18px;
    font-weight: bold;
    color: #000;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
.layout-2-vertical .product-subtitle {
  font-size: 14px;
    font-style: italic;
    color: #666;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
.layout-2-vertical .product-author {
  font-size: 14px;
    color: #444;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
.layout-2-vertical .product-description {
  font-size: 13px;
    color: #333;
    line-height: 1.3;
    margin: 4px 0;
    text-align: justify;
    font-family: 'Calibri', sans-serif;
    /* Removed max-height constraint to allow full description to display */
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
    color: #000000;
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
  
  /* Book cover image for layout-1-full - same size as 1-up */
  .layout-1-full .product-image {
    width: 100%;
  }
  
  .layout-1-full .book-cover {
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: contain;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  /* Text sizes for layout-1-full - same as 1-up */
  .layout-1-full .product-title {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
    line-height: 1.3;
  }
  
  .layout-1-full .product-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
    font-style: italic;
  }
  
  .layout-1-full .product-author {
    font-size: 13px;
    color: #444;
    font-weight: 500;
    margin: 0;
  }
  
  .layout-1-full .product-description {
    font-size: 11px;
    line-height: 1.4;
    color: #333;
    margin: 0;
  }
  
  .layout-1-full .product-meta {
    font-size: 12px;
  }
  
  .layout-1-full .meta-item {
    margin-bottom: 4px;
  }
  
  .layout-1-full .product-price {
    font-size: 16px;
    font-weight: bold;
    color: #000000;
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
  
  /* Increase author bio max-height for 1L layout to give more room */
  .layout-1L .author-bio.truncated {
    max-height: 280px; /* Increased from 200px to give more room */
    overflow: hidden;
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
  
  .internals-section-full {
    margin-top: auto;
    padding-top: 20px;
    border-top: 2px solid #e0e0e0;
  }
  
  /* 1L layout: Move internals section down to avoid overlap with author bio - match html.ts exactly */
  .layout-1L .internals-section-full {
    margin-top: 15px; /* Small positive margin to ensure it doesn't overlap with author bio above - matches html.ts */
    padding-top: 5px; /* Minimal top padding */
    padding-bottom: 0; /* No bottom padding */
    margin-bottom: 0; /* No bottom margin */
    border-top: 2px solid #e0e0e0;
  }
  
  /* Reduce gap in layout-1-full for 1L to minimize space above internals */
  .layout-1L.layout-1-full {
    gap: 5px; /* Small gap between main-content and internals-section to prevent overlap */
  }
  
  /* Reduce margin below internals title for 1L */
  .layout-1L .internals-title {
    margin-bottom: 6px; /* Reduced from 12px */
  }
  
  /* Ensure 1L layout fits on page and doesn't push footer off */
  .page.layout-1L {
    max-height: 297mm; /* A4 height constraint */
    overflow: hidden;
  }
  
  .page.layout-1L .page-content {
    max-height: calc(297mm - 60mm); /* Minus header/footer heights */
    overflow: hidden;
  }
  
  .page.layout-1L .layout-1-full {
    max-height: 100%;
    overflow: hidden;
  }
  
  /* 1L layout: Use flexible grid for internals (1-4 images) */
  .layout-1L .internals-thumbnails-full {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr); /* 2 columns - will adapt based on number of images */
    grid-auto-rows: auto; /* Auto rows based on content */
    gap: 12px; /* Reduced from 20px to minimize padding */
    width: 100%;
    justify-items: center;
  }
  
  /* Adjust grid for 1 internal - single column */
  .layout-1L .internals-thumbnails-full:has(img:only-child) {
    grid-template-columns: 1fr;
  }
  
  .layout-1L .internal-thumbnail-full {
    width: 100%;
    max-width: 250px;
    height: auto;
    max-height: 200px; /* Constrain height to prevent overflow */
    object-fit: contain; /* Show full image without cropping */
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  /* Landscape vs Portrait handling for 1L internal images */
  .layout-1L .internal-thumbnail-full.image-portrait {
    object-fit: contain;
    max-height: 200px; /* Constrain height */
  }
  
  .layout-1L .internal-thumbnail-full.image-landscape {
    object-fit: contain; /* Changed from cover to contain to show full image */
    max-height: 200px; /* Constrain height */
  }
  
  @media print {
    .layout-1L .internals-thumbnails-full {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      grid-template-rows: auto auto !important;
    }
    
    .layout-1L .page-header {
      page-break-after: avoid;
    }
    
    .layout-1L {
      page-break-inside: avoid;
    }
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
    color: #000000;
    margin-bottom: 8px;
  }
  
  /* 3-up layout specific styles */
  .page.layout-3 .product-card.layout-3-row {
    display: grid !important;
  }
  
  .layout-3-row {
    display: grid;
    grid-template-columns: 212px 1fr 100px;
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
    width: 206px; /* +20% */
    height: 274px; /* +20% */
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
  background: #ffffff;
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
  width: 106px;
  height: 158px;
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
  font-size: 13px;
    font-weight: bold;
    color: #000;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-subtitle-4up {
  font-size: 12px;
    font-style: italic;
    color: #666;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .product-author-4up {
  font-size: 12px;
    color: #444;
    margin: 0;
    line-height: 1.2;
    font-family: 'Calibri', sans-serif;
  }
  
  .description-section {
    margin-top: 3px;
  }
  
  .product-description-4up {
  font-size: 12px;
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
  font-size: 11px;
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
  font-size: 11px;
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
  max-width: 83px;
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
    width: 83px; /* 72px * 1.15 = 82.8px ≈ 83px (15% bigger) */
    height: 110px; /* 96px * 1.15 = 110.4px ≈ 110px (15% bigger) */
    object-fit: cover;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  @media print {
    .page {
      page-break-after: always;
    }
    
    body {
      background: #ffffff !important;
    }
    .product-card {
      border: none !important;
      box-shadow: none !important;
    }
  }
  
  /* Force white background during PDF generation */
  body.pdf-generation {
    background: #ffffff !important;
  }
  
  body.pdf-generation * {
    background: #ffffff !important;
  }
  
  body.pdf-generation .page,
  body.pdf-generation .cover-page {
    background: #ffffff !important;
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
  ${mergedPagesHtml}
  ${backCoverHtml}
</body>
</html>`;
}

