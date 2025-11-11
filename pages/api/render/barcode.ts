import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode-generator";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";

type Item = {
  title: string; subtitle?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  sku?: string; icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
  footerNote?: string;
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Barcode API called with:', JSON.stringify(req.body, null, 2));
    const { items, layout = 4, includeBarcodes = true, barcodeType = "QR Code", itemBarcodeTypes = {}, discountCode, utmParams, hyperlinkToggle } = req.body as {
      items: Item[];
      layout: 1 | 2 | '2-int' | 3 | 4 | 8;
      includeBarcodes?: boolean;
      barcodeType?: "EAN-13" | "QR Code" | "None";
      itemBarcodeTypes?: {[key: number]: "EAN-13" | "QR Code" | "None"};
      discountCode?: string;
      hyperlinkToggle?: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
      utmParams?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmContent?: string;
        utmTerm?: string;
      };
    };
    
    if (!items?.length) throw new Error("No items provided");

    const cols = layout === 1 ? "1fr" : layout === 2 || layout === '2-int' ? "1fr 1fr" : layout === 3 ? "1fr 1fr 1fr" : layout === 4 ? "1fr 1fr" : "1fr 1fr 1fr 1fr";
    const perPage = layout === '2-int' ? 2 : layout;

    const chunks: Item[][] = [];
    for (let i = 0; i < items.length; i += perPage) chunks.push(items.slice(i, i + perPage));

    const esc = (s?: string) =>
      (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    const generateQRCode = (text: string) => {
      try {
        console.log('Generating QR code for:', text);
        const qr = QRCode(0, 'M');
        qr.addData(text);
        qr.make();
        const dataUrl = qr.createDataURL(4, 0);
        console.log('QR code generated successfully, length:', dataUrl.length);
        return dataUrl;
      } catch (error) {
        console.error('QR Code generation error:', error);
        return '';
      }
    };

    const generateEAN13Barcode = (ean13Code: string) => {
      try {
        console.log('Generating EAN-13 barcode for:', ean13Code);
        
        // Validate EAN-13 code (must be exactly 13 digits)
        if (!/^\d{13}$/.test(ean13Code)) {
          console.error('Invalid EAN-13 code:', ean13Code, '- must be exactly 13 digits');
          return '';
        }
        
        // Create a canvas element
        const canvas = createCanvas(200, 80);
        
        // Generate the barcode
        JsBarcode(canvas, ean13Code, {
          format: "EAN13",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 12,
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2
        });
        
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/png');
        console.log('EAN-13 barcode generated successfully, length:', dataUrl.length);
        return dataUrl;
      } catch (error) {
        console.error('EAN-13 barcode generation error:', error);
        // Fallback: generate a simple QR code instead
        console.log('Falling back to QR code generation');
        return generateQRCode(`ISBN: ${ean13Code}`);
      }
    };

    const generateProductUrl = (handle: string): string => {
      // Use the hyperlinkToggle to determine the base URL
      const baseUrls = {
        woodslane: 'https://woodslane.com.au',
        woodslanehealth: 'https://www.woodslanehealth.com.au',
        woodslaneeducation: 'https://www.woodslaneeducation.com.au',
        woodslanepress: 'https://www.woodslanepress.com.au'
      };
      
      const baseUrl = `${baseUrls[hyperlinkToggle || 'woodslane']}/products/${handle}`;
      
      // Add discount code and UTM parameters if any are provided
      const urlParams = new URLSearchParams();
      
      // Add discount code first
      if (discountCode) {
        urlParams.set('discount', discountCode);
      }
      
      // Add UTM parameters
      if (utmParams) {
        if (utmParams.utmSource) urlParams.set('utm_source', utmParams.utmSource);
        if (utmParams.utmMedium) urlParams.set('utm_medium', utmParams.utmMedium);
        if (utmParams.utmCampaign) urlParams.set('utm_campaign', utmParams.utmCampaign);
        if (utmParams.utmContent) urlParams.set('utm_content', utmParams.utmContent);
        if (utmParams.utmTerm) urlParams.set('utm_term', utmParams.utmTerm);
      }
      
      return urlParams.toString() ? `${baseUrl}?${urlParams.toString()}` : baseUrl;
    };

    const pagesHtml = chunks.map((page, chunkIndex) => {
      const cards = page.map((it, itemIndex) => {
        const lineParts: string[] = [];
        if (it.binding) lineParts.push(esc(it.binding));
        if (it.pages) lineParts.push(esc(`${it.pages} pages`));
        if (it.dimensions) lineParts.push(esc(it.dimensions));
        if (it.edition) lineParts.push(esc(`Edition: ${it.edition}`));
        const line = lineParts.join(" • ");

        const productUrl = generateProductUrl(it.handle);
        const globalItemIndex = chunkIndex * perPage + itemIndex;
        
        // Use individual item barcode type if set, otherwise fall back to global barcode type
        const itemBarcodeType = itemBarcodeTypes[globalItemIndex] || barcodeType;
        const shouldShowBarcode = includeBarcodes && itemBarcodeType !== "None";
        
        let barcodeDataUrl = '';
        let barcodeHtml = '';
        
        if (shouldShowBarcode) {
          if (itemBarcodeType === "EAN-13") {
            // For EAN-13, we need an actual EAN-13 code. Let's use the product SKU or generate one
            // In a real scenario, you'd want to use the actual ISBN/EAN-13 from your product data
            let ean13Code = it.sku || it.handle.replace(/[^0-9]/g, '').padStart(13, '0').substring(0, 13);
            
            // Ensure we have a valid 13-digit EAN-13 code
            if (ean13Code.length < 13) {
              ean13Code = ean13Code.padStart(13, '0');
            } else if (ean13Code.length > 13) {
              ean13Code = ean13Code.substring(0, 13);
            }
            
            console.log(`Generating EAN-13 for item ${globalItemIndex}: ${ean13Code}`);
            barcodeDataUrl = generateEAN13Barcode(ean13Code);
            barcodeHtml = barcodeDataUrl ? `<div class="barcode"><img src="${barcodeDataUrl}" alt="EAN-13 Barcode" class="ean13-barcode"></div>` : '';
          } else if (itemBarcodeType === "QR Code") {
            barcodeDataUrl = generateQRCode(productUrl);
            barcodeHtml = barcodeDataUrl ? `<div class="barcode"><img src="${barcodeDataUrl}" alt="QR Code" class="qr-code"></div>` : '';
          }
        }
        
        // Debug logging
        console.log(`Item ${globalItemIndex}: shouldShowBarcode=${shouldShowBarcode}, itemBarcodeType=${itemBarcodeType}, globalBarcodeType=${barcodeType}, includeBarcodes=${includeBarcodes}`);

        return [
          '<div class="card">',
            `<img class="thumb" src="${esc(it.imageUrl)}" alt="${esc(it.title)}">`,
            "<div>",
              `<h3 class="title"><a href="${esc(productUrl)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(it.title)}</a></h3>`,
              it.subtitle ? `<div class="subtitle">${esc(it.subtitle)}</div>` : "",
              it.author ? `<div class="meta">By ${esc(it.author)}</div>` : "",
              `<div class="meta">${line}</div>`,
              it.imprint ? `<div class="meta">Imprint: ${esc(it.imprint)}</div>` : "",
              it.releaseDate ? `<div class="meta">Release: ${esc(it.releaseDate)}</div>` : "",
              it.weight ? `<div class="meta">Weight: ${esc(it.weight)}</div>` : "",
              it.illustrations ? `<div class="meta">Illustrations: ${esc(it.illustrations)}</div>` : "",
              it.price ? `<div class="price">AUD$ ${esc(it.price)}</div>` : "",
              barcodeHtml,
            "</div>",
          "</div>",
        ].join("");
      }).join("");

      return `<div class="page">${cards}</div>`;
    }).join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Catalogue with Barcodes (HTML)</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#192C6B; }
  h1,h2,h3,p { margin:0; }
  .muted { color:#656F91; }
  .noprint { margin-bottom: 10px; }
  .page { display:grid; grid-template-columns:${cols}; gap:16px; page-break-after: always; }
  .card { border:1px solid #e7eef3; border-radius:10px; padding:12px; display:grid; grid-template-columns:95px 1fr; gap:12px; }
  .thumb { width:95px; height:140px; object-fit:cover; border-radius:6px; background:#F1F6F7; }
  .title { font-weight:700; line-height:1.2; margin:0 0 2px; }
  .subtitle { font-size:12px; color:#656F91; margin:0 0 6px; }
  .meta { font-size:12px; color:#656F91; margin:2px 0; }
  .price { font-weight:600; margin-top:6px; }
  .url { margin-top:6px; font-size:11px; color:#656F91; word-break: break-all; }
  .barcode { margin-top:8px; text-align:center; }
  .qr-code { width:60px; height:60px; }
  .ean13-barcode { width:120px; height:80px; }
  @media print { .noprint { display:none !important; } }
</style>
</head>
<body>
  <div class="noprint">
    <button onclick="window.print()">Print / Save as PDF</button>
    <span class="muted">Use A4, ~14mm margins, hide headers/footers.</span>
  </div>
  ${pagesHtml}
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to render HTML with barcodes";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}
