import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode-generator";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  sku?: string; icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  publicity?: string; reviews?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layout = 4, showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', utmParams } = req.body as {
      items: Item[]; 
      layout: 1 | 2 | 3 | 4 | 8; 
      showFields?: Record<string, boolean>;
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
    const html = renderHtml(items, layout, showFields || {}, hyperlinkToggle, utmParams, itemBarcodeTypes, barcodeType, bannerColor, websiteName);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

function renderHtml(items: Item[], layout: 1 | 2 | 3 | 4 | 8, show: Record<string, boolean>, hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress', utmParams?: {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}, itemBarcodeTypes?: {[key: number]: "EAN-13" | "QR Code" | "None"}, barcodeType?: "EAN-13" | "QR Code" | "None", bannerColor?: string, websiteName?: string) {
  
  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const generateProductUrl = (handle: string): string => {
    const baseUrls = {
      woodslane: 'https://woodslane.com.au',
      woodslanehealth: 'https://www.woodslanehealth.com.au',
      woodslaneeducation: 'https://www.woodslaneeducation.com.au',
      woodslanepress: 'https://www.woodslanepress.com.au'
    };
    
    const baseUrl = `${baseUrls[hyperlinkToggle]}/products/${handle}`;
    
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
      let cleanCode = code.replace(/[^0-9]/g, '');
      
      // If no valid digits found, use a default
      if (cleanCode.length === 0) {
        cleanCode = '1234567890123';
      }
      
      // For EAN-13, we need exactly 13 digits
      if (cleanCode.length < 13) {
        // Pad with zeros at the beginning to make it 13 digits
        cleanCode = cleanCode.padStart(13, '0');
      } else if (cleanCode.length > 13) {
        // Take the first 13 digits
        cleanCode = cleanCode.substring(0, 13);
      }
      
      const canvas = createCanvas(150, 60);
      
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
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('EAN-13 barcode generation error:', error);
      return '';
    }
  };

  // Format release date from YYYY-MM-DD to MM/YYYY
  const formatReleaseDate = (dateString: string): string => {
    if (!dateString) return '';
    
    // Handle YYYY-MM-DD format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month] = dateString.split('-');
      return `${month}/${year}`;
    }
    
    // If already in MM/YYYY format or other format, return as-is
    return dateString;
  };

  // Convert HTML to plain text
  const htmlToPlainText = (html: string): string => {
    if (!html) return '';
    
    let text = html;
    
    // Convert line breaks
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<p[^>]*>/gi, '');
    
    // Remove all other HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    
    // Clean up extra whitespace
    text = text.replace(/\n\s*\n/g, '\n\n');
    text = text.trim();
    
    return text;
  };

  // Chunk items into pages
  const perPage = layout;
  const pages: Item[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }

  const pagesHtml = pages.map((page, pageIndex) => {
    const createProductCard = (item: Item, localIndex: number) => {
      const globalIndex = pageIndex * perPage + localIndex;
      const itemBarcodeType = itemBarcodeTypes?.[globalIndex] || barcodeType;
      
      // Generate barcode if needed
      let barcodeHtml = '';
      if (itemBarcodeType && itemBarcodeType !== "None") {
        if (itemBarcodeType === "EAN-13") {
          // Use SKU (ISBN) for barcode generation, not handle
          let barcodeCode = item.sku || '';
          
          // Debug: log what we're getting
          console.log('Barcode code from SKU:', barcodeCode, 'for item:', item.title);
          
          // If no SKU available, use a default
          if (!barcodeCode || barcodeCode.length < 10) {
            barcodeCode = '1234567890123';
            console.log('Using default barcode code:', barcodeCode);
          }
          
          const barcodeDataUrl = generateEAN13Barcode(barcodeCode);
          if (barcodeDataUrl) {
            barcodeHtml = `<div class="barcode"><img src="${barcodeDataUrl}" alt="EAN-13 Barcode" class="ean13-barcode"></div>`;
          } else {
            // Fallback: show the code as text if barcode generation fails
            barcodeHtml = `<div class="barcode-fallback">Barcode: ${esc(barcodeCode)}</div>`;
          }
        } else if (itemBarcodeType === "QR Code") {
          const productUrl = generateProductUrl(item.handle);
          const qrDataUrl = generateQRCode(productUrl);
          if (qrDataUrl) {
            barcodeHtml = `<div class="barcode"><img src="${qrDataUrl}" alt="QR Code" class="qr-code"></div>`;
          } else {
            // Fallback: show the URL as text if QR generation fails
            barcodeHtml = `<div class="barcode-fallback">QR: ${esc(productUrl)}</div>`;
          }
        }
      }

      // For 1-up layout, use special two-column layout
      if (layout === 1) {
        const plainTextBio = item.authorBio ? htmlToPlainText(item.authorBio) : '';
        
        return `
          <div class="product-card">
            <div class="left-column">
              <div class="product-image">
                <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
              </div>
              ${show.authorBio && plainTextBio ? `
                <div class="author-bio">
                  <div class="author-bio-title">Author Bio:</div>
                  <div class="author-bio-content">${esc(plainTextBio)}</div>
                </div>
              ` : ""}
              ${item.additionalImages && item.additionalImages.length > 0 ? `
                <div class="internals-section">
                  <div class="internals-title">Internals:</div>
                  <div class="internals-thumbnails">
                    ${item.additionalImages.slice(0, 4).map((img, idx) => 
                      `<img src="${esc(img)}" alt="Internal ${idx + 1}" class="internal-thumbnail">`
                    ).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div class="right-column">
              <h2 class="product-title"><a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a></h2>
              ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
              ${item.author ? `<div class="product-author">By ${esc(item.author)}</div>` : ""}
              ${item.description ? `<div class="product-description">${esc(item.description)}</div>` : ""}
              <div class="product-meta">
                ${item.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(item.imprint)}</div>` : ""}
                ${item.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(item.releaseDate)}</div>` : ""}
                ${item.binding ? `<div class="meta-item"><strong>Binding:</strong> ${esc(item.binding)}</div>` : ""}
                ${item.pages ? `<div class="meta-item"><strong>Pages:</strong> ${esc(item.pages)} pages</div>` : ""}
                ${item.dimensions ? `<div class="meta-item"><strong>Dimensions:</strong> ${esc(item.dimensions)}</div>` : ""}
                ${item.weight ? `<div class="meta-item"><strong>Weight:</strong> ${esc(item.weight)}</div>` : ""}
                ${item.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(item.illustrations)}</div>` : ""}
              </div>
              ${item.price ? `<div class="product-price">AUD$ ${esc(item.price)}</div>` : ""}
              ${barcodeHtml}
            </div>
          </div>
        `;
      }

      // For 3-up layout, use horizontal row layout (image, content, details)
      if (layout === 3) {
        const plainDescription = item.description ? htmlToPlainText(item.description) : '';
        const truncatedDesc = plainDescription.length > 1000 ? plainDescription.substring(0, 997) + '...' : plainDescription;
        
        return `
          <div class="product-card layout-3-row">
            <div class="product-image-3up">
              <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
            </div>
            <div class="product-content-3up">
              <h2 class="product-title"><a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a></h2>
              ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
              ${item.author ? `<div class="product-author">${esc(item.author)}</div>` : ""}
              ${truncatedDesc ? `<div class="product-description-3up">${esc(truncatedDesc)}</div>` : ""}
            </div>
            <div class="product-details-3up">
              ${item.imprint ? `<div class="detail-value">${esc(item.imprint)}</div>` : ""}
              ${item.binding ? `<div class="detail-value">${esc(item.binding)}</div>` : ""}
              ${item.pages ? `<div class="detail-value">${esc(item.pages)} Pages</div>` : ""}
              ${item.dimensions ? `<div class="detail-value">${esc(item.dimensions)}</div>` : ""}
              ${item.releaseDate ? `<div class="detail-value">${esc(formatReleaseDate(item.releaseDate))}</div>` : ""}
              ${item.weight ? `<div class="detail-value">${esc(item.weight)}</div>` : ""}
              ${item.sku ? `<div class="detail-value">ISBN: ${esc(item.sku)}</div>` : ""}
              ${item.price ? `<div class="detail-value">AUD$ ${esc(item.price)}</div>` : ""}
              ${barcodeHtml}
            </div>
          </div>
        `;
      }

      // For other layouts, use standard card layout
      return `
        <div class="product-card">
          <div class="product-image">
            <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
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
            ${barcodeHtml}
          </div>
        </div>
      `;
    };

    const layoutClass = layout === 1 ? "layout-1" : layout === 2 ? "layout-2" : layout === 3 ? "layout-3" : layout === 4 ? "layout-4" : "layout-8";
    const cards = page.map((item, localIndex) => createProductCard(item, localIndex)).join("");
    
    // Fill empty slots for proper grid layout
    const emptySlots = layout - page.length;
    const emptyCards = Array(emptySlots).fill('<div class="product-card empty"></div>').join("");
    
    return `<div class="page ${layoutClass}">
      <div class="page-header" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
      
      <div class="page-content">
        ${cards}${emptyCards}
      </div>
      
      <div class="page-footer" style="background-color: ${bannerColor || '#F7981D'}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px;">
        ${esc(websiteName || 'www.woodslane.com.au')}
      </div>
    </div>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Product Catalogue</title>
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
  
  /* Force portrait orientation in browser display */
  @media screen {
    .page { 
      width: 210mm;  /* A4 portrait width */
      min-height: 297mm;  /* A4 portrait height */
      margin: 0 auto;  /* Center the page */
      box-shadow: 0 0 10px rgba(0,0,0,0.1);  /* Add subtle shadow for visual separation */
    }
    
    body {
      padding: 20px 0;  /* Add vertical padding for centered pages */
      background: #f5f5f5;  /* Light gray background to show page boundaries */
    }
  }
  
  /* Page structure - EXACTLY like working mixed layout */
  .page { 
    display: grid; 
    grid-template-areas: 
      "header"
      "content"
      "footer";
    grid-template-rows: auto 1fr auto;
    gap: 10mm;
    page-break-after: always; 
    padding: 0;
    height: 100vh;
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
  
  /* Layout-specific grid configurations */
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
  
  /* Product card base styles */
  .product-card {
    display: flex;
    gap: 8px;
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
    gap: 12px;
    min-width: 0;
    overflow: hidden;
  }
  
  .page.layout-1 .product-image {
    width: 100%;
  }
  
  .page.layout-1 .book-cover {
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: contain;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  .page.layout-1 .author-bio {
    background: #E3F2FD;
    padding: 10px;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1.3;
  }
  
  .page.layout-1 .author-bio-title {
    font-weight: 600;
    margin-bottom: 6px;
    color: #1565C0;
  }
  
  .page.layout-1 .author-bio-content {
    color: #333;
  }
  
  .page.layout-1 .internals-section {
    background: #F5F5F5;
    padding: 10px;
    border-radius: 6px;
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
  }
  
  .page.layout-1 .internal-thumbnail {
    width: 39px;
    height: 55px;
    object-fit: cover;
    border-radius: 3px;
    border: 1px solid #DEE2E6;
  }
  
  .page.layout-1 .product-title {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
    line-height: 1.3;
  }
  
  .page.layout-1 .product-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
    font-style: italic;
  }
  
  .page.layout-1 .product-author {
    font-size: 13px;
    color: #444;
    font-weight: 500;
    margin: 0;
  }
  
  .page.layout-1 .product-description {
    font-size: 11px;
    line-height: 1.4;
    color: #333;
    margin: 0;
    max-height: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .page.layout-1 .product-meta {
    font-size: 10px;
  }
  
  .page.layout-1 .meta-item {
    margin-bottom: 4px;
  }
  
  .page.layout-1 .product-price {
    font-size: 16px;
    font-weight: bold;
    color: #d63384;
  }
  
  /* Layout 3: Horizontal row (Image | Content | Details) */
  .layout-3-row {
    display: grid;
    grid-template-columns: 120px 1fr 120px;
    gap: 12px;
    padding: 12px;
    border: 1px solid #e0e0e0;
    background: #ffffff;
    min-height: 180px;
  }
  
  .product-image-3up {
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  
  .product-image-3up .book-cover {
    width: 113px;
    height: 150px;
    object-fit: cover;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .product-content-3up {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  
  .product-content-3up .product-title {
    font-size: 12px;
    font-weight: bold;
    color: #000;
    margin: 0;
    line-height: 1.2;
  }
  
  .product-content-3up .product-subtitle {
    font-size: 10px;
    font-style: italic;
    color: #666;
    margin: 0;
    line-height: 1.2;
  }
  
  .product-content-3up .product-author {
    font-size: 10px;
    color: #444;
    margin: 0;
    line-height: 1.2;
  }
  
  .product-description-3up {
    font-size: 9px;
    color: #333;
    line-height: 1.3;
    margin-top: 6px;
    padding: 6px;
    border: 1px solid #e0e0e0;
    background: #fafafa;
    max-height: 120px;
    overflow: hidden;
    text-align: justify;
  }
  
  .product-details-3up {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 8px;
    color: #333;
    border: 1px solid #e0e0e0;
    padding: 6px;
    background: #ffffff;
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
  
  /* Print styles - hide borders and boxes for clean printing */
  @media print {
    .layout-3-row {
      border: none !important;
      box-shadow: none !important;
    }
    
    .product-description-3up {
      border: none !important;
      background: transparent !important;
    }
    
    .product-details-3up {
      border: none !important;
      background: transparent !important;
    }
    
    .product-details-3up .detail-value {
      border-bottom: none !important;
    }
    
    .barcode-fallback {
      border: none !important;
      background: transparent !important;
    }
    
    .book-cover {
      border: none !important;
      box-shadow: none !important;
    }
    
    .internal-thumbnail {
      border: none !important;
    }
    
    .author-bio {
      border: none !important;
      background: transparent !important;
    }
    
    .internals-section {
      border: none !important;
      background: transparent !important;
    }
    
    .internals-thumbnails {
      border: none !important;
    }
  }
  
  /* Other layouts: Standard vertical card */
  .product-card {
    flex-direction: column;
  }
  
  .product-image {
    flex-shrink: 0;
    width: 60px;
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
  
  .page.layout-2 .product-price {
    font-size: 14px;
  }
  
  .page.layout-3 .product-price {
    font-size: 13px;
  }
  
  .page.layout-8 .product-price {
    font-size: 9px;
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
