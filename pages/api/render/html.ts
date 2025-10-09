import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode-generator";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";
import { layoutRegistry, LayoutType } from "@/lib/layout-registry";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  publicity?: string; reviews?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
};

// const SITE = process.env.SITE_BASE_URL || "https://b27202-c3.myshopify.com";

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
  // const cols = layout === 1 ? "1fr" : layout === 2 ? "1fr 1fr" : layout === 3 ? "1fr 1fr 1fr" : layout === 4 ? "1fr 1fr" : "1fr 1fr 1fr 1fr";
  const perPage = layout;

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
      
      console.log('Raw code:', code, 'Cleaned:', cleanCode);
      
      // If no numeric data, generate a placeholder barcode
      if (cleanCode.length === 0) {
        console.log('No numeric data found, generating placeholder barcode');
        cleanCode = '1234567890123'; // Placeholder EAN-13
      }
      
      // EAN-13 needs exactly 13 digits
      if (cleanCode.length < 13) {
        cleanCode = cleanCode.padStart(13, '0');
      } else if (cleanCode.length > 13) {
        cleanCode = cleanCode.substring(0, 13);
      }
      
      console.log('Final EAN-13 code:', cleanCode);
      
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

  const chunks: Item[][] = [];
  for (let i = 0; i < items.length; i += perPage) chunks.push(items.slice(i, i + perPage));

  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const pagesHtml = chunks.map((page, pageIndex) => {
    const createProductCard = (it: Item, localIndex: number) => {
      const globalIndex = pageIndex * perPage + localIndex;
      // Determine barcode type for this item
      const itemBarcodeType = itemBarcodeTypes?.[globalIndex] || barcodeType;
      
      // Generate barcode if needed
      let barcodeHtml = '';
      if (itemBarcodeType && itemBarcodeType !== "None") {
        if (itemBarcodeType === "EAN-13") {
          // Use EAN-13 format for 13-digit barcodes
          const barcodeCode = it.icrkdt || it.handle;
          console.log(`Generating EAN-13 for item ${globalIndex}: icrkdt="${it.icrkdt}", handle="${it.handle}", using="${barcodeCode}"`);
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

      // Use handler system if available, otherwise fall back to legacy code
      const layoutType = typeof layout === 'number' ? `${layout}-up` as const : layout;
      const layoutHandler = layoutRegistry.getHandler(layoutType);
      if (layoutHandler) {
        return layoutHandler.createHtmlExport(it, localIndex, generateProductUrl, barcodeHtml, bannerColor, websiteName);
      }

      // Legacy fallback for layouts not yet converted
      return [
        layout === 1 ? 
          // 1-per-page: Professional 2-column layout
          `<div class="product-card layout-1up">
            <!-- Left Column -->
            <div class="left-column">
              <!-- Book Cover -->
              <div class="book-cover-container">
                <img src="${esc(it.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(it.title)}" class="book-cover-large">
              </div>
              
              <!-- Author Bio -->
              ${it.authorBio ? `
                <div class="author-bio-box">
                  <div class="author-bio-title">Author Bio:</div>
                  <div class="author-bio-content">${esc(it.authorBio)}</div>
                </div>
              ` : ''}
              
              <!-- Internals Thumbnails -->
              ${it.additionalImages && it.additionalImages.length > 0 ? `
                <div class="internals-section">
                  <div class="internals-title">Internals:</div>
                  <div class="internals-thumbnails">
                    ${it.additionalImages.slice(0, 6).map((img, idx) => 
                      `<img src="${esc(img)}" alt="Internal ${idx + 1}" class="internal-thumbnail">`
                    ).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Right Column -->
            <div class="right-column">
              <!-- Title Section -->
              <div class="title-section">
                <h1 class="product-title-large">
                  <a href="${generateProductUrl(it.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(it.title)}</a>
                </h1>
                ${it.subtitle ? `<h2 class="product-subtitle-large">${esc(it.subtitle)}</h2>` : ''}
                ${it.author ? `<div class="product-author-large">By ${esc(it.author)}</div>` : ''}
              </div>

              <!-- Description -->
              ${it.description ? `
                <div class="product-description-large">
                  ${esc(it.description)}
                </div>
              ` : ''}

              <!-- Product Details Grid -->
              <div class="product-details-grid">
                ${it.vendor ? `<div class="detail-item"><strong>Vendor:</strong> ${esc(it.vendor)}</div>` : ''}
                ${it.dimensions ? `<div class="detail-item"><strong>Dimensions:</strong> ${esc(it.dimensions)}</div>` : ''}
                ${it.releaseDate ? `
                  <div class="detail-item">
                    <strong>Release Date:</strong> ${esc(it.releaseDate)}
                    ${it.releaseDate.includes('/') ? `
                      <span class="date-badge ${new Date(it.releaseDate.split('/')[1] + '-' + it.releaseDate.split('/')[0] + '-01') < new Date() ? 'current' : 'future'}">
                        ${new Date(it.releaseDate.split('/')[1] + '-' + it.releaseDate.split('/')[0] + '-01') < new Date() ? 'CURRENT' : 'FUTURE'}
                      </span>
                    ` : ''}
                  </div>
                ` : ''}
                ${it.pages ? `<div class="detail-item"><strong>Pages:</strong> ${esc(it.pages)}</div>` : ''}
              </div>

              <!-- Bottom Section -->
              <div class="bottom-section">
                ${it.icrkdt ? `
                  <div class="barcode-section">
                    <div class="barcode-label">Barcode:</div>
                    <div class="barcode-value">${esc(it.icrkdt)}</div>
                  </div>
                ` : ''}
                <div class="handle-section">
                  <div class="handle-label">Handle (ISBN):</div>
                  <div class="handle-value">${esc(it.handle)}</div>
                </div>
                ${it.price ? `
                  <div class="price-section">
                    AUD$ ${esc(it.price)}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>` :
          // Other layouts: Standard layout
          `<div class="product-card">
            <div class="product-image">
              <img src="${esc(it.imageUrl)}" alt="${esc(it.title)}" class="book-cover">
            </div>
            <div class="product-details">
              <h2 class="product-title"><a href="${generateProductUrl(it.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(it.title)}</a></h2>
              ${it.subtitle ? `<div class="product-subtitle">${esc(it.subtitle)}</div>` : ""}
              ${it.author ? `<div class="product-author">By ${esc(it.author)}</div>` : ""}
              ${it.description ? `<div class="product-description">${esc(it.description)}</div>` : ""}
              <div class="product-specs">
                ${it.binding ? `<span class="spec-item">${esc(it.binding)}</span>` : ""}
                ${it.pages ? `<span class="spec-item">${esc(it.pages)} pages</span>` : ""}
                ${it.dimensions ? `<span class="spec-item">${esc(it.dimensions)}</span>` : ""}
              </div>
              <div class="product-meta">
                ${it.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(it.imprint)}</div>` : ""}
                ${it.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(it.releaseDate)}</div>` : ""}
                ${it.weight ? `<div class="meta-item"><strong>Weight:</strong> ${esc(it.weight)}</div>` : ""}
                ${it.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(it.illustrations)}</div>` : ""}
              </div>
              ${it.price ? `<div class="product-price">AUD$ ${esc(it.price)}</div>` : ""}
              ${show.authorBio && it.authorBio ? `<div class="author-bio">${esc(it.authorBio)}</div>` : ""}
              ${it.additionalImages && it.additionalImages.length > 0 ? `
                <div class="internals-section">
                  <div class="internals-title">Internals:</div>
                  <div class="internals-thumbnails">
                    ${it.additionalImages.slice(0, 6).map((img, idx) => 
                      `<img src="${esc(img)}" alt="Internal ${idx + 1}" class="internal-thumbnail">`
                    ).join('')}
                  </div>
                </div>
              ` : ''}
              ${barcodeHtml}
            </div>
          </div>`,
      ].join("");
    };

    // Create product slots based on layout
    let productsHtml = '';
    
    if (layout === 1) {
      // 1-per-page: Two column layout - Left: image/bio/internals, Right: details
      console.log('[1-UP LAYOUT] Generating page', pageIndex, 'with item:', page[0]?.title);
      if (page[0]) {
        const item = page[0];
        const globalIndex = pageIndex * perPage + 0;
        const itemBarcodeType = itemBarcodeTypes?.[globalIndex] || barcodeType;
        console.log('[1-UP LAYOUT] Using inline code (not handler) for item:', item.title);
        
        // Generate barcode if needed
        let barcodeHtml = '';
        if (itemBarcodeType && itemBarcodeType !== "None") {
          if (itemBarcodeType === "EAN-13") {
            const barcodeCode = item.icrkdt || item.handle;
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
        
        productsHtml = `
          <div class="product-card layout-1up">
            <!-- Left Column: Image, Author Bio, Internals -->
            <div class="left-column">
              <div class="product-image">
                <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
              </div>
              ${show.authorBio && item.authorBio ? `
                <div class="author-bio">
                  <div class="author-bio-title">Author Bio:</div>
                  <div class="author-bio-content">${esc(item.authorBio)}</div>
                </div>
              ` : ""}
              ${item.additionalImages && item.additionalImages.length > 0 ? `
                <div class="internals-section">
                  <div class="internals-title">Internals:</div>
                  <div class="internals-thumbnails">
                    ${item.additionalImages.slice(0, 6).map((img, idx) => 
                      `<img src="${esc(img)}" alt="Internal ${idx + 1}" class="internal-thumbnail">`
                    ).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <!-- Right Column: All Product Details -->
            <div class="right-column">
              <h3 class="product-title">${esc(item.title)}</h3>
              ${item.subtitle ? `<p class="product-subtitle">${esc(item.subtitle)}</p>` : ""}
              ${item.author ? `<p class="product-author">By ${esc(item.author)}</p>` : ""}
              ${item.description ? `<p class="product-description">${esc(item.description)}</p>` : ""}
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
      } else {
        productsHtml = '<div class="product-card empty"></div>';
      }
    } else if (layout === 2) {
      // 2-per-page: 2 products
      const product1 = page[0] ? createProductCard(page[0], 0) : '<div class="product-card empty"></div>';
      const product2 = page[1] ? createProductCard(page[1], 1) : '<div class="product-card empty"></div>';
      productsHtml = `${product1}${product2}`;
    } else if (layout === 3) {
      // 3-per-page: 3 products
      const product1 = page[0] ? createProductCard(page[0], 0) : '<div class="product-card empty"></div>';
      const product2 = page[1] ? createProductCard(page[1], 1) : '<div class="product-card empty"></div>';
      const product3 = page[2] ? createProductCard(page[2], 2) : '<div class="product-card empty"></div>';
      productsHtml = `${product1}${product2}${product3}`;
    } else if (layout === 4) {
      // 4-per-page: 4 products
      const product1 = page[0] ? createProductCard(page[0], 0) : '<div class="product-card empty"></div>';
      const product2 = page[1] ? createProductCard(page[1], 1) : '<div class="product-card empty"></div>';
      const product3 = page[2] ? createProductCard(page[2], 2) : '<div class="product-card empty"></div>';
      const product4 = page[3] ? createProductCard(page[3], 3) : '<div class="product-card empty"></div>';
      productsHtml = `${product1}${product2}${product3}${product4}`;
    } else if (layout === 8) {
      // 8-per-page: 8 products
      const cards = [];
      for (let i = 0; i < 8; i++) {
        cards.push(page[i] ? createProductCard(page[i], i) : '<div class="product-card empty"></div>');
      }
      productsHtml = cards.join('');
    }

    // All layouts now use the same page structure
    
    const layoutClass = layout === 1 ? " layout-1up" : layout === 2 ? " layout-2" : layout === 3 ? " layout-3" : layout === 4 ? " layout-4" : layout === 8 ? " layout-8" : "";
    return `<div class="page${layoutClass}">
      <!-- Header Banner -->
      <div class="page-header banner header-banner" style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px;">
        ${websiteName}
      </div>
      
      <!-- Content Area -->
      <div class="page-content">
        ${productsHtml}
      </div>
      
      <!-- Footer Banner -->
      <div class="page-footer banner footer-banner" style="background-color: ${bannerColor}; color: white; text-align: center; padding: 8px 0; font-weight: 600; font-size: 14px;">
        ${websiteName}
      </div>
    </div>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Professional Product Catalogue</title>
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
  .noprint { 
    margin-bottom: 20px; 
    text-align: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  .noprint button {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    margin-right: 16px;
  }
  .page { 
    display: grid;
    grid-template-areas: 
      "header"
      "content"
      "footer";
    grid-template-rows: auto 1fr auto;
    page-break-after: always; 
    padding: 0;
    height: 100vh;
    gap: 10mm;
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
  .page.layout-2 .page-content {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }
  .page.layout-3 .page-content {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr;
  }
  
  .page.layout-4 .page-content {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  
  .page.layout-8 .page-content {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  
      /* 1-up layout: Two columns - Left: image/bio/internals, Right: details */
      .page.layout-1up .page-content {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        padding: 15px;
      }
      
      .page.layout-1up .product-card {
        display: flex;
        flex-direction: row;
        gap: 20px;
        max-height: 100%;
        overflow: hidden;
        padding: 15px;
      }
      
      .page.layout-1up .left-column {
        flex-shrink: 0;
        width: 250px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .page.layout-1up .product-image {
        width: 100%;
      }
      
      .page.layout-1up .book-cover {
        width: 100%;
        height: auto;
        max-height: 300px;
        object-fit: contain;
        border-radius: 4px;
        border: 1px solid #ddd;
      }
      
      .page.layout-1up .author-bio {
        background: #E3F2FD;
        padding: 10px;
        border-radius: 6px;
        font-size: 10px;
        line-height: 1.3;
      }
      
      .page.layout-1up .author-bio-title {
        font-weight: 600;
        margin-bottom: 6px;
        color: #1565C0;
      }
      
      .page.layout-1up .author-bio-content {
        color: #333;
      }
      
      .page.layout-1up .internals-section {
        background: #F5F5F5;
        padding: 10px;
        border-radius: 6px;
      }
      
      .page.layout-1up .internals-title {
        font-weight: 600;
        margin-bottom: 6px;
        font-size: 10px;
        color: #495057;
      }
      
      .page.layout-1up .internals-thumbnails {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      
      .page.layout-1up .internal-thumbnail {
        width: 35px;
        height: 50px;
        object-fit: cover;
        border-radius: 3px;
        border: 1px solid #DEE2E6;
      }
      
      .page.layout-1up .right-column {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
        overflow: hidden;
      }
      
      .page.layout-1up .product-title {
        font-size: 20px;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0;
        line-height: 1.3;
      }
      
      .page.layout-1up .product-subtitle {
        font-size: 14px;
        color: #666;
        margin: 0;
        font-style: italic;
      }
      
      .page.layout-1up .product-author {
        font-size: 13px;
        color: #444;
        font-weight: 500;
        margin: 0;
      }
      
      .page.layout-1up .product-description {
        font-size: 11px;
        line-height: 1.4;
        color: #333;
        margin: 0;
        max-height: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
  .product-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 0;
    page-break-inside: avoid;
    max-height: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }
  .page.layout-2 .product-card {
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
    max-height: 100%;
    overflow: hidden;
  }
  .page.layout-3 .product-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    max-height: 100%;
    overflow: hidden;
  }
  .product-card.empty {
    visibility: hidden;
  }
  .product-image {
    flex-shrink: 0;
    width: 60px;
  }
  .page.layout-2 .product-image {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 12px;
  }
  .page.layout-3 .product-image {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 10px;
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
    width: 120px;
    height: 180px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .page.layout-3 .book-cover {
    width: 80px;
    height: 120px;
    box-shadow: 0 3px 8px rgba(0,0,0,0.12);
  }
  .additional-images {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .additional-image {
    width: 40px;
    height: 60px;
    object-fit: cover;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .product-image-large {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }
  /* 1-up layout styles */
  .layout-1up {
    display: flex !important;
    flex-direction: row !important;
    gap: 24px;
    padding: 24px;
    min-height: 400px;
  }
  
  .layout-1up .left-column {
    flex-shrink: 0;
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .layout-1up .right-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  
  .book-cover-container {
    text-align: center;
  }
  
  .book-cover-large {
    width: 200px;
    height: 300px;
    object-fit: cover;
    border-radius: 8px;
    background: #F8F9FA;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  .author-bio-box {
    background: #E3F2FD;
    padding: 16px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.4;
    color: #1565C0;
  }
  
  .author-bio-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: #0D47A1;
  }
  
  .author-bio-content {
    color: #1565C0;
  }
  
  .internals-section {
    margin-top: 16px;
  }
  
  .internals-title {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 12px;
    color: #495057;
  }
  
  .internals-thumbnails {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .internal-thumbnail {
    width: 40px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #E9ECEF;
  }
  
  .title-section {
    margin-bottom: 16px;
  }
  
  .product-title-large {
    font-size: 24px;
    font-weight: 700;
    color: #2C3E50;
    margin: 0 0 4px 0;
  }
  
  .product-subtitle-large {
    font-size: 18px;
    font-weight: 500;
    color: #7F8C8D;
    font-style: italic;
    margin: 0 0 8px 0;
  }
  
  .product-author-large {
    font-size: 16px;
    color: #667eea;
    font-weight: 600;
    margin-bottom: 16px;
  }
  
  .product-description-large {
    font-size: 14px;
    line-height: 1.6;
    color: #495057;
    margin-bottom: 16px;
  }
  
  .product-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 14px;
    margin-bottom: 16px;
  }
  
  .detail-item {
    color: #495057;
  }
  
  .date-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
    margin-left: 8px;
  }
  
  .date-badge.current {
    background-color: #28A745;
    color: white;
  }
  
  .date-badge.future {
    background-color: #007BFF;
    color: white;
  }
  
  .bottom-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid #E9ECEF;
  }
  
  .barcode-section,
  .handle-section {
    text-align: center;
  }
  
  .barcode-label,
  .handle-label {
    font-size: 12px;
    margin-bottom: 4px;
    color: #6C757D;
  }
  
  .barcode-value,
  .handle-value {
    font-family: monospace;
    font-size: 16px;
    font-weight: 600;
    color: #495057;
  }
  
  .price-section {
    margin-left: auto;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 600;
  }
  .page.layout-1 .product-title {
    font-size: 24px;
    text-align: center;
    margin-bottom: 12px;
  }
  .page.layout-1 .product-subtitle {
    font-size: 18px;
    text-align: center;
    margin-bottom: 8px;
  }
  .page.layout-1 .product-author {
    font-size: 16px;
    text-align: center;
    margin-bottom: 16px;
  }
  .page.layout-1 .product-description {
    font-size: 14px;
    text-align: justify;
    max-width: 600px;
    margin: 0 auto 20px;
    line-height: 1.5;
  }
  .page.layout-1 .product-meta {
    background: #f8f9fa;
    padding: 16px;
    border-radius: 8px;
    text-align: center;
    max-width: 600px;
    margin: 0 auto;
  }
  .page.layout-1 .meta-item {
    font-size: 12px;
    margin-bottom: 4px;
  }
  .page.layout-1 .product-isbn {
    font-size: 10px;
    margin-top: 8px;
  }
  .product-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .page.layout-2 .product-details {
    width: 100%;
    gap: 8px;
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
    line-height: 1.3;
    margin-bottom: 6px;
  }
  .page.layout-3 .product-title {
    font-size: 14px;
    line-height: 1.2;
    margin-bottom: 4px;
  }
  .product-subtitle {
    font-size: 10px;
    color: #666;
    font-style: italic;
    margin-bottom: 2px;
  }
  .page.layout-2 .product-subtitle {
    font-size: 13px;
    margin-bottom: 6px;
  }
  .page.layout-3 .product-subtitle {
    font-size: 11px;
    margin-bottom: 4px;
  }
  .product-author {
    font-size: 10px;
    color: #000;
    font-weight: 500;
    margin-bottom: 3px;
  }
  .page.layout-2 .product-author {
    font-size: 12px;
    margin-bottom: 6px;
  }
  .page.layout-3 .product-author {
    font-size: 11px;
    margin-bottom: 4px;
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
    line-height: 1.5;
    margin-bottom: 8px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 8;
    -webkit-box-orient: vertical;
  }
  
  .page.layout-3 .product-description {
    font-size: 10px;
    line-height: 1.4;
    margin-bottom: 6px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 6;
    -webkit-box-orient: vertical;
  }
  
  .page.layout-4 .product-description,
  .page.layout-8 .product-description {
    font-size: 9px;
    line-height: 1.3;
    margin-bottom: 4px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }
  .product-specs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 4px;
  }
  .spec-item {
    font-size: 9px;
    color: #666;
    background: #f8f9fa;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .product-meta {
    margin-bottom: 4px;
  }
  .meta-item {
    font-size: 9px;
    color: #666;
    margin-bottom: 1px;
  }
  .meta-item strong {
    color: #000;
  }
  .product-price {
    font-size: 13px;
    font-weight: bold;
    color: #d63384;
    margin: 4px 0;
  }
  .product-isbn {
    font-size: 9px;
    color: #666;
    font-family: monospace;
    margin-top: auto;
  }
  .author-bio {
    font-size: 9px;
    color: #333;
    font-style: italic;
    margin-top: 4px;
    line-height: 1.2;
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
  
  /* Handler-based layout styles */
  ${layoutRegistry.getAllCssStyles()}
  
  /* 2-per-page layout specific styles */
  .page.layout-2 .product-price {
    font-size: 16px;
    margin: 8px 0;
  }
  .page.layout-3 .product-price {
    font-size: 14px;
    margin: 6px 0;
  }
  .page.layout-2 .product-isbn {
    font-size: 11px;
  }
  .page.layout-3 .product-isbn {
    font-size: 10px;
  }
  .page.layout-2 .product-specs {
    gap: 10px;
    margin-bottom: 10px;
  }
  .page.layout-2 .spec-item {
    font-size: 11px;
    padding: 4px 8px;
  }
  .page.layout-3 .product-specs {
    gap: 8px;
    margin-bottom: 8px;
  }
  .page.layout-3 .spec-item {
    font-size: 10px;
    padding: 3px 6px;
  }
  .page.layout-2 .product-meta {
    margin-bottom: 10px;
  }
  .page.layout-2 .meta-item {
    font-size: 11px;
    margin-bottom: 4px;
  }
  
  @media print { 
    .noprint { 
      display: none !important; 
    }
    .page {
      gap: 15mm;
    }
    .product-card {
      margin-bottom: 20mm;
    }
  }
  
  /* Banner styles */
  .banner {
    page-break-inside: avoid;
  }
  
  .author-bio {
    background: #E3F2FD;
    padding: 12px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.4;
    color: #1565C0;
    margin-top: 8px;
  }
  
  .internals-section {
    margin-top: 12px;
  }
  
  .internals-title {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 12px;
    color: #495057;
  }
  
  .internals-thumbnails {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .internal-thumbnail {
    width: 30px;
    height: 45px;
    object-fit: cover;
    border-radius: 3px;
    border: 1px solid #DEE2E6;
  }
  
  @media print {
    .banner {
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
  }
</style>
</head>
<body>
  <div class="noprint">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    <span style="color: #666;">Use A4 paper, 15mm margins, hide headers/footers for best results.</span>
  </div>
  
  ${pagesHtml}
</body>
</html>`;
}
