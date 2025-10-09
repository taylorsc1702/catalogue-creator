import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode-generator";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layoutAssignments, showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', utmParams } = req.body as {
      items: Item[]; 
      layoutAssignments: (1|2|3|4|8)[]; 
      showFields: Record<string, boolean>;
      hyperlinkToggle?: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
      itemBarcodeTypes?: {[key: number]: "EAN-13" | "QR Code" | "None"};
      barcodeType?: "EAN-13" | "QR Code" | "None";
      bannerColor?: string;
      websiteName?: string;
      utmParams?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmContent?: string;
        utmTerm?: string;
      };
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

function renderMixedHtml(items: Item[], layoutAssignments: (1|2|3|4|8)[], show: Record<string, boolean>, hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress', itemBarcodeTypes?: {[key: number]: "EAN-13" | "QR Code" | "None"}, barcodeType?: "EAN-13" | "QR Code" | "None", bannerColor?: string, websiteName?: string, utmParams?: {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}) {
  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  // Function to generate product URLs with UTM parameters
  const generateProductUrl = (handle: string): string => {
    const baseUrls = {
      woodslane: 'https://woodslane.com.au',
      woodslanehealth: 'https://www.woodslanehealth.com.au',
      woodslaneeducation: 'https://www.woodslaneeducation.com.au',
      woodslanepress: 'https://www.woodslanepress.com.au'
    };
    
    const baseUrl = `${baseUrls[hyperlinkToggle]}/products/${handle}`;
    
    // Add UTM parameters if any are provided
    if (utmParams) {
      const utmUrlParams = new URLSearchParams();
      if (utmParams.utmSource) utmUrlParams.set('utm_source', utmParams.utmSource);
      if (utmParams.utmMedium) utmUrlParams.set('utm_medium', utmParams.utmMedium);
      if (utmParams.utmCampaign) utmUrlParams.set('utm_campaign', utmParams.utmCampaign);
      if (utmParams.utmContent) utmUrlParams.set('utm_content', utmParams.utmContent);
      if (utmParams.utmTerm) utmUrlParams.set('utm_term', utmParams.utmTerm);
      
      return utmUrlParams.toString() ? `${baseUrl}?${utmUrlParams.toString()}` : baseUrl;
    }
    
    return baseUrl;
  };

  // Barcode generation functions
  const generateQRCode = (text: string) => {
    try {
      const qr = QRCode(0, 'M');
      qr.addData(text);
      qr.make();
      return qr.createDataURL(4, 0);
    } catch (error) {
      console.error('QR Code generation error:', error);
      return '';
    }
  };

  const generateEAN13Barcode = (code: string) => {
    try {
      // Clean the code - remove non-digits
      let cleanCode = code.replace(/[^0-9]/g, '');
      
      console.log('Mixed - Raw code:', code, 'Cleaned:', cleanCode);
      
      // If no numeric data, generate a placeholder barcode
      if (cleanCode.length === 0) {
        console.log('Mixed - No numeric data found, generating placeholder barcode');
        cleanCode = '1234567890123'; // Placeholder EAN-13
      }
      
      // EAN-13 needs exactly 13 digits
      if (cleanCode.length < 13) {
        cleanCode = cleanCode.padStart(13, '0');
      } else if (cleanCode.length > 13) {
        cleanCode = cleanCode.substring(0, 13);
      }
      
      console.log('Mixed - Final EAN-13 code:', cleanCode);
      
      // Create a canvas element
      const canvas = createCanvas(150, 60);
      
      // Generate the barcode
      JsBarcode(canvas, cleanCode, {
        format: "EAN13",
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 10,
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 2
      });
      
      // Convert canvas to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('EAN-13 barcode generation error:', error);
      return '';
    }
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

  const pagesHtml = pages.map((page, pageIndex) => {
    const createProductCard = (it: Item, localIndex: number) => {
      // Find the global index of this item
      const globalIndex = items.findIndex(item => item.handle === it.handle);
      
      // Determine barcode type for this item
      const itemBarcodeType = itemBarcodeTypes?.[globalIndex] || barcodeType;
      
      // Generate barcode if needed
      let barcodeHtml = '';
      if (itemBarcodeType && itemBarcodeType !== "None") {
        if (itemBarcodeType === "EAN-13") {
          // Use EAN-13 format for 13-digit barcodes
          const barcodeCode = it.icrkdt || it.handle;
          console.log(`Mixed - Generating EAN-13 for item ${globalIndex}: icrkdt="${it.icrkdt}", handle="${it.handle}", using="${barcodeCode}"`);
          const barcodeDataUrl = generateEAN13Barcode(barcodeCode);
          if (barcodeDataUrl) {
            barcodeHtml = `<div class="barcode"><img src="${barcodeDataUrl}" alt="EAN-13 Barcode" class="ean13-barcode"></div>`;
          }
        } else if (itemBarcodeType === "QR Code") {
          const productUrl = generateProductUrl(it.handle);
          const qrDataUrl = generateQRCode(productUrl);
          if (qrDataUrl) {
            barcodeHtml = `<div class="barcode"><img src="${qrDataUrl}" alt="QR Code" class="qr-code"></div>`;
          }
        }
      }

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
            barcodeHtml,
          '</div>',
        '</div>',
      ].join("");
    };

    const layout = page.layout;
    const layoutClass = layout === 2 ? "layout-2" : layout === 3 ? "layout-3" : layout === 1 ? "layout-1" : layout === 8 ? "layout-8" : "";
    const cards = page.items.map((item, localIndex) => createProductCard(item, localIndex)).join("");
    
    // Fill empty slots for proper grid layout
    const emptySlots = layout - page.items.length;
    const emptyCards = Array(emptySlots).fill('<div class="product-card empty"></div>').join("");
    
    return `<div class="page ${layoutClass}" data-layout="${layout}">
      <!-- Header Banner -->
      <div style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px; margin-bottom: 10mm; grid-column: 1 / -1;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
      ${cards}${emptyCards}
      <!-- Footer Banner -->
      <div style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px; margin-top: 10mm; grid-column: 1 / -1;">
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
  .page.layout-3 {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    gap: 15mm;
    padding: 15mm;
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
  .page.layout-3 .product-image {
    width: 80px;
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
  
  .barcode {
    margin-top: 8px;
    text-align: center;
  }
  
  .qr-code {
    width: 30px;
    height: 30px;
  }
  
  .ean13-barcode {
    width: 75px;
    height: 30px;
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

