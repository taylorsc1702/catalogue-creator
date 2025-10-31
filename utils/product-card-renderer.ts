import QRCode from "qrcode-generator";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";

export type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  sku?: string; icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  icauth?: string; // Australian author metafield
  publicity?: string; reviews?: string; imidis?: string; discount?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
};

export type HyperlinkToggle = 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';

export type BarcodeType = "EAN-13" | "QR Code" | "None";

export type UtmParams = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export interface RenderOptions {
  showFields: Record<string, boolean>;
  hyperlinkToggle: HyperlinkToggle;
  itemBarcodeTypes?: {[key: number]: BarcodeType};
  barcodeType: BarcodeType;
  utmParams?: UtmParams;
}

// Utility functions
export const esc = (s?: string) =>
  (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const formatAuthor = (author?: string) => {
  if (!author) return '';
  // Remove "By " prefix if it already exists to avoid duplication
  return author.replace(/^By\s+/i, '').trim();
};

export const formatDate = (date?: string) => {
  if (!date) return '';
  // Convert to mm/yyyy format
  try {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${year}`;
  } catch {
    return date;
  }
};

export const generateProductUrl = (handle: string, hyperlinkToggle: HyperlinkToggle, utmParams?: UtmParams): string => {
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

export const generateQRCode = (text: string) => {
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

export const generateEAN13Barcode = (code: string) => {
  try {
    // Clean the code - remove non-digits
    let cleanCode = code.replace(/[^0-9]/g, '');
    
    // If no numeric data, generate a placeholder barcode
    if (cleanCode.length === 0) {
      cleanCode = '1234567890123'; // Placeholder EAN-13
    }
    
    // EAN-13 needs exactly 13 digits
    if (cleanCode.length < 13) {
      cleanCode = cleanCode.padStart(13, '0');
    } else if (cleanCode.length > 13) {
      cleanCode = cleanCode.substring(0, 13);
    }
    
    // Create a canvas element
    const canvas = createCanvas(150, 60);
    
    // Generate the barcode
    JsBarcode(canvas, cleanCode, {
      format: "CODE128",
      width: 1.5,
      height: 40,
      displayValue: false,
      background: "#ffffff",
      lineColor: "#000000"
    });
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Barcode generation error:', error);
    return '';
  }
};

export const htmlToPlainText = (html: string): string => {
  if (!html) return '';
  
  let text = html;
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
};

export const generateBarcodeHtml = (
  item: Item, 
  globalIndex: number, 
  options: RenderOptions
): string => {
  const itemBarcodeType = options.itemBarcodeTypes?.[globalIndex] || options.barcodeType;
  
  if (!itemBarcodeType || itemBarcodeType === "None") {
    return '';
  }
  
  if (itemBarcodeType === "EAN-13") {
    // Use SKU (ISBN) for barcode generation, not handle
    let barcodeCode = item.sku || '';
    
    // If no SKU available, try to extract ISBN from the displayed ISBN text
    if (!barcodeCode || barcodeCode.length < 10) {
      // Try to find a valid ISBN in the item data
      const possibleISBN = item.sku || item.handle || '';
      
      if (possibleISBN && possibleISBN.match(/\d{13}/)) {
        // Extract 13-digit number
        const match = possibleISBN.match(/\d{13}/);
        barcodeCode = match ? match[0] : '1234567890123';
      } else if (possibleISBN && possibleISBN.match(/\d{10,13}/)) {
        // Extract any 10-13 digit number
        const match = possibleISBN.match(/\d{10,13}/);
        barcodeCode = match ? match[0].padStart(13, '0') : '1234567890123';
      } else {
        barcodeCode = '1234567890123';
      }
    }
    
    const barcodeDataUrl = generateEAN13Barcode(barcodeCode);
    if (barcodeDataUrl) {
      return `<div class="barcode"><img src="${barcodeDataUrl}" alt="Barcode" class="ean13-barcode"></div><div class="barcode-text">${esc(barcodeCode)}</div>`;
    } else {
      // Fallback: show the code as text if barcode generation fails
      return `<div class="barcode-fallback">Barcode: ${esc(barcodeCode)}</div>`;
    }
  } else if (itemBarcodeType === "QR Code") {
    const productUrl = generateProductUrl(item.handle, options.hyperlinkToggle, options.utmParams);
    const qrDataUrl = generateQRCode(productUrl);
    if (qrDataUrl) {
      return `<div class="barcode"><img src="${qrDataUrl}" alt="QR Code" class="qr-code"></div>`;
    } else {
      // Fallback: show the URL as text if QR generation fails
      return `<div class="barcode-fallback">QR: ${esc(productUrl)}</div>`;
    }
  }
  
  return '';
};

export const renderProductCard1Up = (item: Item, globalIndex: number, options: RenderOptions): string => {
  const plainTextBio = item.authorBio ? htmlToPlainText(item.authorBio) : '';
  const barcodeHtml = generateBarcodeHtml(item, globalIndex, options);
  
  // Calculate if we need to truncate author bio
  const hasInternals = item.additionalImages && item.additionalImages.length > 0;
  // Truncate bio if it's longer than 752 characters (with spaces)
  const shouldTruncateBio = plainTextBio && plainTextBio.length > 752;
  const displayBio = shouldTruncateBio ? plainTextBio.substring(0, 752) + '...' : plainTextBio;
  
  return `
    <div class="product-card layout-1-full">
      <div class="main-content">
        <div class="left-column">
          <div class="product-image">
            <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
          </div>
          ${options.showFields.authorBio && displayBio ? `
            <div class="author-bio ${shouldTruncateBio ? 'truncated' : 'full'}">
              <div class="author-bio-title">Author Bio:</div>
              <div class="author-bio-content">${esc(displayBio)}</div>
            </div>
          ` : ""}
        </div>
        
        <div class="right-column">
          <h2 class="product-title"><a href="${generateProductUrl(item.handle, options.hyperlinkToggle, options.utmParams)}" target="_blank" rel="noopener noreferrer" style="color: #000; text-decoration: none;">${esc(item.title)}</a></h2>
          ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
          ${item.author ? `<div class="product-author">${esc(item.author)}</div>` : ""}
          ${item.icauth ? `<span class="icauth-badge" style="background-color: #FFD700; color: black; padding: 4px 8px; border-radius: 8px; display: inline-block; width: fit-content; font-size: 11px; font-weight: 600; margin-top: 4px;">${esc(item.icauth)}</span>` : ""}
          ${item.description ? `<div class="product-description">${esc(item.description)}</div>` : ""}
          <div class="product-details-row">
            <div class="product-meta">
              ${item.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(item.imprint)}</div>` : ""}
              ${item.imidis ? `<div class="meta-item"><strong>Discount:</strong> ${esc(item.imidis)}</div>` : ""}
              ${item.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(formatDate(item.releaseDate))}</div>` : ""}
              ${item.binding ? `<div class="meta-item"><strong>Binding:</strong> ${esc(item.binding)}</div>` : ""}
              ${item.pages ? `<div class="meta-item"><strong>Pages:</strong> ${esc(item.pages)} pages</div>` : ""}
              ${item.dimensions ? `<div class="meta-item"><strong>Dimensions:</strong> ${esc(item.dimensions)}</div>` : ""}
            ${item.icillus ? `<div class=\"meta-item\"><strong>ICILLUS:</strong> ${esc(item.icillus)}</div>` : ""}
            ${item.sku ? `<div class=\"meta-item\"><strong>ISBN:</strong> ${esc(item.sku)}</div>` : ""}
              ${item.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(item.illustrations)}</div>` : ""}
            </div>
            <div class="barcode-right">${barcodeHtml}</div>
          </div>
          ${item.price ? `<div class="product-price">AUD$ ${esc(item.price)}</div>` : ""}
        </div>
      </div>
      
      ${item.additionalImages && item.additionalImages.length > 0 ? `
        <div class="internals-section-full">
          <div class="internals-title">Internals:</div>
          <div class="internals-thumbnails-full">
            ${item.additionalImages.slice(0, 4).map((img, idx) => 
              `<img src="${esc(img)}" alt="Internal ${idx + 1}" class="internal-thumbnail-full">`
            ).join('')}
          </div>
        </div>
      ` : ""}
    </div>
  `;
};

export const renderProductCard3Up = (item: Item, globalIndex: number, options: RenderOptions): string => {
  const plainDescription = item.description ? htmlToPlainText(item.description) : '';
  const truncatedDesc = plainDescription.length > 1400 ? plainDescription.substring(0, 1397) + '...' : plainDescription;
  const barcodeHtml = generateBarcodeHtml(item, globalIndex, options);
  
  return `
    <div class="product-card layout-3-row">
      <div class="product-image-3up">
        <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
      </div>
      <div class="product-content-3up">
        <h2 class="product-title"><a href="${generateProductUrl(item.handle, options.hyperlinkToggle, options.utmParams)}" target="_blank" rel="noopener noreferrer" style="color: #000; text-decoration: none;">${esc(item.title)}</a></h2>
        ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
        ${item.author ? `<div class="product-author" style="display: inline-block; margin-right: 8px;">${esc(formatAuthor(item.author))}</div>` : ""}
        ${item.icauth ? `<span class="icauth-badge" style="background-color: #FFD700; color: black; padding: 4px 8px; border-radius: 8px; display: inline-block; width: fit-content; font-size: 12px; font-weight: 600;">${esc(item.icauth)}</span>` : ""}
        ${truncatedDesc ? `<div class="product-description-3up">${esc(truncatedDesc)}</div>` : ""}
      </div>
      <div class="product-details-3up">
        ${item.imprint ? `<div class="detail-value">${esc(item.imprint)}</div>` : ""}
        ${item.imidis ? `<div class="detail-value">Discount: ${esc(item.imidis)}</div>` : ""}
        ${item.binding ? `<div class="detail-value">${esc(item.binding)}</div>` : ""}
        ${item.pages ? `<div class="detail-value">${esc(item.pages)} Pages</div>` : ""}
        ${item.dimensions ? `<div class="detail-value">${esc(item.dimensions)}</div>` : ""}
        ${item.releaseDate ? `<div class="detail-value">${esc(formatDate(item.releaseDate))}</div>` : ""}
        ${item.sku ? `<div class="detail-value">ISBN: ${esc(item.sku)}</div>` : ""}
        ${item.price ? `<div class="detail-value">AUD$ ${esc(item.price)}</div>` : ""}
        ${barcodeHtml}
      </div>
    </div>
  `;
};

export const renderProductCardStandard = (item: Item, globalIndex: number, options: RenderOptions): string => {
  const truncatedDesc = item.description ? (item.description.length > 1000 ? item.description.substring(0, 997) + '...' : item.description) : '';
  const barcodeHtml = generateBarcodeHtml(item, globalIndex, options);
  
  return `
    <div class="product-card">
      <div class="product-image">
        <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
      </div>
      <div class="product-details">
        <h2 class="product-title"><a href="${generateProductUrl(item.handle, options.hyperlinkToggle, options.utmParams)}" target="_blank" rel="noopener noreferrer" style="color: #000; text-decoration: none;">${esc(item.title)}</a></h2>
        ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
        ${item.author ? `<div class="product-author">${esc(formatAuthor(item.author))}</div>` : ""}
        ${truncatedDesc ? `<div class="product-description">${esc(truncatedDesc)}</div>` : ""}
        <div class="product-specs">
          ${item.binding ? `<span class="spec-item">${esc(item.binding)}</span>` : ""}
          ${item.pages ? `<span class="spec-item">${esc(item.pages)} pages</span>` : ""}
          ${item.dimensions ? `<span class="spec-item">${esc(item.dimensions)}</span>` : ""}
          ${item.icauth ? `<span class="spec-item icauth-badge" style="background-color: #FFD700; color: black; padding: 2px 6px; border-radius: 8px; font-weight: 600;">${esc(item.icauth)}</span>` : ""}
        </div>
        <div class="product-meta">
          ${item.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(item.imprint)}</div>` : ""}
          ${item.imidis ? `<div class="meta-item"><strong>Discount:</strong> ${esc(item.imidis)}</div>` : ""}
          ${item.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(formatDate(item.releaseDate))}</div>` : ""}
          ${item.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(item.illustrations)}</div>` : ""}
        </div>
        ${item.price ? `<div class="product-price">AUD$ ${esc(item.price)}</div>` : ""}
        ${barcodeHtml}
      </div>
    </div>
  `;
};

export const renderProductCard2Up = (item: Item, globalIndex: number, options: RenderOptions): string => {
  const truncatedDesc = item.description ? (item.description.length > 1600 ? item.description.substring(0, 1597) + '...' : item.description) : '';
  const barcodeHtml = generateBarcodeHtml(item, globalIndex, options);
  
  return `
    <div class="product-card layout-2-vertical">
      <div class="product-image-2up">
        <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover-2up">
      </div>
      <div class="product-content-2up">
        <h2 class="product-title"><a href="${generateProductUrl(item.handle, options.hyperlinkToggle, options.utmParams)}" target="_blank" rel="noopener noreferrer" style="color: #000; text-decoration: none;">${esc(item.title)}</a></h2>
        ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
        ${item.author ? `<div class="product-author">${esc(formatAuthor(item.author))}</div>` : ""}
        ${truncatedDesc ? `<div class="product-description">${esc(truncatedDesc)}</div>` : ""}
        <div class="product-specs">
          ${item.binding ? `<span class="spec-item">${esc(item.binding)}</span>` : ""}
          ${item.pages ? `<span class="spec-item">${esc(item.pages)} pages</span>` : ""}
          ${item.dimensions ? `<span class="spec-item">${esc(item.dimensions)}</span>` : ""}
          ${item.icauth ? `<span class="spec-item icauth-badge" style="background-color: #FFD700; color: black; padding: 2px 6px; border-radius: 8px; font-weight: 600;">${esc(item.icauth)}</span>` : ""}
        </div>
        <div class="product-meta">
          ${item.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(item.imprint)}</div>` : ""}
          ${item.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(formatDate(item.releaseDate))}</div>` : ""}
          ${item.imidis ? `<div class="meta-item"><strong>Discount:</strong> ${esc(item.imidis)}</div>` : ""}
          ${item.sku ? `<div class=\"meta-item\"><strong>ISBN:</strong> ${esc(item.sku)}</div>` : ""}
          ${item.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(item.illustrations)}</div>` : ""}
          ${item.icillus ? `<div class="meta-item"><strong>ICILLUS:</strong> ${esc(item.icillus)}</div>` : ""}
        </div>
        ${item.price ? `<div class="product-price">AUD$ ${esc(item.price)}</div>` : ""}
        ${barcodeHtml}
      </div>
    </div>
  `;
};

