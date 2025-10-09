import type { NextApiRequest, NextApiResponse } from "next";
import { downloadImageAsBase64 } from "@/lib/image-utils";
import QRCode from "qrcode-generator";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  sku?: string; icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
};

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
  hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress',
  itemBarcodeTypes: {[key: number]: "EAN-13" | "QR Code" | "None"},
  barcodeType: "EAN-13" | "QR Code" | "None",
  bannerColor: string, 
  websiteName: string,
  utmParams?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  }
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
  hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress',
  itemBarcodeTypes: {[key: number]: "EAN-13" | "QR Code" | "None"},
  barcodeType: "EAN-13" | "QR Code" | "None",
  bannerColor: string,
  websiteName: string,
  utmParams?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  }
) {
  const perPage = layout;
  const chunks: ItemWithImages[][] = [];
  for (let i = 0; i < itemsWithImages.length; i += perPage) {
    chunks.push(itemsWithImages.slice(i, i + perPage));
  }

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
      
      if (cleanCode.length === 0) {
        cleanCode = '1234567890123';
      }
      
      if (cleanCode.length < 13) {
        cleanCode = cleanCode.padStart(13, '0');
      } else if (cleanCode.length > 13) {
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

  // HTML to plain text conversion
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

  const pagesHtml = chunks.map((page, pageIndex) => {
    const createProductCard = (itemWithImages: ItemWithImages, localIndex: number) => {
      const item = itemWithImages.item;
      if (!item) return '<div class="product-card empty"></div>';
      
      const globalIndex = pageIndex * perPage + localIndex;
      const itemBarcodeType = itemBarcodeTypes?.[globalIndex] || barcodeType;
      
      // Generate barcode if needed
      let barcodeHtml = '';
      if (itemBarcodeType && itemBarcodeType !== "None") {
        if (itemBarcodeType === "EAN-13") {
          const barcodeCode = item.sku || item.handle;
          const barcodeDataUrl = generateEAN13Barcode(barcodeCode);
          if (barcodeDataUrl) {
            barcodeHtml = `<div class="barcode"><img src="${barcodeDataUrl}" alt="EAN-13 Barcode" class="ean13-barcode"></div>`;
          }
        } else if (itemBarcodeType === "QR Code") {
          const productUrl = generateProductUrl(item.handle);
          const qrDataUrl = generateQRCode(productUrl);
          if (qrDataUrl) {
            barcodeHtml = `<div class="barcode"><img src="${qrDataUrl}" alt="QR Code" class="qr-code"></div>`;
          }
        }
      }
      
      // Use image data if available, otherwise fallback to URL
      const imageSrc = itemWithImages.imageData 
        ? itemWithImages.imageData.base64 
        : (item.imageUrl || 'https://via.placeholder.com/120x180?text=No+Image');
      
      // For 1-up layout, use special two-column layout
      if (layout === 1) {
        const plainTextBio = item.authorBio ? htmlToPlainText(item.authorBio) : '';
        
        return `
          <div class="product-card layout-1up">
            <div class="left-column">
              <div class="product-image">
                <img src="${esc(imageSrc)}" alt="${esc(item.title)}" class="book-cover">
              </div>
              ${showFields.authorBio && plainTextBio ? `
                <div class="author-bio">
                  <div class="author-bio-title">Author Bio:</div>
                  <div class="author-bio-content">${esc(plainTextBio)}</div>
                </div>
              ` : ""}
              ${itemWithImages.additionalImagesData && itemWithImages.additionalImagesData.length > 0 ? `
                <div class="internals-section">
                  <div class="internals-title">Internals:</div>
                  <div class="internals-thumbnails">
                    ${itemWithImages.additionalImagesData.slice(0, 4).map((img, idx) => 
                      `<img src="${esc(img.base64)}" alt="Internal ${idx + 1}" class="internal-thumbnail">`
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
      
      // For other layouts, use standard card layout
      return `
        <div class="product-card">
          <div class="product-image">
            <img src="${esc(imageSrc)}" 
                 alt="${esc(item.title)}" 
                 class="book-cover">
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
      width: 100pt;
      height: 150pt;
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
    
    .meta-item {
      font-size: 7pt;
      color: #666666;
      margin: 0 0 2pt 0;
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
    
    /* Print optimizations */
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
