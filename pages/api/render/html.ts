import type { NextApiRequest, NextApiResponse } from "next";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

const SITE = process.env.SITE_BASE_URL || "https://b27202-c3.myshopify.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layout = 4, showFields } = req.body as {
      items: Item[]; layout: 1 | 2 | 4 | 8; showFields?: Record<string, boolean>;
    };
    if (!items?.length) throw new Error("No items provided");
    const html = renderHtml(items, layout, showFields || {});
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

function renderHtml(items: Item[], layout: 1 | 2 | 4 | 8, show: Record<string, boolean>) {
  const cols = layout === 1 ? "1fr" : layout === 2 ? "1fr 1fr" : layout === 4 ? "1fr 1fr" : "1fr 1fr 1fr 1fr";
  const perPage = layout;

  const chunks: Item[][] = [];
  for (let i = 0; i < items.length; i += perPage) chunks.push(items.slice(i, i + perPage));

  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const pagesHtml = chunks.map(page => {
    const cards = page.map(it => {
      const lineParts: string[] = [];
      if (it.binding) lineParts.push(esc(it.binding));
      if (it.pages) lineParts.push(esc(`${it.pages} pages`));
      if (it.dimensions) lineParts.push(esc(it.dimensions));
      if (it.edition) lineParts.push(esc(`Edition: ${it.edition}`));
      const line = lineParts.join(" • ");

      return [
        '<div class="card">',
          `<img class="thumb" src="${esc(it.imageUrl)}" alt="${esc(it.title)}">`,
          '<div class="content">',
            `<h3 class="title">${esc(it.title)}</h3>`,
            it.subtitle ? `<div class="subtitle">${esc(it.subtitle)}</div>` : "",
            it.author ? `<div class="author">👤 ${esc(it.author)}</div>` : "",
            it.description ? `<div class="description">${esc(it.description)}</div>` : "",
            `<div class="details">${line}</div>`,
            it.imprint ? `<div class="meta">🏢 Imprint: ${esc(it.imprint)}</div>` : "",
            it.releaseDate ? `<div class="meta">📅 Release: ${esc(it.releaseDate)}</div>` : "",
            it.weight ? `<div class="meta">⚖️ Weight: ${esc(it.weight)}</div>` : "",
            it.illustrations ? `<div class="meta">🎨 Illustrations: ${esc(it.illustrations)}</div>` : "",
            it.price ? `<div class="price">💰 AUD$ ${esc(it.price)}</div>` : "",
            `<div class="url">${esc(`${SITE}/products/${it.handle}`)}</div>`,
            show.authorBio && it.authorBio ? `<div class="author-bio">${esc(it.authorBio)}</div>` : "",
          '</div>',
        '</div>',
      ].join("");
    }).join("");

    return `<div class="page">${cards}</div>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Professional Product Catalogue</title>
<style>
  @page { 
    size: A4; 
    margin: 20mm; 
  }
  * { 
    box-sizing: border-box; 
  }
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
    color: #2C3E50;
    line-height: 1.6;
    background: #F8F9FA;
  }
  h1, h2, h3, p { 
    margin: 0; 
  }
  .muted { 
    color: #6C757D; 
  }
  .noprint { 
    margin-bottom: 20px; 
    text-align: center;
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .noprint button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    margin-right: 16px;
  }
  .page { 
    display: grid; 
    grid-template-columns: ${cols}; 
    gap: 24px; 
    page-break-after: always; 
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
  .card { 
    border: 2px solid #E9ECEF; 
    border-radius: 16px; 
    padding: 20px; 
    display: grid; 
    grid-template-columns: 120px 1fr; 
    gap: 16px;
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    transition: all 0.2s ease;
  }
  .thumb { 
    width: 120px; 
    height: 180px; 
    object-fit: cover; 
    border-radius: 12px; 
    background: #F8F9FA;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .title { 
    font-weight: 700; 
    font-size: 18px;
    line-height: 1.3; 
    margin: 0 0 8px 0;
    color: #2C3E50;
  }
  .subtitle { 
    font-size: 14px; 
    color: #7F8C8D; 
    margin: 0 0 8px 0;
    font-style: italic;
  }
  .author {
    font-size: 13px; 
    color: #667eea;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  .description {
    font-size: 13px;
    color: #495057;
    line-height: 1.5;
    margin: 0 0 8px 0;
    background: #F8F9FA;
    padding: 8px 12px;
    border-radius: 8px;
    border-left: 4px solid #667eea;
  }
  .details { 
    font-size: 12px; 
    color: #6C757D; 
    margin: 0 0 8px 0;
    line-height: 1.4;
  }
  .meta { 
    font-size: 12px; 
    color: #6C757D; 
    margin: 2px 0; 
  }
  .price { 
    font-weight: 700; 
    font-size: 16px;
    color: #E74C3C;
    margin: 8px 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .url { 
    margin-top: auto;
    font-size: 11px; 
    color: #ADB5BD; 
    word-break: break-all;
    font-family: monospace;
  }
  .author-bio {
    font-size: 12px;
    color: #495057;
    margin-top: 8px;
    padding: 8px 12px;
    background: #F8F9FA;
    border-radius: 8px;
    font-style: italic;
  }
  @media print { 
    .noprint { 
      display: none !important; 
    }
    .page {
      box-shadow: none;
      border: 1px solid #E9ECEF;
    }
    .card {
      box-shadow: none;
      border: 1px solid #E9ECEF;
    }
  }
</style>
</head>
<body>
  <div class="noprint">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    <span class="muted">Use A4 paper, 20mm margins, hide headers/footers for best results.</span>
  </div>
  ${pagesHtml}
</body>
</html>`;
}