export const renderProductCard4Up = (item: Item, globalIndex: number, options: RenderOptions): string => {
  const truncatedDesc = item.description ? (item.description.length > 850 ? item.description.substring(0, 847) + '...' : item.description) : '';
  const barcodeHtml = generateBarcodeHtml(item, globalIndex, options);
  
  return `
    <div class="product-card layout-4-special">
      <div class="top-section">
        <div class="product-image-4up">
          <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover-4up">
        </div>
        <div class="title-section">
          <h2 class="product-title-4up"><a href="${generateProductUrl(item.handle, options.hyperlinkToggle, options.utmParams)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a></h2>
          ${item.subtitle ? `<div class="product-subtitle-4up">${esc(item.subtitle)}</div>` : ""}
          ${item.author ? `<div class="product-author-4up">${esc(formatAuthor(item.author))}</div>` : ""}
          ${item.icauth ? `<span class="icauth-badge" style="background-color: #FFD700; color: black; padding: 4px 8px; border-radius: 8px; display: inline-block; width: fit-content; font-size: 11px; font-weight: 600; margin-top: 4px;">${esc(item.icauth)}</span>` : ""}
        </div>
      </div>
      <div class="description-section">
        ${truncatedDesc ? `<div class="product-description-4up">${esc(truncatedDesc)}</div>` : ""}
      </div>
      <div class="bottom-section">
        <div class="product-details-left">
          <div class="product-specs-4up">
            ${item.binding ? `<span class="spec-item-4up">${esc(item.binding)}</span>` : ""}
            ${item.pages ? `<span class="spec-item-4up">${esc(item.pages)} pages</span>` : ""}
            ${item.dimensions ? `<span class="spec-item-4up">${esc(item.dimensions)}</span>` : ""}
          </div>
          <div class="product-meta-4up">
            ${item.imprint ? `<div class="meta-item-4up"><strong>Publisher:</strong> ${esc(item.imprint)}</div>` : ""}
            ${item.releaseDate ? `<div class="meta-item-4up"><strong>Release Date:</strong> ${esc(formatDate(item.releaseDate))}</div>` : ""}
            ${item.price ? `<div class="meta-item-4up"><strong>Price:</strong> AUD$ ${esc(item.price)}</div>` : ""}
          ${item.imidis ? `<div class=\"meta-item-4up\"><strong>Discount:</strong> ${esc(item.imidis)}</div>` : ""}
          </div>
        </div>
        <div class="barcode-section-right">
          ${barcodeHtml}
        </div>
      </div>
    </div>
  `;
};

export const renderProductCard2Int = (item: Item, globalIndex: number, options: RenderOptions): string => {
  const truncatedDesc = item.description ? (item.description.length > 1400 ? item.description.substring(0, 1397) + '...' : item.description) : '';
  const barcodeHtml = generateBarcodeHtml(item, globalIndex, options);
  
  return `
    <div class="product-card layout-2-vertical">
      <div class="product-image-2up">
        <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover-2up">
      </div>
      <div class="product-content-2up">
        <h2 class="product-title"><a href="${generateProductUrl(item.handle, options.hyperlinkToggle, options.utmParams)}" target="_blank" rel="noopener noreferrer" style="color: #000; text-decoration: none;">${esc(item.title)}</a></h2>
        ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
        ${item.author ? `<div class="product-author">${esc(formatAuthor(item.author))}</div>` : ""}
        ${truncatedDesc ? `<div class="product-description">${esc(truncatedDesc)}</div>` : ""}
        <div class="product-specs">
          ${item.binding ? `<span class="spec-item">${esc(item.binding)}</span>` : ""}
          ${item.pages ? `<span class="spec-item">${esc(item.pages)} pages</span>` : ""}
          ${item.dimensions ? `<span class="spec-item">${esc(item.dimensions)}</span>` : ""}
          ${item.icauth ? `<span class="spec-item icauth-badge" style="background-color: #FFD700; color: black; padding: 2px 6px; border-radius: 8px; font-weight: 600;">${esc(item.icauth)}</span>` : ""}
        </div>
        <div class="product-meta">
          ${item.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(item.imprint)}</div>` : ""}
          ${item.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(formatDate(item.releaseDate))}</div>` : ""}
          ${item.imidis ? `<div class="meta-item"><strong>Discount:</strong> ${esc(item.imidis)}</div>` : ""}
          ${item.sku ? `<div class=\"meta-item\"><strong>ISBN:</strong> ${esc(item.sku)}</div>` : ""}
          ${item.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(item.illustrations)}</div>` : ""}
          ${item.icillus ? `<div class="meta-item"><strong>ICILLUS:</strong> ${esc(item.icillus)}</div>` : ""}
        </div>
        ${item.price ? `<div class="product-price">AUD$ ${esc(item.price)}</div>` : ""}
        ${item.additionalImages && item.additionalImages.length > 0 ? `
          <div class="internal-image-section">
            ${item.additionalImages.slice(0, 2).map((img, idx) => 
              `<img src="${esc(img)}" alt="Internal preview ${idx + 1}" class="internal-preview-image">`
            ).join('')}
          </div>
        ` : ""}
        ${barcodeHtml}
      </div>
    </div>
  `;
};

export const renderProductCard = (item: Item, layout: 1 | 2 | '2-int' | 3 | 4 | 8, globalIndex: number, options: RenderOptions): string => {
  switch (layout) {
    case 1:
      return renderProductCard1Up(item, globalIndex, options);
    case 2:
      return renderProductCard2Up(item, globalIndex, options);
    case '2-int':
      return renderProductCard2Int(item, globalIndex, options);
    case 3:
      return renderProductCard3Up(item, globalIndex, options);
    case 4:
      return renderProductCard4Up(item, globalIndex, options);
    default:
      return renderProductCardStandard(item, globalIndex, options);
  }
};
