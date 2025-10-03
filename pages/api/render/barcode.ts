import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode-generator";

type Item = {
  title: string; subtitle?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

const SITE = process.env.SITE_BASE_URL || "https://b27202-c3.myshopify.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layout = 4, includeBarcodes = true, utmParams } = req.body as {
      items: Item[];
      layout: 1 | 2 | 4 | 8;
      includeBarcodes?: boolean;
      utmParams?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmContent?: string;
        utmTerm?: string;
      };
    };
    
    if (!items?.length) throw new Error("No items provided");

    const cols = layout === 1 ? "1fr" : layout === 2 ? "1fr 1fr" : layout === 4 ? "1fr 1fr" : "1fr 1fr 1fr 1fr";
    const perPage = layout;

    const chunks: Item[][] = [];
    for (let i = 0; i < items.length; i += perPage) chunks.push(items.slice(i, i + perPage));

    const esc = (s?: string) =>
      (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

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

    const generateProductUrl = (handle: string): string => {
      const baseUrl = `${SITE}/products/${handle}`;
      
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

    const pagesHtml = chunks.map(page => {
      const cards = page.map(it => {
        const lineParts: string[] = [];
        if (it.binding) lineParts.push(esc(it.binding));
        if (it.pages) lineParts.push(esc(`${it.pages} pages`));
        if (it.dimensions) lineParts.push(esc(it.dimensions));
        if (it.edition) lineParts.push(esc(`Edition: ${it.edition}`));
        const line = lineParts.join(" • ");

        const productUrl = generateProductUrl(it.handle);
        const qrCodeDataUrl = includeBarcodes ? generateQRCode(productUrl) : '';

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
              includeBarcodes && qrCodeDataUrl ? `<div class="barcode"><img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code"></div>` : "",
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
  @page { size: A4; margin: 14mm; }
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
